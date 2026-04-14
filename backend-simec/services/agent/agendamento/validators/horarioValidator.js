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

export const validarHorarioFuturo = (data, hora, tenant = null) => {
  if (!data || !hora) {
    return { valido: true };
  }

  const agora = getAgora();
  const tenantTimezone = getTenantTimezone(tenant);

  const solicitado = criarDateUTCFromLocal(data, hora, tenantTimezone);

  if (!isDataValida(solicitado)) {
    return {
      valido: false,
      msg: 'Não consegui interpretar a data ou horário informado.',
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