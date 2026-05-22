// Camada 2 da extracao: LLM normaliza causa-raiz em taxonomia fixa e extrai
// medicoes e pecas trocadas dos textos longos do PDF.
//
// Roda em cima dos campos ja extraidos pela Camada 1 (regex) — economiza
// tokens em vez de mandar o PDF inteiro. Foco no que regex nao faz bem:
//   1. Mapear "Chiler externo" / "customer chiller - infra" / "chiller predial"
//      para a categoria normalizada `infra_chiller_cliente`.
//   2. Extrair medicoes numericas mencionadas em texto livre
//      (ex: "Pressao 0.98 PSI Nivel he 71,41%" -> {pressurePsi: 0.98, heliumPct: 71.41})
//   3. Listar pecas trocadas / aplicadas (ex: "bateria MRU", "bobina de
//      cabeca").
//
// Custo estimado com gpt-4.1-mini: ~US$ 0,001 por OS. Mil OSs = US$ 1.

import { generateJsonWithLlm, getLlmRuntimeInfo } from '../ai/llmService.js';
import { logLlmUsage } from '../ai/llmUsageLogger.js';
import { AI_CONFIG } from '../ai/config.js';
import {
  buscarLicoesParaFewShot,
  incrementarUsoLicoes,
} from '../ai/categoriaFeedbackService.js';

// v4: + cabo_conector e monitor_console na taxonomia corretiva. Casos de
// mau contato / hardware periferico antes caiam em 'desconhecido' porque
// nenhum subsistema cobria. Sao causa-raiz frequentes em manutencao real.
const LLM_EXTRACTOR_VERSION = 4;

// Taxonomia de causa-raiz — usada quando a OS eh CORRETIVA (problema real).
const TAXONOMIA_CAUSAS_CORRETIVA = [
  'infra_chiller_cliente',  // chiller predial do hospital (problema do cliente, nao do magneto)
  'cryo_compressor',         // compressor do criostato (LCC, helium compressor)
  'magneto_helio',           // nivel/pressao de helio fora de spec
  'bobina',                  // bobinas (corpo, cabeca, etc)
  'gradiente',               // amplificador/sistema de gradiente
  'rf',                      // cadeia RF (transmissor/receptor)
  'mesa_mecanica',           // mesa do paciente (correia, motor, parada)
  'software',                // falha de SW, host, MRU, configuracao
  'rede_dados',              // conectividade, DICOM, fluxo de imagem
  'infra_eletrica',          // energia predial, no-break, aterramento
  'cabo_conector',           // mau contato, cabo solto/oxidado, conector danificado (qualquer subsistema)
  'monitor_console',         // monitor, console do operador, perifericos fisicos (mouse, teclado, intercom, leitor)
  'desconhecido',            // LLM nao conseguiu categorizar com confianca
];

// Taxonomia de manutencao preventiva — usada quando a OS eh PM (SE02).
// Cada categoria representa um COMPONENTE/PROCEDIMENTO programado, nao
// um modo de falha. Universal entre tenants — sao todos componentes
// padronizados de equipamentos GE Healthcare.
const TAXONOMIA_CAUSAS_PM = [
  'pm_adsorber',           // troca de adsorber (tipico a cada 30.000h)
  'pm_coldhead',           // coldhead / cabeca fria (tipico 32-50k h)
  'pm_chiller_periodica',  // PM do chiller (limpeza, filtros, fluido)
  'pm_compressor',         // PM do compressor de helio / cryo
  'pm_calibracao_coil',    // calibracao/tune de bobinas
  'pm_calibracao_geral',   // shimming, tuning, calibracao do magneto
  'pm_inspecao_visual',    // inspecao sem intervencao
  'pm_filtro',             // troca de filtros (agua, ar, oleo)
  'pm_bateria',            // troca de bateria (MRU, UPS, etc)
  'pm_software_update',    // atualizacao programada de firmware/software
  'pm_limpeza_lubrif',     // limpeza e lubrificacao programadas
  'pm_generica',           // PM identificada por serviceTypeCode mas sem componente claro
];

