import api from '../http/apiClient';

export const getAlertas = (params = {}) =>
  api.get('/alertas', { params }).then((res) => res.data);

export const getResumoAlertas = () =>
  api.get('/alertas/resumo').then((res) => res.data);

export const updateStatusAlerta = (alertaId, status) =>
  api.put(`/alertas/${alertaId}/status`, { status }).then((res) => res.data);

export const dismissAlerta = (alertaId) =>
  updateStatusAlerta(alertaId, 'Visto');

export const getHistoricoAlertas = (params = {}) =>
  api.get('/alertas/historico', { params }).then((res) => res.data);
