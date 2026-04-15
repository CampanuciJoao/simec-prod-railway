// Ficheiro: services/alertas/manutencao/manutencaoAlertMeta.js
// Descrição: monta payload estruturado para alertas de manutenção

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
    subtituloBase:
      extra.subtituloBase || subtituloBaseDefault,

    numeroOS: normalizarTexto(manut.numeroOS),
    dataHoraAgendamentoInicio: normalizarTexto(
      manut.dataHoraAgendamentoInicio
    ),
    dataHoraAgendamentoFim: normalizarTexto(
      manut.dataHoraAgendamentoFim
    ),

    // 🔥 contexto padrão (importante para IA e correlação)
    contexto: {
      equipamentoId: manut.equipamentoId || null,
      unidadeId: manut.equipamento?.unidadeId || null,
      manutencaoId: manut.id,
      tenantId: manut.tenantId,
      ...extra.contexto,
    },

    // 🔥 metadata padrão
    metadata: {
      tipo: 'manutencao',
      origem: 'alerta_manutencao',
      ...extra.metadata,
    },

    ...extra,
  };
}