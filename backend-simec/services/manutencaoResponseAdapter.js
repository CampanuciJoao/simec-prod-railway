function normalizarTexto(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function montarAgendamentoLocal(manutencao) {
  return {
    dataInicio: manutencao.agendamentoDataInicioLocal || null,
    horaInicio: manutencao.agendamentoHoraInicioLocal || null,
    dataFim: manutencao.agendamentoDataFimLocal || null,
    horaFim: manutencao.agendamentoHoraFimLocal || null,
    timezone: manutencao.agendamentoTimezone || null,
  };
}

function montarAgendamentoUtc(manutencao) {
  return {
    inicio: manutencao.dataHoraAgendamentoInicio || null,
    fim: manutencao.dataHoraAgendamentoFim || null,
  };
}

export function adaptarManutencaoResponse(manutencao) {
  if (!manutencao) return null;

  return {
    ...manutencao,
    descricaoProblemaServico: normalizarTexto(
      manutencao.descricaoProblemaServico
    ),
    tecnicoResponsavel: normalizarTexto(manutencao.tecnicoResponsavel),
    numeroChamado: normalizarTexto(manutencao.numeroChamado),
    agendamentoLocal: montarAgendamentoLocal(manutencao),
    agendamentoUtc: montarAgendamentoUtc(manutencao),
    formulario: {
      equipamentoId: manutencao.equipamentoId,
      tipo: manutencao.tipo,
      descricaoProblemaServico: manutencao.descricaoProblemaServico || '',
      agendamentoDataInicioLocal: manutencao.agendamentoDataInicioLocal || '',
      agendamentoHoraInicioLocal:
        manutencao.agendamentoHoraInicioLocal || '',
      agendamentoDataFimLocal: manutencao.agendamentoDataFimLocal || '',
      agendamentoHoraFimLocal: manutencao.agendamentoHoraFimLocal || '',
      tecnicoResponsavel: manutencao.tecnicoResponsavel || '',
      numeroChamado: manutencao.numeroChamado || '',
      custoTotal:
        typeof manutencao.custoTotal === 'number'
          ? manutencao.custoTotal
          : null,
      status: manutencao.status || 'Agendada',
    },
  };
}

export function adaptarListaManutencoesResponse(manutencoes = []) {
  if (!Array.isArray(manutencoes)) return [];
  return manutencoes.map(adaptarManutencaoResponse);
}
