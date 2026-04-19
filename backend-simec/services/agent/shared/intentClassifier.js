// simec/backend-simec/services/agent/intentClassifier.js
import {
  generateTextWithLlm,
  getLlmRuntimeInfo,
} from '../../ai/llmService.js';

function normalizarMensagem(mensagem = '') {
  return mensagem
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function classificarHeuristica(mensagem) {
  const msg = normalizarMensagem(mensagem);

  const termosSeguro = [
    'seguro',
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
    'ultima',
    'mais recente',
    'historico',
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
    'no periodo',
    'periodo',
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
    'nova manutencao',
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

export async function classificarIntencao(mensagem) {
  const msg = mensagem?.toString()?.trim();
  const llm = getLlmRuntimeInfo();

  if (!msg) {
    return 'OUTRO';
  }

  const heuristica = classificarHeuristica(msg);
  if (heuristica) {
    console.log(`[INTENT_MANUAL] Detectado ${heuristica} por heuristica.`);
    return heuristica;
  }

  if (!llm.available) {
    console.warn(
      `[IA_INTENT_WARN] Nenhum provider de IA disponivel. provider=${llm.activeProvider}. Usando fallback OUTRO.`
    );
    return 'OUTRO';
  }

  const prompt = `
Voce e um triador de tarefas hospitalares.
Classifique a mensagem do usuario em apenas uma categoria:

- AGENDAR_MANUTENCAO: quando o usuario quer criar, marcar, agendar ou abrir uma manutencao
- RELATORIO: quando o usuario quer consultar historico, ultima manutencao, listas, relatorios ou periodos
- SEGURO: quando o usuario quer consultar seguro, apolice, seguradora, cobertura, vigencia, vencimento ou documento da apolice
- OUTRO: saudacao ou conversa sem acao clara

Regras importantes:
- "quando foi a ultima preventiva em Coxim?" = RELATORIO
- "quais preventivas no ultimo ano?" = RELATORIO
- "marcar uma preventiva para amanha" = AGENDAR_MANUTENCAO
- "abrir uma corretiva" = AGENDAR_MANUTENCAO
- "me traga o seguro da unidade sede" = SEGURO
- "qual o vencimento da apolice de Coxim?" = SEGURO
- "me mostre a cobertura do seguro" = SEGURO

Mensagem: "${msg}"

Responda APENAS com uma das categorias:
AGENDAR_MANUTENCAO
RELATORIO
SEGURO
OUTRO
`;

  try {
    const textoResposta = await generateTextWithLlm(prompt);
    const detectada = extrairCategoriaValida(textoResposta);

    console.log(
      `[IA_INTENT] provider=${llm.activeProvider} model=${llm.activeModel || 'n/a'} | Input: "${msg}" | Detectada: ${detectada || 'OUTRO'}`
    );

    return detectada || 'OUTRO';
  } catch (error) {
    console.error(
      `[IA_INTENT_ERROR] provider=${llm.activeProvider} | Falha na IA:`,
      error.message
    );
    return 'OUTRO';
  }
}
