import api from '../http/apiClient';

export const getSeguros = (params = {}) =>
  api.get('/seguros', { params }).then((res) => res.data);

export const getSeguroById = (id) =>
  api.get(`/seguros/${id}`).then((res) => res.data);

export const addSeguro = (seguroData) =>
  api.post('/seguros', seguroData).then((res) => res.data);

export const updateSeguro = (id, seguroData) =>
  api.put(`/seguros/${id}`, seguroData).then((res) => res.data);

export const deleteSeguro = (id) =>
  api.delete(`/seguros/${id}`).then((res) => res.data);

export const uploadAnexoSeguro = (seguroId, formData) =>
  api.post(`/seguros/${seguroId}/anexos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteAnexoSeguro = (seguroId, anexoId) =>
  api.delete(`/seguros/${seguroId}/anexos/${anexoId}`).then((res) => res.data);

export const renovarSeguro = (id, seguroData) =>
  api.post(`/seguros/${id}/renovar`, seguroData).then((res) => res.data);

export const cancelarSeguro = (id, motivo) =>
  api.post(`/seguros/${id}/cancelar`, { motivo }).then((res) => res.data);

export const getSeguroHistorico = (id) =>
  api.get(`/seguros/${id}/historico`).then((res) => res.data);

export const extrairApolicePdf = (file, password = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (password) formData.append('password', password);

  return api
    .post('/seguros/extrair-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // LLM pode levar até 30-40s
    })
    .then((res) => res.data);
};