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

const TERMOS_AGENDAMENTO = [
  'agendar', 'marcar', 'abrir os', 'abrir uma os', 'abrir chamado',
  'nova manutencao', 'novo agendamento', 'quero agendar', 'preciso agendar',
  'gostaria de agendar',
];

const TERMOS_RELATORIO = [
  'quando foi', 'qual foi', 'ultima', 'mais recente', 'historico', 'relatorio',
  'quantas', 'quais', 'listar', 'liste', 'mostrar', 'mostre', 'consulta',
  'feita em', 'feitas em', 'no periodo', 'periodo', 'ultimo ano',
  'preventivas', 'corretivas',
];

const TERMOS_ANALYTICS = [
  'mais paradas', 'mais corretivas', 'mais preventivas', 'mais manutencoes',
  'top equipamentos', 'ranking', 'tendencia', 'tendencia', 'por setor',
  'por unidade', 'backlog', 'em aberto', 'quais tiveram mais', 'pior equipamento',
  'melhor unidade', 'distribuicao', 'distribuicao', 'comparar unidades',
  'comparar setores', 'risco alto', 'equipamentos criticos',
  'mes a mes', 'evolucao mensal',
];

function classificarHeuristica(msg) {
  const m = normalizarTexto(msg);

  if (TERMOS_SEGURO.some((t) => m.includes(t))) {
    return { intent: 'SEGURO', confianca: 0.9 };
  }
  // BATCH antes de AGENDAMENTO — contém termos de agendamento
  if (TERMOS_BATCH_AGENDAMENTO.some((t) => m.includes(t))) {
    return { intent: 'BATCH_AGENDAMENTO', confianca: 0.92 };
  }
  if (TERMOS_AGENDAMENTO.some((t) => m.includes(t))) {
    return { intent: 'AGENDAR_MANUTENCAO', confianca: 0.9 };
  }
  if (TERMOS_ANALYTICS.some((t) => m.includes(t))) {
    return { intent: 'ANALYTICS', confianca: 0.88 };
  }
  if (TERMOS_RELATORIO.some((t) => m.includes(t))) {
    return { intent: 'RELATORIO', confianca: 0.85 };
  }

  return null;
}

// Sanitiza a mensagem do usuário antes de interpolá-la no prompt
function sanitizarMensagem(msg = '') {
  return String(msg).replace(/"/g, '\\"').slice(0, 500);
}

async function interpretarComLlm(mensagem) {
  const llm = getLlmRuntimeInfo();
  if (!llm.available) return null;

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

Urgência: "Alta" (quebrou/parou/urgente), "Media" (preventiva/revisão), "Baixa" (planejamento)

Mensagem: "${sanitizarMensagem(mensagem)}"`;

  try {
    return await generateJsonWithLlm(prompt);
  } catch (err) {
    console.error('[INTERPRETATION_AGENT] Erro no LLM:', err.message);
    return null;
  }
}

const INTENTS_VALIDOS = ['BATCH_AGENDAMENTO', 'AGENDAR_MANUTENCAO', 'RELATORIO', 'SEGURO', 'ANALYTICS', 'OUTRO'];

export const InterpretationAgent = {
  nome: 'InterpretationAgent',
  capacidades: ['classificar_intencao', 'extrair_entidades', 'detectar_urgencia'],

  async executar(contexto) {
    const { mensagem } = contexto;

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

    const llmResult = await interpretarComLlm(mensagem);

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
