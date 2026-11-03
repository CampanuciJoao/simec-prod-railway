import api from '../http/apiClient';

export const getFoxessSites = () =>
  api.get('/foxess/sites').then((r) => r.data);

export const getFoxessSiteStatus = (siteId) =>
  api.get(`/foxess/sites/${siteId}/status`).then((r) => r.data);

export const getFoxessHistorico = (siteId, { inicio, fim } = {}) =>
  api.get(`/foxess/sites/${siteId}/historico`, { params: { inicio, fim } }).then((r) => r.data);

export const getFoxessQuedas = (siteId, { limite = 50 } = {}) =>
  api.get(`/foxess/sites/${siteId}/quedas`, { params: { limite } }).then((r) => r.data);

export const getFoxessSiteDaUnidade = (unidadeId) =>
  api.get(`/foxess/unidade/${unidadeId}/site`).then((r) => r.data);

// Admin
export const salvarFoxessSite = (payload) =>
  api.post('/foxess/sites', payload).then((r) => r.data);

export const validarFoxessApiKey = (payload) =>
  api.post('/foxess/sites/validar', payload).then((r) => r.data);

export const desativarFoxessSite = (siteId) =>
  api.delete(`/foxess/sites/${siteId}`).then((r) => r.data);
