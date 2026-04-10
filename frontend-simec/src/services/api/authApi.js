import api from '../http/apiClient';

export const loginUsuario = (credenciais) =>
  api.post('/auth/login', credenciais).then((res) => res.data);

export const registrarUsuario = (dadosUsuario) =>
  api.post('/auth/register', dadosUsuario).then((res) => res.data);