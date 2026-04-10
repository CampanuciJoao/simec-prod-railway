import api from '../http/apiClient';

export const getAlertas = () =>
  api.get('/alertas').then((res) => res.data);

export const updateAlertaStatus = (alertaId, status) =>
  api.put(`/alertas/${alertaId}/status`, { status }).then((res) => res.data);