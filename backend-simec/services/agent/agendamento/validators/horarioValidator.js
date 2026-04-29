import {
  getAgora,
  localDateTimeToUtc as criarDateUTCFromLocal,
  getTenantTimezone,
  isValidDate as isDataValida,
} from '../../../time/index.js';

function formatarHoraNoTimezone(date, timeZone) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '--:--';
  }
}

/**
 * Valida se o horario agendado (data + hora locais) e futuro.
 *
 * FIX: criarDateUTCFromLocal espera objeto { dateLocal, timeLocal, timezone },
 * nao argumentos posicionais.
 */
export const validarHorarioFuturo = (data, hora, tenant = null) => {
  if (!data || !hora) {
    return { valido: true };
  }

  const agora = getAgora();
  const tenantTimezone = getTenantTimezone(tenant);

  const solicitado = criarDateUTCFromLocal({
    dateLocal: data,
    timeLocal: hora,
    timezone: tenantTimezone,
  });

  if (!isDataValida(solicitado)) {
    return {
      valido: false,
      msg: 'Nao consegui interpretar a data ou horario informado. Por favor, informe a data no formato DD/MM/AAAA e o horario como, por exemplo, 10:00.',
    };
  }

  if (solicitado.getTime() <= agora.getTime()) {
    const agoraFmt = formatarHoraNoTimezone(agora, tenantTimezone);
    return {
      valido: false,
      msg: `O horario **${hora}** ja passou. Agora sao **${agoraFmt}**. Por favor, informe um horario futuro.`,
    };
  }

  return { valido: true };
};
