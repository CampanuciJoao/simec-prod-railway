import api from '../http/apiClient';

export const loginUsuario = (credenciais) =>
  api.post('/auth/login', credenciais).then((res) => res.data);

export const forgotPassword = (payload) =>
  api.post('/auth/forgot-password', payload).then((res) => res.data);

export const resetPassword = (payload) =>
  api.post('/auth/reset-password', payload).then((res) => res.data);

export const refreshSessao = (axiosClient = api) =>
  axiosClient.post('/auth/refresh').then((res) => res.data);

export const logoutUsuario = (axiosClient = api) =>
  axiosClient.post('/auth/logout').then((res) => res.data);
