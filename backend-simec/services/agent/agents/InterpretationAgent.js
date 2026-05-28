import { generateJsonWithLlm, getLlmRuntimeInfo } from '../../ai/llmService.js';
import { normalizarTexto } from '../../shared/textUtils.js';
import { adicionarAuditoria } from '../orchestrator/AgentContext.js';

const TERMOS_SEGURO = [
  'seguro', 'apolice', 'seguradora', 'cobertura', 'coberturas',
  'vencimento do seguro', 'vence o seguro', 'pdf do seguro', 'documento do seguro',
];

const TERMOS_BATCH_AGENDAMENTO = [
  'todos os equipamentos', 'todos equipamentos',
  'em massa', 'em lote',
  'equipamentos vencidos', 'os vencidas', 'manutencoes vencidas',
  'equipamentos sem manutencao', 'sem manutencao recente',
  'agendar para todos', 'abrir os para todos',
  'equipamentos de risco', 'todos do setor', 'todos da unidade',
  'equipamentos criticos',
  'manutencao em massa', 'agendamento em lote',
];

// Verbos de ACAO inequivocos — usuario quer CRIAR algo.
// Heuristica forte: presenca destes = AGENDAR_MANUTENCAO com alta confianca,
// MESMO se a frase tambem tiver palavras como "preventiva" / "unidade".
const TERMOS_AGENDAMENTO_FORTES = [
  'agendar', 'agende', 'agenda uma', 'agenda essa', 'agenda essa',
  'marcar', 'marque', 'marca uma',
  'abrir os', 'abrir uma os', 'abrir chamado', 'abre os', 'abre uma os',
  'criar os', 'criar uma os', 'cria uma os',
  'nova manutencao', 'novo agendamento',
  'quero agendar', 'preciso agendar', 'gostaria de agendar',
  'pode agendar', 'poderia agendar',
];

// Verbos de CONSULTA inequivocos — usuario quer SABER algo, nao criar.
// Heuristica forte: presenca destes = RELATORIO com alta confianca,
// MESMO se a frase tambem tiver palavras como "preventiva" / "manutencao".
const TERMOS_CONSULTA_FORTES = [
  'quando foi', 'quando ocorreu', 'quando aconteceu',
  'qual foi', 'quais foram', 'qual a ultima', 'qual foi a ultima',
  'gostaria de saber', 'queria saber', 'quero saber', 'preciso saber',
  'gostaria de ver', 'queria ver', 'quero ver', 'preciso ver',
  'me diga', 'me diz', 'me mostra', 'me mostre', 'me informa',
  'consultar', 'consulte', 'consulta o', 'consulta a',
  'me passa', 'me passe', 'me da', 'me de',
  'historico', 'relatorio',
];

// Termos GENERICOS de relatorio — sozinhos nao sao decisivos, mas casados
// com ausencia de verbo de acao indicam consulta.
const TERMOS_RELATORIO_FRACOS = [
  'ultima', 'ultimo', 'mais recente',
  'listar', 'liste', 'mostrar', 'mostre', 'consulta',
  'feita em', 'feitas em', 'no periodo', 'periodo', 'ultimo ano',
  'preventiva', 'preventivas', 'corretiva', 'corretivas',
  'quantas', 'quais',
];

const TERMOS_ANALYTICS = [
  'mais paradas', 'mais corretivas', 'mais preventivas', 'mais manutencoes',
  'top equipamentos', 'ranking', 'tendencia', 'por setor',
  'por unidade', 'backlog', 'em aberto', 'quais tiveram mais', 'pior equipamento',
  'melhor unidade', 'distribuicao', 'comparar unidades',
  'comparar setores', 'risco alto', 'equipamentos criticos',
  'mes a mes', 'evolucao mensal',
];

