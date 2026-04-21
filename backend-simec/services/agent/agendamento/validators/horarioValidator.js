import {
  getAgora,
  criarDateUTCFromLocal,
  getTenantTimezone,
  isDataValida,
} from '../../../timeService.js';

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
 * Valida se o horário agendado (data + hora locais) é futuro.
 *
 * FIX: criarDateUTCFromLocal espera objeto { dateLocal, timeLocal, timezone },
 * não argumentos posicionais. A chamada anterior passava 3 args posicionais,
 * fazendo dateLocal = undefined e isDataValida retornar false sempre.
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
      msg: 'Não consegui interpretar a data ou horário informado. Por favor informe a data (ex: 21/04/2026) e o horário (ex: 10:00) separadamente.',
    };
  }

  if (solicitado.getTime() <= agora.getTime()) {
    const agoraFmt = formatarHoraNoTimezone(agora, tenantTimezone);
    return {
      valido: false,
      msg: `O horário **${hora}** já passou. Agora são **${agoraFmt}**. Por favor, informe um horário futuro.`,
    };
  }

  return { valido: true };
};