// Uniao para validacao — qualquer das duas taxonomias eh valida.
const TAXONOMIA_CAUSAS = [
  ...TAXONOMIA_CAUSAS_CORRETIVA,
  ...TAXONOMIA_CAUSAS_PM,
];

// Catalogo de solucoes aplicadas — base de aprendizado cross-tenant.
// Conjunto fechado, evolui via versionamento. Whitelist do ADR-018.
const TAXONOMIA_SOLUCOES = [
  'troca_peca',              // troca/substituicao de peca (peca especifica em partsReplaced)
  'recalibracao',            // recalibracao, shimming, ajuste de parametros
  'limpeza_manutencao',      // limpeza, manutencao mecanica, lubrificacao
  'firmware',                // atualizacao de firmware/software, patch
  'reset_reboot',            // reset, reinicializacao, power cycle
  'cabo_conexao',            // reparo de cabo, conector, solda
  'reposicao_consumivel',    // reabastecimento (helio, oleo, contraste, agua)
  'escalacao_fabricante',    // acionamento do fabricante / contrato GE
  'substituicao_total',      // substituicao integral do subsistema/equipamento
  'treinamento_operador',    // nao era falha de equipamento — orientacao
  'sem_acao',                // observacao apenas, sem intervencao
  'desconhecido',            // LLM nao conseguiu classificar a solucao
];

// Formata as licoes cross-tenant como bloco de few-shot examples para o
// prompt. Vazio se nao houver licoes — o prompt segue sem essa secao.
function formatarFewShot(licoes) {
  if (!licoes?.length) return '';
  const exemplos = licoes
    .map((l, idx) => `Exemplo ${idx + 1}:\n  Texto: ${l.textoDespersonalizado}\n  Categoria correta: ${l.categoriaCorreta}`)
    .join('\n\n');
  return `\n\nExemplos de correcoes anteriores (de admins humanos em casos similares — use como referencia, NAO copie literalmente):\n${exemplos}\n`;
}

