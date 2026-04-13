import { getAgora, criarDateUTC, isDataValida } from '../../../timeService.js';

export const validarHorarioFuturo = (data, hora) => {
  if (!data || !hora) return { valido: true };

  const agora = getAgora();
  const solicitado = criarDateUTC(data, hora);

  if (!isDataValida(solicitado)) {
    return {
      valido: false,
      msg: 'Não consegui interpretar a data ou horário informado.',
    };
  }

  if (solicitado < agora) {
    const agoraFmt = `${agora.getUTCHours()}:${agora
      .getUTCMinutes()
      .toString()
      .padStart(2, '0')}`;

    return {
      valido: false,
      msg: `O horário **${hora}** já passou. Agora são **${agoraFmt}**. Por favor, informe um horário futuro.`,
    };
  }

  return { valido: true };
};