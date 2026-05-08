import api from '../http/apiClient';

export const getGehcStatus = () =>
  api.get('/gehc/status').then((res) => res.data);

export const getGehcResumoEquipamento = (equipamentoId) =>
  api.get(`/gehc/equipamento/${equipamentoId}/resumo`).then((res) => res.data);

export const getGehcSnapshots = (equipamentoId, dias = 30) =>
  api.get(`/gehc/equipamento/${equipamentoId}/snapshots`, { params: { dias } }).then((res) => res.data);

export const getGehcContrato = (equipamentoId) =>
  api.get(`/gehc/equipamento/${equipamentoId}/contrato`).then((res) => res.data);

export const getGehcOS = (equipamentoId, limite = 50) =>
  api.get(`/gehc/equipamento/${equipamentoId}/os`, { params: { limite } }).then((res) => res.data);

export const getGehcUtilizacao = (equipamentoId, meses = 12) =>
  api.get(`/gehc/equipamento/${equipamentoId}/utilizacao`, { params: { meses } }).then((res) => res.data);

export const getGehcHistoricoGrafico = (equipamentoId, { inicio, fim } = {}) =>
  api.get(`/gehc/equipamento/${equipamentoId}/historico/grafico`, { params: { inicio, fim } }).then((r) => r.data);

export const getGehcHistorico = (equipamentoId, { inicio, fim, pagina = 1, limite = 50 } = {}) =>
  api.get(`/gehc/equipamento/${equipamentoId}/historico`, { params: { inicio, fim, pagina, limite } }).then((r) => r.data);

export const postGehcDiscovery = () =>
  api.post('/gehc/discovery').then((res) => res.data);

export const postGehcSync = () =>
  api.post('/gehc/sync').then((res) => res.data);

export const postGehcMonitor = () =>
  api.post('/gehc/monitor').then((res) => res.data);

export const putVincularEquipamento = (equipamentoId, gehcAssetId) =>
  api.put(`/gehc/equipamento/${equipamentoId}/vincular`, { gehcAssetId }).then((res) => res.data);

export const deleteDesvincularEquipamento = (equipamentoId) =>
  api.delete(`/gehc/equipamento/${equipamentoId}/vincular`).then((res) => res.data);

export const postGehcCredenciais = (login, password) =>
  api.post('/gehc/credenciais', { login, password }).then((res) => res.data);

export const deleteGehcCredenciais = () =>
  api.delete('/gehc/credenciais').then((res) => res.data);

export const getGehcSuspensoes = () =>
  api.get('/gehc/alertas/suspensoes').then((res) => res.data);

export const postGehcSuspensao = (dados) =>
  api.post('/gehc/alertas/suspensoes', dados).then((res) => res.data);

export const deleteGehcSuspensao = (id) =>
  api.delete(`/gehc/alertas/suspensoes/${id}`).then((res) => res.data);
