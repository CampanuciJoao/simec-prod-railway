// simec/backend-simec/services/agent/intentClassifier.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || null;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI
  ? genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  : null;

function normalizarMensagem(mensagem = '') {
  return mensagem.toString().toLowerCase().trim();
}

function classificarHeuristica(mensagem) {
  const msg = normalizarMensagem(mensagem);

  const termosSeguro = [
    'seguro',
    'apólice',
    'apolice',
    'seguradora',
    'cobertura',
    'coberturas',
    'vencimento do seguro',
    'vence o seguro',
    'pdf do seguro',
    'documento do seguro',
  ];

  const termosRelatorio = [
    'quando foi',
    'qual foi',
    'última',
    'ultima',
    'mais recente',
    'histórico',
    'historico',
    'relatório',
    'relatorio',
    'quantas',
    'quais',
    'listar',
    'liste',
    'mostrar',
    'mostre',
    'consulta',
    'feita em',
    'feitas em',
    'no período',
    'periodo',
    'último ano',
    'ultimo ano',
    'preventivas',
    'corretivas',
  ];

  const termosAgendamento = [
    'agendar',
    'marcar',
    'abrir os',
    'abrir uma os',
    'abrir chamado',
    'nova manutenção',
    'novo agendamento',
    'quero agendar',
    'preciso agendar',
    'gostaria de agendar',
  ];

  if (termosSeguro.some((t) => msg.includes(t))) {
    return 'SEGURO';
  }

  if (termosRelatorio.some((t) => msg.includes(t))) {
    return 'RELATORIO';
  }

  if (termosAgendamento.some((t) => msg.includes(t))) {
    return 'AGENDAR_MANUTENCAO';
  }

  return null;
}

function extrairCategoriaValida(texto = '') {
  const respostaIA = texto
    .toString()
    .trim()
    .toUpperCase()
    .replace(/```/g, '')
    .replace(/JSON/g, '')
    .trim();

  const categoriasValidas = [
    'AGENDAR_MANUTENCAO',
    'RELATORIO',
    'SEGURO',
    'OUTRO',
  ];

  return categoriasValidas.find((cat) => respostaIA.includes(cat)) || null;
}

/**
 * Classifica a intenção do usuário.
 */
export async function classificarIntencao(mensagem) {
  const msg = mensagem?.toString()?.trim();

  if (!msg) {
    return 'OUTRO';
  }

  const heuristica = classificarHeuristica(msg);
  if (heuristica) {
    console.log(`[INTENT_MANUAL] Detectado ${heuristica} por heurística.`);
    return heuristica;
  }

  if (!model) {
    console.warn(
      '[IA_INTENT_WARN] GEMINI_API_KEY não configurada. Usando fallback OUTRO.'
    );
    return 'OUTRO';
  }

  const prompt = `
Você é um triador de tarefas hospitalares.
Classifique a mensagem do usuário em apenas uma categoria:

- AGENDAR_MANUTENCAO: quando o usuário quer criar, marcar, agendar ou abrir uma manutenção
- RELATORIO: quando o usuário quer consultar histórico, última manutenção, listas, relatórios ou períodos
- SEGURO: quando o usuário quer consultar seguro, apólice, seguradora, cobertura, vigência, vencimento ou documento da apólice
- OUTRO: saudação ou conversa sem ação clara

Regras importantes:
- "quando foi a última preventiva em Coxim?" = RELATORIO
- "quais preventivas no último ano?" = RELATORIO
- "marcar uma preventiva para amanhã" = AGENDAR_MANUTENCAO
- "abrir uma corretiva" = AGENDAR_MANUTENCAO
- "me traga o seguro da unidade sede" = SEGURO
- "qual o vencimento da apólice de Coxim?" = SEGURO
- "me mostre a cobertura do seguro" = SEGURO

Mensagem: "${msg}"

Responda APENAS com uma das categorias:
AGENDAR_MANUTENCAO
RELATORIO
SEGURO
OUTRO
`;

  try {
    const result = await model.generateContent(prompt);
    const textoResposta = result?.response?.text?.() || '';
    const detectada = extrairCategoriaValida(textoResposta);

    console.log(
      `[IA_INTENT] Input: "${msg}" | Detectada: ${detectada || 'OUTRO'}`
    );

    return detectada || 'OUTRO';
  } catch (error) {
    console.error('[IA_INTENT_ERROR] Falha na API do Google:', error.message);
    return 'OUTRO';
  }
}