import api from '../http/apiClient';

export const loginUsuario = (credenciais) =>
  api.post('/auth/login', credenciais).then((res) => res.data);