function montarPrompt({ rootCauseRaw, problemAnalyzed, actionsTaken, testsPerformed, serviceTypeCode, fewShotBlock = '' }) {
  // SE02 = manutencao preventiva. As outras (SE03, SE05) sao corretivas/
  // emergenciais. O tipo determina QUAL taxonomia o LLM deve usar.
  const ehPm = serviceTypeCode === 'SE02';
  const taxonomiaAlvo = ehPm ? TAXONOMIA_CAUSAS_PM : TAXONOMIA_CAUSAS_CORRETIVA;

  const contextoTipo = ehPm
    ? 'Esta eh uma MANUTENCAO PREVENTIVA programada (GE serviceTypeCode=SE02). NAO existe modo de falha — a OS descreve uma intervencao programada por horas de uso. Classifique pelo COMPONENTE serviceado/trocado, nao por causa-raiz de falha.'
    : `Esta eh uma OS CORRETIVA (GE serviceTypeCode=${serviceTypeCode || 'desconhecido'}). Classifique pelo modo de falha / causa-raiz do problema.`;

  const heuristicas = ehPm
    ? `Heuristicas PARA PM (componente serviceado):
- "adsorber" trocado / "adsorber replacement": pm_adsorber
- "coldhead" / "cold head" trocado / inspecionado: pm_coldhead
- "chiller" PM / limpeza / filtro do chiller: pm_chiller_periodica
- "compressor" PM / troca de compressor de helio: pm_compressor
- "bobina" / "coil" calibrada / tunada / inspecionada: pm_calibracao_coil
- "shimming", "tuning", "calibracao do magneto", "boresight": pm_calibracao_geral
- "filtro" trocado (agua, ar, oleo): pm_filtro
- "bateria", "MRU battery", "UPS battery" trocada: pm_bateria
- "firmware update", "patch", "atualizacao de software": pm_software_update
- "limpeza", "lubrificacao", "cleaning": pm_limpeza_lubrif
- so "testes ok" / "liberado para uso" sem componente claro: pm_generica
- "inspecao visual" sem intervencao: pm_inspecao_visual`
    : `Heuristicas PARA CORRETIVA (causa-raiz — escolha pela CAUSA, nao pelo efeito):
- "chiller" ou "chiller externo" ou "chiller predial" + cliente: infra_chiller_cliente
- "compressor off" + cryo/criogenia: cryo_compressor
- "nivel de helio" ou "quench" sem causa externa: magneto_helio
- "mesa", "correia", "ruido ao deslocar": mesa_mecanica
- "bobina" (cabeca, corpo, joelho) — sem cabo solto: bobina
- "gradiente", "GP/AGI", "amplificador de gradiente": gradiente
- "rede", "DICOM", "fluxo de imagens": rede_dados
- "software", "host", "MRU", "OS GE", "boot": software
- "no-break", "queda de energia", "aterramento", "ups": infra_eletrica
- "mau contato", "cabo solto", "conector oxidado/danificado", "reconectar", "loose cable", "cabo do monitor": cabo_conector
  (PREFERIR este sobre o subsistema afetado quando a causa for explicitamente cabling/conector)
- "monitor", "tela", "display", "console" + falha/preta/sem video (e nao for cabo): monitor_console
- "teclado", "mouse", "intercom", "leitor de cartao" defeituosos: monitor_console`;

  return `Voce e um especialista em manutencao de equipamentos de Ressonancia Magnetica GE Healthcare.
Analise o relato de uma OS abaixo e responda APENAS com um JSON valido na estrutura especificada.

CONTEXTO IMPORTANTE: ${contextoTipo}

Texto da OS:
- Causa do problema (raw): ${rootCauseRaw || '(vazio)'}
- Problema analisado: ${(problemAnalyzed || '').slice(0, 1500)}
- Acoes tomadas: ${(actionsTaken || '').slice(0, 1500)}
- Testes realizados: ${(testsPerformed || '').slice(0, 800)}${fewShotBlock}

Responda apenas com este JSON, sem markdown, sem comentarios:
{
  "rootCauseCategory": "uma das: ${taxonomiaAlvo.join(' | ')}",
  "solucaoAplicada": "uma das: ${TAXONOMIA_SOLUCOES.join(' | ')}",
  "confianca": 0.0,
  "raciocinio": "uma frase curta explicando a categorizacao e a solucao",
  "measurements": {
    "heliumPct":     null,
    "heliumPressurePsi": null,
    "shieldKelvin":  null,
    "coolantTempC":  null,
    "outras": {}
  },
  "partsReplaced": []
}

Regras:
- rootCauseCategory: escolha SEMPRE um da lista acima (taxonomia ${ehPm ? 'PM' : 'corretiva'}). Use '${ehPm ? 'pm_generica' : 'desconhecido'}' se confianca < 0.5.
- solucaoAplicada: classifique a INTERVENCAO descrita em actionsTaken. Use 'desconhecido' se nao houver indicacao clara, 'sem_acao' se foi so observacao/inspecao sem intervencao.
- confianca: 0 a 1, baseada em quao explicito esta o sintoma no texto.
- measurements: extraia APENAS valores numericos explicitos no texto. Use null para os nao mencionados. "outras" = chave-valor para metricas adicionais que aparecerem (ex: "fluxo_gpm", "tensao_v").
- partsReplaced: liste pecas trocadas ou aplicadas, em portugues (ex: ["bateria MRU", "bobina cabeca"]). Vazio se nada foi trocado. ATENCAO: NUNCA inclua numero de serie, modelo proprietario unico nem nome de pessoas — apenas categoria generica da peca.

${heuristicas}

Heuristicas para a solucao:
- "trocada", "substituida", "replaced" + peca: troca_peca
- "ajustado", "calibrado", "shimming", "tuning": recalibracao
- "limpeza", "manutencao preventiva", "lubrificacao": limpeza_manutencao
- "firmware", "patch", "atualizacao de software": firmware
- "reset", "reboot", "power cycle", "reiniciado": reset_reboot
- "cabo", "conector reparado", "solda": cabo_conexao
- "recarga de helio", "reposicao", "abastecimento": reposicao_consumivel
- "acionado fabricante", "ticket GE", "escalado": escalacao_fabricante
- "operador orientado", "treinamento", "uso indevido": treinamento_operador
- so inspecao/observacao/nao houve falha: sem_acao`;
}

