import api from '../http/apiClient';

export const getUnidades = () =>
  api.get('/unidades').then((res) => res.data);

export const getUnidadeById = (id) =>
  api.get(`/unidades/${id}`).then((res) => res.data);

export const addUnidade = (unidadeData) =>
  api.post('/unidades', unidadeData).then((res) => res.data);

export const updateUnidade = (id, unidadeData) =>
  api.put(`/unidades/${id}`, unidadeData).then((res) => res.data);

export const deleteUnidade = (id) =>
  api.delete(`/unidades/${id}`).then((res) => res.data);

export const uploadAnexoUnidade = (unidadeId, formData) =>
  api.post(`/unidades/${unidadeId}/anexos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteAnexoUnidade = (unidadeId, anexoId) =>
  api.delete(`/unidades/${unidadeId}/anexos/${anexoId}`).then((res) => res.data);