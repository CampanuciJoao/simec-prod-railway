import api from '../http/apiClient';

export const getContratos = (params = {}) =>
  api.get('/contratos', { params }).then((res) => res.data);

export const getContratoById = (id) =>
  api.get(`/contratos/${id}`).then((res) => res.data);

export const addContrato = (contratoData) =>
  api.post('/contratos', contratoData).then((res) => res.data);

export const updateContrato = (id, contratoData) =>
  api.put(`/contratos/${id}`, contratoData).then((res) => res.data);

export const deleteContrato = (id) =>
  api.delete(`/contratos/${id}`).then((res) => res.data);

export const uploadAnexoContrato = (contratoId, formData) =>
  api.post(`/contratos/${contratoId}/anexos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteAnexoContrato = (contratoId, anexoId) =>
  api.delete(`/contratos/${contratoId}/anexos/${anexoId}`).then((res) => res.data);