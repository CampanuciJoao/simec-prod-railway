import api from '../http/apiClient';

export const getManutencoes = (params = {}) =>
  api.get('/manutencoes', { params }).then((res) => res.data);

export const getManutencaoById = (id) =>
  api.get(`/manutencoes/${id}`).then((res) => res.data);

export const addManutencao = (manutencaoData) =>
  api.post('/manutencoes', manutencaoData).then((res) => res.data);

export const updateManutencao = (id, manutencaoData) =>
  api.put(`/manutencoes/${id}`, manutencaoData).then((res) => res.data);

export const deleteManutencao = (id) =>
  api.delete(`/manutencoes/${id}`).then((res) => res.data);

export const concluirManutencao = (id, data) =>
  api.post(`/manutencoes/${id}/concluir`, data).then((res) => res.data);

export const cancelarManutencao = (id, data) =>
  api.post(`/manutencoes/${id}/cancelar`, data).then((res) => res.data);

export const uploadAnexoManutencao = (manutencaoId, formData) =>
  api.post(`/manutencoes/${manutencaoId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteAnexoManutencao = (manutencaoId, anexoId) =>
  api.delete(`/manutencoes/${manutencaoId}/anexos/${anexoId}`).then((res) => res.data);

export const addNotaAndamento = (manutencaoId, notaData) =>
  api.post(`/manutencoes/${manutencaoId}/notas`, notaData).then((res) => res.data);