import api from '../http/apiClient';

export const getEquipamentos = (filtros = {}) =>
  api.get('/equipamentos', { params: filtros }).then((res) => res.data);

export const getEquipamentoById = (id) =>
  api.get(`/equipamentos/${id}`).then((res) => res.data);

export const addEquipamento = (equipamentoData) =>
  api.post('/equipamentos', equipamentoData).then((res) => res.data);

export const updateEquipamento = (id, equipamentoData) =>
  api.put(`/equipamentos/${id}`, equipamentoData).then((res) => res.data);

export const deleteEquipamento = (id) =>
  api.delete(`/equipamentos/${id}`).then((res) => res.data);

export const uploadAnexoEquipamento = (equipamentoId, formData) =>
  api.post(`/equipamentos/${equipamentoId}/anexos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteAnexoEquipamento = (equipamentoId, anexoId) =>
  api.delete(`/equipamentos/${equipamentoId}/anexos/${anexoId}`).then((res) => res.data);

export const getAcessoriosPorEquipamento = (equipamentoId) =>
  api.get(`/equipamentos/${equipamentoId}/acessorios`).then((res) => res.data);

export const addAcessorio = (equipamentoId, acessorioData) =>
  api.post(`/equipamentos/${equipamentoId}/acessorios`, acessorioData).then((res) => res.data);

export const updateAcessorio = (equipamentoId, acessorioId, acessorioData) =>
  api.put(`/equipamentos/${equipamentoId}/acessorios/${acessorioId}`, acessorioData).then((res) => res.data);

export const deleteAcessorio = (equipamentoId, acessorioId) =>
  api.delete(`/equipamentos/${equipamentoId}/acessorios/${acessorioId}`).then((res) => res.data);