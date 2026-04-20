function contemAlgumTermo(msg, termos) {
  return termos.some((termo) => msg.includes(termo));
}

export function pareceConsultaRelatorio(msg) {
  return contemAlgumTermo(msg, [
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
  ]);
}

export function pareceAgendamento(msg) {
  return contemAlgumTermo(msg, [
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
  ]);
}

export function pareceSeguro(msg) {
  return contemAlgumTermo(msg, [
    'seguro',
    'apolice',
    'seguradora',
    'cobertura',
    'coberturas',
    'vencimento do seguro',
    'vence o seguro',
    'pdf do seguro',
    'documento do seguro',
  ]);
}

export function ajustarIntencaoPorHeuristica(intencao, msgMinuscula) {
  let intencaoFinal = intencao;

  if (pareceSeguro(msgMinuscula)) {
    intencaoFinal = 'SEGURO';
  } else if (pareceAgendamento(msgMinuscula)) {
    intencaoFinal = 'AGENDAR_MANUTENCAO';
  } else if (pareceConsultaRelatorio(msgMinuscula)) {
    intencaoFinal = 'RELATORIO';
  }

  return intencaoFinal;
}
