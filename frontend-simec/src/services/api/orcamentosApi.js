import api from '../http/apiClient';

export const getOrcamentos = (params = {}) =>
  api.get('/orcamentos', { params }).then((r) => r.data);

export const getOrcamentoMetricas = () =>
  api.get('/orcamentos/metricas').then((r) => r.data);

export const getOrcamentoById = (id) =>
  api.get(`/orcamentos/${id}`).then((r) => r.data);

export const createOrcamento = (data) =>
  api.post('/orcamentos', data).then((r) => r.data);

export const updateOrcamento = (id, data) =>
  api.put(`/orcamentos/${id}`, data).then((r) => r.data);

export const deleteOrcamento = (id) =>
  api.delete(`/orcamentos/${id}`).then((r) => r.data);

export const enviarParaAprovacao = (id) =>
  api.post(`/orcamentos/${id}/enviar-aprovacao`).then((r) => r.data);

export const aprovarOrcamento = (id, fornecedorAprovadoId = null) =>
  api.post(`/orcamentos/${id}/aprovar`, { fornecedorAprovadoId }).then((r) => r.data);

export const rejeitarOrcamento = (id, motivoRejeicao) =>
  api.post(`/orcamentos/${id}/rejeitar`, { motivoRejeicao }).then((r) => r.data);

export const getPdfOrcamentoUrl = (id) => `/api/pdfs/orcamento/${id}`;
