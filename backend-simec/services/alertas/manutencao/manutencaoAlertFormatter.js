import { format } from 'date-fns';

export function formatarIntervaloHorario(dataInicio, dataFim) {
  const horaInicio = dataInicio ? format(new Date(dataInicio), 'HH:mm') : '--:--';
  const horaFim = dataFim ? format(new Date(dataFim), 'HH:mm') : '--:--';
  return `${horaInicio} - ${horaFim}`;
}

export function montarTituloInicio(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} na unidade de ${unidade}`;
}

export function montarSubtituloInicio(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `${modelo} (${tag}) | ${intervalo} | OS ${manut.numeroOS}`;
}

export function montarTituloFim(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Término de ${tipo} na unidade de ${unidade}`;
}

export function montarSubtituloFim(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `${modelo} (${tag}) | ${intervalo} | OS ${manut.numeroOS}`;
}

export function montarTituloConfirmacao(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Confirmar conclusão: ${modelo} (${tag}) na unidade de ${unidade}`;
}

export function montarSubtituloConfirmacao(manut) {
  const intervalo = formatarIntervaloHorario(
    manut.dataHoraAgendamentoInicio,
    manut.dataHoraAgendamentoFim
  );

  return `OS ${manut.numeroOS} | ${intervalo} | O prazo expirou. Confirme se a manutenção foi concluída ou prorrogada.`;
}

export function buildAlertId(tenantId, tipo, manutId, label = '') {
  return `tenant-${tenantId}-${tipo}-${manutId}${label ? `-${label}` : ''}`;
}