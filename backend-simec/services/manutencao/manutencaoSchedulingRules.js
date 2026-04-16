import { localDateTimeToUtc } from '../time/index.js';

export function montarMensagemErroAgendamento(code) {
  switch (code) {
    case 'INVALID_LOCAL_START':
      return 'A data/hora inicial do agendamento é inválida.';
    case 'INVALID_LOCAL_END':
      return 'A data/hora final do agendamento é inválida.';
    case 'PAST_LOCAL_DATETIME':
      return 'O início do agendamento não pode estar no passado.';
    case 'END_BEFORE_OR_EQUAL_START':
      return 'O término precisa ser posterior ao início.';
    default:
      return 'Data/hora de agendamento inválida.';
  }
}

export function validarAgendamento({
  startDateLocal,
  startTimeLocal,
  endDateLocal,
  endTimeLocal,
  timezone,
}) {
  const startUtc = localDateTimeToUtc({
    dateLocal: startDateLocal,
    timeLocal: startTimeLocal,
    timezone,
  });

  const endUtc = localDateTimeToUtc({
    dateLocal: endDateLocal,
    timeLocal: endTimeLocal,
    timezone,
  });

  if (!(startUtc instanceof Date) || Number.isNaN(startUtc.getTime())) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_START',
    };
  }

  if (!(endUtc instanceof Date) || Number.isNaN(endUtc.getTime())) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_END',
    };
  }

  if (endUtc.getTime() <= startUtc.getTime()) {
    return {
      valid: false,
      code: 'END_BEFORE_OR_EQUAL_START',
    };
  }

  return {
    valid: true,
    timezone,
    startUtc,
    endUtc,
  };
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

function montarDescricaoPadrao(tipo, descricaoInformada) {
  const descricao = String(descricaoInformada || '').trim();

  if (descricao) return descricao;
  if (tipo === 'Preventiva') return 'Manutenção preventiva de rotina';
  if (tipo === 'Calibracao') return 'Calibração programada';
  if (tipo === 'Inspecao') return 'Inspeção programada';

  return descricao;
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
    descricaoProblemaServico: montarDescricaoPadrao(
      dados.tipo,
      dados.descricaoProblemaServico
    ),
    tecnicoResponsavel: dados.tecnicoResponsavel?.trim() || null,
    numeroChamado:
      dados.tipo === 'Corretiva' ? dados.numeroChamado?.trim() || null : null,
    custoTotal:
      typeof dados.custoTotal === 'number' ? dados.custoTotal : null,
    status: dados.status || 'Agendada',

    agendamentoDataInicioLocal: dados.agendamentoDataInicioLocal,
    agendamentoHoraInicioLocal: dados.agendamentoHoraInicioLocal,
    agendamentoDataFimLocal: dados.agendamentoDataFimLocal,
    agendamentoHoraFimLocal: dados.agendamentoHoraFimLocal,
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