export async function extrairCamposViaLlm({ tenantId, regexCampos, serviceTypeCode = null }) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) {
    return { ok: false, erro: 'llm_indisponivel', llmModel: null };
  }

  const ehPm = serviceTypeCode === 'SE02';

  // Few-shot examples cross-tenant: lições despersonalizadas de correções
  // anteriores (de qualquer tenant). Falha-segura — se a busca quebrar,
  // segue sem few-shot. Limite baixo (5) pra não inflar tokens.
  let licoes = [];
  try {
    licoes = await buscarLicoesParaFewShot({ serviceTypeCode, limite: 5 });
  } catch (err) {
    console.warn(`[LLM_EXTRACTOR] Falha ao buscar licoes few-shot: ${err.message}`);
  }
  const fewShotBlock = formatarFewShot(licoes);

  const prompt = montarPrompt({ ...regexCampos, serviceTypeCode, fewShotBlock });
  const promptLen = prompt.length;

  let resultado;
  try {
    resultado = await generateJsonWithLlm(prompt);
  } catch (err) {
    return { ok: false, erro: `llm_call_failed: ${err.message}`, llmModel: llm.activeModel };
  }

  // Valida categoria — aceita qualquer das duas taxonomias mas garante
  // que o valor pertence ao SUBCONJUNTO certo pro tipo de OS. Se o LLM
  // confundiu (deu causa corretiva pra PM ou vice-versa), cai pro
  // fallback adequado.
  const cat = resultado?.rootCauseCategory;
  const taxonomiaEsperada = ehPm ? TAXONOMIA_CAUSAS_PM : TAXONOMIA_CAUSAS_CORRETIVA;
  if (!cat || !taxonomiaEsperada.includes(cat)) {
    resultado.rootCauseCategory = ehPm ? 'pm_generica' : 'desconhecido';
  }

  // Valida solucao aplicada
  const sol = resultado?.solucaoAplicada;
  if (!sol || !TAXONOMIA_SOLUCOES.includes(sol)) {
    resultado.solucaoAplicada = 'desconhecido';
  }

  // Telemetria de uso (nao bloqueia)
  await logLlmUsage({
    tenantId,
    feature: 'gehc_pdf_extracao',
    provider: AI_CONFIG.provider,
    model: llm.activeModel,
    promptTokens: Math.ceil(promptLen / 4),  // estimativa grosseira
    completionTokens: Math.ceil(JSON.stringify(resultado).length / 4),
  });

  // Contabiliza uso das licoes few-shot (metrica de impacto do feedback
  // supervisionado). Nao bloqueia.
  if (licoes.length) {
    incrementarUsoLicoes(licoes.map((l) => l.id)).catch((err) =>
      console.warn(`[LLM_EXTRACTOR] Falha incrementar uso licoes: ${err.message}`)
    );
  }

  return {
    ok: true,
    llmModel: llm.activeModel,
    extractorVersion: LLM_EXTRACTOR_VERSION,
    dados: {
      rootCauseCategory: resultado.rootCauseCategory,
      solucaoAplicada:   resultado.solucaoAplicada,
      confianca:         resultado.confianca ?? null,
      raciocinio:        resultado.raciocinio ?? null,
      measurements:      resultado.measurements || {},
      partsReplaced:     Array.isArray(resultado.partsReplaced) ? resultado.partsReplaced : [],
    },
  };
}

export const LLM_EXTRACTOR_VERSION_EXPORT = LLM_EXTRACTOR_VERSION;
export const TAXONOMIA_CAUSAS_EXPORT = TAXONOMIA_CAUSAS;
export const TAXONOMIA_CAUSAS_CORRETIVA_EXPORT = TAXONOMIA_CAUSAS_CORRETIVA;
export const TAXONOMIA_CAUSAS_PM_EXPORT = TAXONOMIA_CAUSAS_PM;
export const TAXONOMIA_SOLUCOES_EXPORT = TAXONOMIA_SOLUCOES;
