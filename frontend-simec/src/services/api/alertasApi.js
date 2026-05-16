import api from '../http/apiClient';

export const getAlertas = (params = {}) =>
  api.get('/alertas', { params }).then((res) => res.data);

export const getResumoAlertas = () =>
  api.get('/alertas/resumo').then((res) => res.data);

export const updateStatusAlerta = (alertaId, status) =>
  api.put(`/alertas/${alertaId}/status`, { status }).then((res) => res.data);

export const dismissAlerta = (alertaId) =>
  updateStatusAlerta(alertaId, 'Visto');

export const marcarTodosAlertasComoVistos = () =>
  api.post('/alertas/marcar-todos-vistos').then((res) => res.data);

export const getHistoricoAlertas = (params = {}) =>
  api.get('/alertas/historico', { params }).then((res) => res.data);

// Feedback do usuário sobre uma recomendação inteligente.
// util: true (👍) | false (👎); comentario opcional (default null).
export const enviarFeedbackAlerta = (alertaId, { util, comentario = null }) =>
  api
    .post(`/alertas/${alertaId}/feedback`, { util, comentario })
    .then((res) => res.data);
