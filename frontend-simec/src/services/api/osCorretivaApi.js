import api from '../http/apiClient';

export const getOsCorretivas = (params = {}) =>
  api.get('/os-corretiva', { params }).then((res) => res.data);

export const getOsCorretivaById = (id) =>
  api.get(`/os-corretiva/${id}`).then((res) => res.data);

export const criarOsCorretiva = (data) =>
  api.post('/os-corretiva', data).then((res) => res.data);

export const adicionarNota = (id, data) =>
  api.post(`/os-corretiva/${id}/notas`, data).then((res) => res.data);

export const agendarVisita = (id, data) =>
  api.post(`/os-corretiva/${id}/visitas`, data).then((res) => res.data);

export const registrarResultadoVisita = (id, visitaId, data) =>
  api.post(`/os-corretiva/${id}/visitas/${visitaId}/resultado`, data).then((res) => res.data);

export const concluirOsCorretiva = (id, data) =>
  api.post(`/os-corretiva/${id}/concluir`, data).then((res) => res.data);

export const excluirOsCorretiva = (id) =>
  api.delete(`/os-corretiva/${id}`).then((res) => res.data);

export const downloadPdfOsCorretiva = (id) =>
  api.get(`/pdfs/os-corretiva/${id}`, { responseType: 'blob' });
