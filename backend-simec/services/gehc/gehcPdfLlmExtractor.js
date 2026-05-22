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

import prisma from '../prismaService.js';
import { generateJsonWithLlm, getLlmRuntimeInfo } from '../ai/llmService.js';
import { logLlmUsage } from '../ai/llmUsageLogger.js';
import { AI_CONFIG } from '../ai/config.js';
import {
  buscarLicoesParaFewShot,
  incrementarUsoLicoes,
} from '../ai/categoriaFeedbackService.js';

// v8: timeline de activities da OS GE injetada no prompt. Cada activity
// (engenheiro remoto, escalacao, follow-up de campo) carrega correctiveAction
// rico que antes nao chegava no LLM — moravam so no `activitiesV2` do
// GraphQL e eram descartadas no sync. Agora persistidas em
// GehcOrdemServico.activitiesJson e injetadas como bloco de contexto.
//
// v7: + cryo_adsorber e cryo_coldhead.
// v6: agregacao de PDFs irmaos do mesmo case GE.
// v5: + contaminacao_metal, artefato_imagem, interferencia_rf, uso_operador.
const LLM_EXTRACTOR_VERSION = 8;

// Taxonomia de causa-raiz — usada quando a OS eh CORRETIVA (problema real).
const TAXONOMIA_CAUSAS_CORRETIVA = [
  'infra_chiller_cliente',  // chiller predial do hospital (problema do cliente, nao do magneto)
  'cryo_compressor',         // compressor do criostato (LCC, helium compressor) — modo de FALHA real
  'cryo_adsorber',           // troca programada do adsorber (typ. 30.000h) — manutencao classificada como SE03
  'cryo_coldhead',           // troca programada do coldhead (typ. 32-50k h) — manutencao classificada como SE03
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
  'contaminacao_metal',      // objeto ferromagnetico no campo (agulha, clipe, ferramenta) — spike noise por metal
  'interferencia_rf',        // interferencia externa de RF (celular, equipamento proximo, falha de blindagem da sala)
  'artefato_imagem',         // degradacao de qualidade SEM causa hardware clara (drift, shim ruim, vibracao ambiente)
  'uso_operador',            // uso indevido, protocolo errado, paciente nao colaborou (sem falha real do equipamento)
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

// Busca activities da OS GE pai do PDF (timeline do portal: engenheiro
// remoto, escalacao para campo, follow-ups). Cada activity tem texto
// rico (correctiveAction) que NAO entra no PDF — moram so na resposta
// GraphQL do GE. Sem essa funcao o LLM perdia 60-80% do contexto narrativo
// do case. Retorna lista vazia se sem pdfDocumentoId ou se a OS pai nao
// tem activities armazenadas (sync antigo).
async function buscarActivitiesDaOsPai({ pdfDocumentoId }) {
  if (!pdfDocumentoId) return [];
  try {
    const doc = await prisma.gehcPdfDocumento.findUnique({
      where: { id: pdfDocumentoId },
      select: {
        ordemServico: { select: { activitiesJson: true } },
      },
    });
    const activities = doc?.ordemServico?.activitiesJson;
    return Array.isArray(activities) ? activities : [];
  } catch (err) {
    console.warn(`[LLM_EXTRACTOR] Falha buscar activities da OS pai: ${err.message}`);
    return [];
  }
}

// Formata activities como bloco de timeline no prompt. Ordena por
// startedAt asc (cronologico — o jeito que ser humano le).
function formatarActivities(activities) {
  if (!activities?.length) return '';
  const ordenadas = [...activities].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return ta - tb;
  });
  const blocos = ordenadas.map((a, idx) => {
    const linhas = [`Activity ${idx + 1}` +
                    (a.type ? ` (${a.type})` : '') +
                    (a.engineer ? ` — ${a.engineer}` : '') +
                    (a.startedAt ? ` em ${a.startedAt.slice(0, 10)}` : '') + ':'];
    if (a.action) linhas.push(`  ${a.action.slice(0, 600)}`);
    return linhas.join('\n');
  });
  return `\n\nTimeline de activities da OS no portal GE (engenheiro remoto -> campo -> follow-ups — leia para entender o fluxo completo do diagnostico, mesmo quando o PDF for resumido):\n${blocos.join('\n\n')}\n`;
}

// Busca PDFs irmaos do mesmo Case GE (mesmo caseNumber, mesmo tenant,
// diferente PDF). Retorna lista vazia se sem irmaos ou sem caseNumber.
// Limitado a 4 irmaos para nao inflar tokens — basta pra captar o
// diagnostico no padrao "remoto + campo + (opcional follow-up)".
async function buscarSiblingsDoCase({ tenantId, caseNumber, pdfDocumentoIdAtual }) {
  if (!caseNumber || !tenantId) return [];
  try {
    const siblings = await prisma.gehcPdfExtraido.findMany({
      where: {
        tenantId,
        caseNumber,
        ...(pdfDocumentoIdAtual ? { NOT: { pdfDocumentoId: pdfDocumentoIdAtual } } : {}),
      },
      take: 4,
      orderBy: { extraidoEm: 'asc' },
      select: {
        woNumber: true,
        engineerFullName: true,
        problemAnalyzed: true,
        actionsTaken: true,
        rootCauseRaw: true,
        testsPerformed: true,
      },
    });
    return siblings;
  } catch (err) {
    console.warn(`[LLM_EXTRACTOR] Falha buscar siblings do case ${caseNumber}: ${err.message}`);
    return [];
  }
}

