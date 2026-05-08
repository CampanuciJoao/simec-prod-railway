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
