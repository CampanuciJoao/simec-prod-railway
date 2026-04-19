function normalizarTexto(valor, fallback = null) {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }

  return valor;
}

export function buildAlertMetaManutencao(manut, extra = {}) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';

  const subtituloBaseDefault = `${modelo} (${tag})`;

  return {
    subtituloBase: extra.subtituloBase || subtituloBaseDefault,
    numeroOS: normalizarTexto(manut.numeroOS),
    dataHoraAgendamentoInicio: normalizarTexto(
      manut.dataHoraAgendamentoInicio
    ),
    dataHoraAgendamentoFim: normalizarTexto(
      manut.dataHoraAgendamentoFim
    ),
    ...extra,
  };
}