// Formata os PDFs irmaos como bloco de contexto adicional no prompt.
// Cada irmao vira um sub-bloco com seus campos resumidos. Limita
// agressivamente o tamanho de cada campo para nao explodir tokens.
function formatarSiblings(siblings) {
  if (!siblings?.length) return '';
  const blocos = siblings.map((s, idx) => {
    const linhas = [`PDF irmao ${idx + 1}` + (s.woNumber ? ` (${s.woNumber})` : '') +
                    (s.engineerFullName ? ` — ${s.engineerFullName}` : '') + ':'];
    if (s.problemAnalyzed)  linhas.push(`  Problema analisado: ${s.problemAnalyzed.slice(0, 500)}`);
    if (s.actionsTaken)     linhas.push(`  Acoes tomadas: ${s.actionsTaken.slice(0, 500)}`);
    if (s.rootCauseRaw)     linhas.push(`  Causa raw: ${s.rootCauseRaw.slice(0, 300)}`);
    if (s.testsPerformed)   linhas.push(`  Testes: ${s.testsPerformed.slice(0, 300)}`);
    return linhas.join('\n');
  });
  return `\n\nOutros PDFs do mesmo Case GE (mesmo numero de caso, WOs diferentes — use o contexto deles tambem):\n${blocos.join('\n\n')}\n`;
}

// Formata as licoes cross-tenant como bloco de few-shot examples para o
// prompt. Vazio se nao houver licoes — o prompt segue sem essa secao.
function formatarFewShot(licoes) {
  if (!licoes?.length) return '';
  const exemplos = licoes
    .map((l, idx) => `Exemplo ${idx + 1}:\n  Texto: ${l.textoDespersonalizado}\n  Categoria correta: ${l.categoriaCorreta}`)
    .join('\n\n');
  return `\n\nExemplos de correcoes anteriores (de admins humanos em casos similares — use como referencia, NAO copie literalmente):\n${exemplos}\n`;
}

function montarPrompt({ rootCauseRaw, problemAnalyzed, actionsTaken, testsPerformed, serviceTypeCode, fewShotBlock = '', siblingsBlock = '', activitiesBlock = '' }) {
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
- "compressor off" + cryo/criogenia: cryo_compressor (modo de FALHA real)
- "adsorber" + horas de uso (ex: "30.000hrs", "30k horas") + peca trocada: cryo_adsorber
  (NAO eh falha real — troca programada por vida util. GE classifica como
  SE03 mas o conteudo eh PM. PREFERIR este sobre 'desconhecido'.)
- "coldhead" / "cold head" + horas de uso + peca trocada: cryo_coldhead
  (idem cryo_adsorber — troca programada do coldhead)
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
- "teclado", "mouse", "intercom", "leitor de cartao" defeituosos: monitor_console
- "metal no campo", "agulha", "clipe", "grampo", "objeto ferromagnetico", "spike noise" + inspecao de metais: contaminacao_metal
- "interferencia RF externa", "celular proximo", "equipamento adjacente interferindo", "blindagem da sala": interferencia_rf
- "drift", "artefato sem causa", "vibracao ambiente", "shim ruim sem hardware defeituoso", "imagem degradada sem componente identificado": artefato_imagem
- "uso indevido", "protocolo errado", "paciente nao colaborou", "operador orientado a configurar diferente", "nao era falha do equipamento": uso_operador
  (PREFERIR uso_operador sobre 'sem_acao' como solucao quando a OS for so orientacao)`;

  return `Voce e um especialista em manutencao de equipamentos de Ressonancia Magnetica GE Healthcare.
Analise o relato de uma OS abaixo e responda APENAS com um JSON valido na estrutura especificada.

CONTEXTO IMPORTANTE: ${contextoTipo}

Texto da OS:
- Causa do problema (raw): ${rootCauseRaw || '(vazio)'}
- Problema analisado: ${(problemAnalyzed || '').slice(0, 1500)}
- Acoes tomadas: ${(actionsTaken || '').slice(0, 1500)}
- Testes realizados: ${(testsPerformed || '').slice(0, 800)}${activitiesBlock}${siblingsBlock}${fewShotBlock}

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

export async function extrairCamposViaLlm({ tenantId, regexCampos, serviceTypeCode = null, pdfDocumentoId = null }) {
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

  // PDFs irmaos do mesmo Case GE (mesmo caseNumber). Captura o cenario
  // remoto+campo: PDF 1 (engenheiro remoto) eh generico e isolado seria
  // 'desconhecido'; PDF 2 (engenheiro de campo) tem o diagnostico real.
  // Com o sibling block, ambos veem o contexto completo do case e
  // categorizam consistentemente.
  const siblings = await buscarSiblingsDoCase({
    tenantId,
    caseNumber: regexCampos?.caseNumber,
    pdfDocumentoIdAtual: pdfDocumentoId,
  });
  const siblingsBlock = formatarSiblings(siblings);

  // Timeline de activities da OS no portal GE — texto que aparece como
  // "Engenheiro Remoto X respondeu... Engenheiro de campo Y respondeu..."
  // e NAO esta no PDF. Mora so no GraphQL e ja foi persistido em
  // GehcOrdemServico.activitiesJson pelo sync. Insumo mais rico do LLM.
  const activities = await buscarActivitiesDaOsPai({ pdfDocumentoId });
  const activitiesBlock = formatarActivities(activities);

  const prompt = montarPrompt({ ...regexCampos, serviceTypeCode, fewShotBlock, siblingsBlock, activitiesBlock });
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
