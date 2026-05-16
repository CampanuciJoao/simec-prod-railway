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

// Bumpamos para 2 ao adicionar solucaoAplicada — o orquestrador reprocessa
// automaticamente extracoes com extractorVersion menor (ver
// gehcPdfExtractionOrchestrator.js). Backlog antigo ganha o campo novo.
const LLM_EXTRACTOR_VERSION = 2;

const TAXONOMIA_CAUSAS = [
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
  'desconhecido',            // LLM nao conseguiu categorizar com confianca
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

function montarPrompt({ rootCauseRaw, problemAnalyzed, actionsTaken, testsPerformed }) {
  return `Voce e um especialista em manutencao de equipamentos de Ressonancia Magnetica GE Healthcare.
Analise o relato de uma OS abaixo e responda APENAS com um JSON valido na estrutura especificada.

Texto da OS:
- Causa do problema (raw): ${rootCauseRaw || '(vazio)'}
- Problema analisado: ${(problemAnalyzed || '').slice(0, 1500)}
- Acoes tomadas: ${(actionsTaken || '').slice(0, 1500)}
- Testes realizados: ${(testsPerformed || '').slice(0, 800)}

Responda apenas com este JSON, sem markdown, sem comentarios:
{
  "rootCauseCategory": "uma das: ${TAXONOMIA_CAUSAS.join(' | ')}",
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
- rootCauseCategory: escolha SEMPRE um da lista. Use 'desconhecido' se confianca < 0.5.
- solucaoAplicada: classifique a INTERVENCAO descrita em actionsTaken. Use 'desconhecido' se nao houver indicacao clara, 'sem_acao' se foi so observacao/inspecao sem intervencao.
- confianca: 0 a 1, baseada em quao explicito esta o sintoma no texto.
- measurements: extraia APENAS valores numericos explicitos no texto. Use null para os nao mencionados. "outras" = chave-valor para metricas adicionais que aparecerem (ex: "fluxo_gpm", "tensao_v").
- partsReplaced: liste pecas trocadas ou aplicadas, em portugues (ex: ["bateria MRU", "bobina cabeca"]). Vazio se nada foi trocado. ATENCAO: NUNCA inclua numero de serie, modelo proprietario unico nem nome de pessoas — apenas categoria generica da peca.

Heuristicas para a categoria:
- "chiller" ou "chiller externo" ou "chiller predial" + cliente: infra_chiller_cliente
- "compressor off" + cryo/criogenia: cryo_compressor
- "nivel de helio" ou "quench" sem causa externa: magneto_helio
- "mesa", "correia", "ruido ao deslocar": mesa_mecanica
- "bobina" (cabeca, corpo, joelho): bobina
- "gradiente", "GP/AGI", "amplificador de gradiente": gradiente
- "rede", "DICOM", "fluxo de imagens": rede_dados
- "software", "host", "MRU", "OS GE", "boot": software

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

export async function extrairCamposViaLlm({ tenantId, regexCampos }) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) {
    return { ok: false, erro: 'llm_indisponivel', llmModel: null };
  }

  const prompt = montarPrompt(regexCampos);
  const promptLen = prompt.length;

  let resultado;
  try {
    resultado = await generateJsonWithLlm(prompt);
  } catch (err) {
    return { ok: false, erro: `llm_call_failed: ${err.message}`, llmModel: llm.activeModel };
  }

  // Valida categoria
  const cat = resultado?.rootCauseCategory;
  if (!cat || !TAXONOMIA_CAUSAS.includes(cat)) {
    resultado.rootCauseCategory = 'desconhecido';
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
export const TAXONOMIA_SOLUCOES_EXPORT = TAXONOMIA_SOLUCOES;