// Classifica por heuristica seguindo regra de PRECEDENCIA:
//
// 1. SEGURO (termo muito especifico)
// 2. BATCH_AGENDAMENTO (subset de AGENDAR mas com termos exclusivos)
// 3. Detecta CONFLITO consulta+acao — se ambos presentes, devolve null
//    pra deixar o LLM (com few-shot) ou o caminho de confirmacao decidir
// 4. CONSULTA_FORTE sozinho → RELATORIO (cobre o caso "quando foi a ultima
//    preventiva" que antes caia errado em AGENDAR via LLM sem few-shot)
// 5. AGENDAMENTO_FORTE sozinho → AGENDAR_MANUTENCAO
// 6. ANALYTICS (agregado)
// 7. RELATORIO_FRACOS (fallback de termos genericos)
function classificarHeuristica(msg) {
  const m = normalizarTexto(msg);

  if (TERMOS_SEGURO.some((t) => m.includes(t))) {
    return { intent: 'SEGURO', confianca: 0.9 };
  }

  if (TERMOS_BATCH_AGENDAMENTO.some((t) => m.includes(t))) {
    return { intent: 'BATCH_AGENDAMENTO', confianca: 0.92 };
  }

  const temConsultaForte = TERMOS_CONSULTA_FORTES.some((t) => m.includes(t));
  const temAcaoForte = TERMOS_AGENDAMENTO_FORTES.some((t) => m.includes(t));

  // Conflito: usuario disse "quero saber E depois agendar". Caso raro,
  // mas existe. Devolve null pra LLM (com few-shot) decidir — o caminho
  // de baixa confianca no Planner ainda vai pedir confirmacao.
  if (temConsultaForte && temAcaoForte) {
    return null;
  }

  if (temConsultaForte) {
    return { intent: 'RELATORIO', confianca: 0.92 };
  }

  if (temAcaoForte) {
    return { intent: 'AGENDAR_MANUTENCAO', confianca: 0.92 };
  }

  if (TERMOS_ANALYTICS.some((t) => m.includes(t))) {
    return { intent: 'ANALYTICS', confianca: 0.88 };
  }

  if (TERMOS_RELATORIO_FRACOS.some((t) => m.includes(t))) {
    // Confianca menor — termos genericos sem verbo decisivo. O Planner
    // pode pedir confirmacao se threshold < 0.85.
    return { intent: 'RELATORIO', confianca: 0.78 };
  }

  return null;
}

// Sanitiza a mensagem do usuário antes de interpolá-la no prompt
function sanitizarMensagem(msg = '') {
  return String(msg).replace(/"/g, '\\"').slice(0, 500);
}

// Monta a secao de catalogo dentro do prompt. Limita a 60 linhas pra
// nao explodir tokens em tenant grande (cada linha ~50-80 chars). Cliente
// com >60 equipamentos ainda tem o entityResolver em sessao como rede.
function formatarCatalogoParaPrompt(catalogo) {
  if (!Array.isArray(catalogo) || catalogo.length === 0) return '';
  const linhas = catalogo.slice(0, 60).map((l) => `- ${l}`).join('\n');
  return `

CATALOGO DE EQUIPAMENTOS DESTE CLIENTE (use para resolver apelidos no campo "equipamento"):
${linhas}

REGRA: se o usuário escrever um apelido parcial (ex: "Tomografia Evo"),
identifique o modelo COMPLETO no catalogo acima e preencha o campo
"equipamento" com o modelo exato (ex: "Revolution Evo"). Se nenhum item
casar com confiança razoável, preencha com o termo do usuário literal.`;
}

async function interpretarComLlm(mensagem, catalogoEquipamentos = [], tenantId = null) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) return null;

  const secaoCatalogo = formatarCatalogoParaPrompt(catalogoEquipamentos);

  const prompt = `Você é um agente de interpretação de tarefas hospitalares. Analise a mensagem e retorne um JSON com esta estrutura:

{
  "intent": "AGENDAR_MANUTENCAO",
  "entidades": {
    "equipamento": null,
    "setor": null,
    "unidade": null,
    "urgencia": "Media"
  },
  "confianca": 0.85,
  "raciocinio": "explicação curta"
}

Valores possíveis para intent:
- "BATCH_AGENDAMENTO": agendar/criar OS para múltiplos equipamentos de uma vez
- "AGENDAR_MANUTENCAO": criar/agendar OS para um equipamento específico
- "RELATORIO": consultar histórico, última manutenção, listas
- "SEGURO": consultar apólice, seguradora, cobertura, vencimento
- "ANALYTICS": análises agregadas — top equipamentos, tendência, backlog
- "OUTRO": saudação ou conversa sem ação clara

REGRA CRÍTICA — distinguir CONSULTA (RELATORIO) de AÇÃO (AGENDAR):
- Verbos de CONSULTA: "saber", "ver", "consultar", "mostrar", "quando foi", "qual foi", "me diga" → RELATORIO
- Verbos de AÇÃO: "agendar", "marcar", "abrir OS", "criar", "agenda essa" → AGENDAR_MANUTENCAO
- Palavras como "preventiva", "corretiva", "manutenção", "unidade", "equipamento" SOZINHAS não decidem — o que decide é o VERBO PRINCIPAL.

Exemplos:
"quando foi a última preventiva na TC Sede?" → RELATORIO (verbo: saber quando)
"qual foi a última manutenção do RM" → RELATORIO
"gostaria de saber quando foi a última preventiva" → RELATORIO
"agenda uma preventiva pra TC pra terça" → AGENDAR_MANUTENCAO (verbo: agendar)
"marcar manutenção do mamógrafo" → AGENDAR_MANUTENCAO
"preciso agendar uma preventiva no RM" → AGENDAR_MANUTENCAO
"quero abrir um chamado, o RM está com problema" → AGENDAR_MANUTENCAO
"preventivas vencidas no parque" → ANALYTICS
"top equipamentos com mais corretivas" → ANALYTICS
"oi, tudo bem?" → OUTRO

Urgência: "Alta" (quebrou/parou/urgente), "Media" (preventiva/revisão), "Baixa" (planejamento)

Se você não tem certeza entre RELATORIO e AGENDAR_MANUTENCAO, devolva a confiança ≤ 0.7 — o sistema vai pedir confirmação ao usuário em vez de assumir.${secaoCatalogo}

Mensagem: "${sanitizarMensagem(mensagem)}"`;

  try {
    return await generateJsonWithLlm(prompt, {
      feature: 'agente_interpretacao',
      tenantId,
    });
  } catch (err) {
    console.error('[INTERPRETATION_AGENT] Erro no LLM:', err.message);
    return null;
  }
}

