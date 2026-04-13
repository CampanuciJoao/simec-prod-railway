export function pareceConsultaRelatorio(msg) {
  return [
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
  ].some((t) => msg.includes(t));
}

export function pareceAgendamento(msg) {
  return [
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
  ].some((t) => msg.includes(t));
}

export function pareceSeguro(msg) {
  return [
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
  ].some((t) => msg.includes(t));
}

export function ajustarIntencaoPorHeuristica(intencao, msgMinuscula) {
  let intencaoFinal = intencao;

  if (intencaoFinal === 'OUTRO' && pareceSeguro(msgMinuscula)) {
    intencaoFinal = 'SEGURO';
  }

  if (intencaoFinal === 'OUTRO' && pareceConsultaRelatorio(msgMinuscula)) {
    intencaoFinal = 'RELATORIO';
  }

  if (intencaoFinal === 'OUTRO' && pareceAgendamento(msgMinuscula)) {
    intencaoFinal = 'AGENDAR_MANUTENCAO';
  }

  if (pareceSeguro(msgMinuscula)) {
    intencaoFinal = 'SEGURO';
  } else if (pareceAgendamento(msgMinuscula)) {
    intencaoFinal = 'AGENDAR_MANUTENCAO';
  } else if (pareceConsultaRelatorio(msgMinuscula)) {
    intencaoFinal = 'RELATORIO';
  }

  return intencaoFinal;
}