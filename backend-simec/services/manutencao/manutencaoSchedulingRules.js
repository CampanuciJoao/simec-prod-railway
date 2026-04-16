import { validateSchedulingWindow } from '../time/index.js';

export function montarMensagemErroAgendamento(code) {
  switch (code) {
    case 'INVALID_LOCAL_DATE':
      return 'A data do agendamento é inválida.';
    case 'INVALID_LOCAL_START_TIME':
      return 'A hora inicial do agendamento é inválida.';
    case 'INVALID_LOCAL_END_TIME':
      return 'A hora final do agendamento é inválida.';
    case 'PAST_LOCAL_DATETIME':
      return 'A data/hora informada está no passado.';
    case 'END_BEFORE_OR_EQUAL_START':
      return 'A hora final deve ser maior que a hora inicial.';
    default:
      return 'Data/hora de agendamento inválida.';
  }
}

export function validarAgendamento({
  dateLocal,
  startTimeLocal,
  endTimeLocal,
  timezone,
}) {
  return validateSchedulingWindow({
    dateLocal,
    startTimeLocal,
    endTimeLocal: endTimeLocal || null,
    timezone,
  });
}

export function gerarNumeroOS({
  tipo,
  tag,
  sequencia,
}) {
  const osNumber = String(sequencia).padStart(4, '0');
  const tagPrefix = String(tag || 'MAN')
    .substring(0, 3)
    .toUpperCase();

  return `${String(tipo).substring(0, 1).toUpperCase()}${tagPrefix}-${osNumber}`;
}

export function montarPayloadPersistencia({
  dados,
  agendamento,
  tenantId,
  equipamentoId,
  numeroOS,
  numeroOSExistente = null,
}) {
  return {
    tenant: {
      connect: { id: tenantId },
    },

    equipamento: {
      connect: {
        tenantId_id: {
          tenantId,
          id: equipamentoId,
        },
      },
    },

    numeroOS: numeroOS || numeroOSExistente,
    tipo: dados.tipo,
    descricaoProblemaServico: dados.descricaoProblemaServico,
    tecnicoResponsavel: dados.tecnicoResponsavel?.trim() || null,
    numeroChamado:
      dados.tipo === 'Corretiva' ? dados.numeroChamado?.trim() || null : null,
    custoTotal:
      typeof dados.custoTotal === 'number' ? dados.custoTotal : null,
    status: dados.status || 'Agendada',

    agendamentoDataLocal: dados.agendamentoDataLocal,
    agendamentoHoraInicioLocal: dados.agendamentoHoraInicioLocal,
    agendamentoHoraFimLocal: dados.agendamentoHoraFimLocal || null,
    agendamentoTimezone: agendamento.timezone,

    dataHoraAgendamentoInicio: agendamento.startUtc,
    dataHoraAgendamentoFim: agendamento.endUtc,
  };
}

export function extrairLocalDateTimeFromIso(isoString, timezone) {
  const parsed = new Date(isoString);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(parsed);
  const get = (type) => parts.find((item) => item.type === type)?.value || '';

  return {
    dateLocal: `${get('year')}-${get('month')}-${get('day')}`,
    timeLocal: `${get('hour')}:${get('minute')}`,
    utcDate: parsed,
  };
}