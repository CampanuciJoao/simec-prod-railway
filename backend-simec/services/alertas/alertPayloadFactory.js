// Ficheiro: backend-simec/services/alertas/alertPayloadFactory.js

import {
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
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
  contexto = {},
  metadata = {},
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
    tipo: tipoCategoria,
    tipoEvento,
    link,
    contexto,
    metadata,
    createdAt: new Date(),
  };
}

export {
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
};