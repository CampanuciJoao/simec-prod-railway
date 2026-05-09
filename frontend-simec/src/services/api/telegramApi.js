import api from '../http/apiClient';

export const getTelegramStatus = () =>
  api.get('/telegram/status').then((res) => res.data);

export const getTelegramDestinatarios = () =>
  api.get('/telegram/destinatarios').then((res) => res.data);

export const addTelegramDestinatario = (data) =>
  api.post('/telegram/destinatarios', data).then((res) => res.data);

export const updateTelegramDestinatario = (id, data) =>
  api.put(`/telegram/destinatarios/${id}`, data).then((res) => res.data);

export const deleteTelegramDestinatario = (id) =>
  api.delete(`/telegram/destinatarios/${id}`).then((res) => res.data);

export const gerarTelegramToken = () =>
  api.post('/telegram/gerar-token').then((res) => res.data);
