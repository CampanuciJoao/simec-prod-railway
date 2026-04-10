import api from '../http/apiClient';

export const getUsuarios = () =>
  api.get('/users').then((res) => res.data);

export const criarUsuario = (dadosUsuario) =>
  api.post('/users', dadosUsuario).then((res) => res.data);

export const updateUsuario = (id, dadosUsuario) =>
  api.put(`/users/${id}`, dadosUsuario).then((res) => res.data);

export const deletarUsuario = (id) =>
  api.delete(`/users/${id}`).then((res) => res.data);