// Ficheiro: services/alertas/manutencao/manutencaoAlertMeta.js
// Descrição: monta payload estruturado para alertas de manutenção

export function buildAlertMetaManutencao(manut, extra = {}) {
  return {
    subtituloBase:
      extra.subtituloBase ||
      `${manut.equipamento?.modelo || 'Equipamento'} (${manut.equipamento?.tag || 'Sem TAG'})`,
    numeroOS: manut.numeroOS || null,
    dataHoraAgendamentoInicio: manut.dataHoraAgendamentoInicio || null,
    dataHoraAgendamentoFim: manut.dataHoraAgendamentoFim || null,
    ...extra,
  };
}