const INTENTS_VALIDOS = ['BATCH_AGENDAMENTO', 'AGENDAR_MANUTENCAO', 'RELATORIO', 'SEGURO', 'ANALYTICS', 'AMBIGUO', 'OUTRO'];

// Verbos de acao que indicam que o usuario QUER iniciar algo, mas pode
// nao ter sido especifico. Casa com 'abrir chamado', 'abrir um chamado',
// 'criar uma os', 'registrar problema', etc. Usado para promover OUTRO
// em AMBIGUO quando ha intencao de acao mas tipo nao identificado.
const VERBOS_ACAO_AMBIGUOS = [
  'abrir chamado', 'abrir um chamado', 'novo chamado', 'preciso abrir',
  'quero abrir', 'gostaria de abrir', 'criar uma os', 'criar os',
  'registrar problema', 'registrar ocorrencia', 'registrar uma',
  'reportar problema', 'reportar ocorrencia', 'tem um problema',
  'preciso registrar', 'quero registrar', 'preciso criar',
];

function ehMensagemAmbigua(mensagem) {
  const m = normalizarTexto(mensagem);
  return VERBOS_ACAO_AMBIGUOS.some((t) => m.includes(t));
}

export const InterpretationAgent = {
  nome: 'InterpretationAgent',
  capacidades: ['classificar_intencao', 'extrair_entidades', 'detectar_urgencia'],

  async executar(contexto) {
    const { mensagem, catalogoEquipamentos = [], tenantId = null } = contexto;

    const heuristica = classificarHeuristica(mensagem);

    if (heuristica) {
      const resultado = {
        intent: heuristica.intent,
        entidades: { equipamento: null, setor: null, unidade: null, urgencia: 'Media' },
        confianca: heuristica.confianca,
        raciocinio: 'Detectado por heurística via palavra-chave',
        metodo: 'heuristica',
      };
      contexto.interpretacao = resultado;
      adicionarAuditoria(contexto, { agente: 'InterpretationAgent', ...resultado });
      console.log(`[INTERPRETATION] ${resultado.intent} (heurística, confiança: ${resultado.confianca})`);
      return resultado;
    }

    const llmResult = await interpretarComLlm(mensagem, catalogoEquipamentos, tenantId);

    if (llmResult?.intent && INTENTS_VALIDOS.includes(llmResult.intent)) {
      const resultado = {
        intent: llmResult.intent,
        entidades: llmResult.entidades || { equipamento: null, setor: null, unidade: null, urgencia: 'Media' },
        confianca: llmResult.confianca || 0.7,
        raciocinio: llmResult.raciocinio || '',
        metodo: 'llm',
      };
      contexto.interpretacao = resultado;
      adicionarAuditoria(contexto, { agente: 'InterpretationAgent', ...resultado });
      console.log(`[INTERPRETATION] ${resultado.intent} (LLM, confiança: ${resultado.confianca})`);
      return resultado;
    }

    // Antes de cair no fallback genérico, verifica se a mensagem tem verbo
    // de ação claro mas tipo ambíguo (ex: "abrir chamado" — pode ser
    // ocorrência, OS corretiva ou agendar preventiva). Marca AMBIGUO para
    // que o ExecutionAgent peça desambiguação ao usuário.
    if (ehMensagemAmbigua(mensagem)) {
      const ambiguo = {
        intent: 'AMBIGUO',
        entidades: { equipamento: null, setor: null, unidade: null, urgencia: 'Media' },
        confianca: 0.5,
        raciocinio: 'Verbo de ação detectado mas tipo de operação ambíguo',
        metodo: 'heuristica_ambiguo',
      };
      contexto.interpretacao = ambiguo;
      adicionarAuditoria(contexto, { agente: 'InterpretationAgent', ...ambiguo });
      console.log(`[INTERPRETATION] AMBIGUO (heurística — pedirá desambiguação)`);
      return ambiguo;
    }

    const fallback = {
      intent: 'OUTRO',
      entidades: { equipamento: null, setor: null, unidade: null, urgencia: 'Baixa' },
      confianca: 0.3,
      raciocinio: 'Nenhum método conseguiu classificar a intenção',
      metodo: 'fallback',
    };
    contexto.interpretacao = fallback;
    adicionarAuditoria(contexto, { agente: 'InterpretationAgent', ...fallback });
    return fallback;
  },
};
