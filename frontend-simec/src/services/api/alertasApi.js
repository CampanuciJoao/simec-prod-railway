import api from '../http/apiClient';

export const getAlertas = () =>
  api.get('/alertas').then((res) => res.data);

export const updateStatusAlerta = (alertaId, status) =>
  api.put(`/alertas/${alertaId}/status`, { status }).then((res) => res.data);

export const dismissAlerta = (alertaId) =>
  updateStatusAlerta(alertaId, 'Visto');
