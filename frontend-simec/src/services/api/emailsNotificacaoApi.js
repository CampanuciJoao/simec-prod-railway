import api from '../http/apiClient';

export const getEmailsNotificacao = () =>
  api.get('/emails-notificacao').then((res) => res.data);

export const addEmailNotificacao = (dadosEmail) =>
  api.post('/emails-notificacao', dadosEmail).then((res) => res.data);

export const updateEmailNotificacao = (id, dadosEmail) =>
  api.put(`/emails-notificacao/${id}`, dadosEmail).then((res) => res.data);

export const deleteEmailNotificacao = (id) =>
  api.delete(`/emails-notificacao/${id}`).then((res) => res.data);