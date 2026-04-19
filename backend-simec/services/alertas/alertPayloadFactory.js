import {
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
  getAlertTypeLabel,
} from './alertTypes.js';

export async function criarPayloadBaseAlerta({
  id,
  titulo,
  subtitulo = null,
  subtituloBase = null,
  numeroOS = null,
  data,
  dataHoraAgendamentoInicio = null,
  dataHoraAgendamentoFim = null,
  prioridade = ALERT_PRIORIDADES.MEDIA,
  tipoCategoria,
  tipoEvento,
  link = null,
}) {
  return {
    id,
    titulo,
    subtitulo,
    subtituloBase,
    numeroOS,
    data,
    dataHoraAgendamentoInicio,
    dataHoraAgendamentoFim,
    prioridade,
    tipo: getAlertTypeLabel(tipoCategoria),
    tipoCategoria,
    tipoEvento,
    link,
  };
}

export {
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
};
