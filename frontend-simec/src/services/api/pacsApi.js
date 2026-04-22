import api from '../http/apiClient';

export const getPacsConnections = () =>
  api.get('/tenant/pacs/connections').then((res) => res.data);

export const createPacsConnection = (payload) =>
  api.post('/tenant/pacs/connections', payload).then((res) => res.data);

export const updatePacsConnection = (id, payload) =>
  api.put(`/tenant/pacs/connections/${id}`, payload).then((res) => res.data);

export const testPacsConnection = (id) =>
  api.post(`/tenant/pacs/connections/${id}/test`).then((res) => res.data);

export const getPacsHealth = () =>
  api.get('/tenant/pacs/health').then((res) => res.data);

export const getPacsRuns = () =>
  api.get('/tenant/pacs/runs').then((res) => res.data);

export const syncPacsTenant = (payload = {}) =>
  api.post('/tenant/pacs/sync', payload).then((res) => res.data);

export const getPacsFeaturesByEquipamento = (equipamentoId) =>
  api
    .get(`/tenant/pacs/equipamentos/${equipamentoId}/features`)
    .then((res) => res.data);

export const getPacsPredictionByEquipamento = (equipamentoId) =>
  api
    .get(`/tenant/pacs/equipamentos/${equipamentoId}/prediction`)
    .then((res) => res.data);
