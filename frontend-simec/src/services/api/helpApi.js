import api from '../http/apiClient';

export const listarHelpArticles = (params = {}) =>
  api.get('/help/articles', { params }).then((res) => res.data);

export const buscarHelpArticle = (slug) =>
  api.get(`/help/articles/${slug}`).then((res) => res.data);

export const listarHelpArticlesAdmin = () =>
  api.get('/superadmin/help/articles').then((res) => res.data);

export const criarHelpArticle = (payload) =>
  api.post('/superadmin/help/articles', payload).then((res) => res.data);

export const atualizarHelpArticle = (id, payload) =>
  api.put(`/superadmin/help/articles/${id}`, payload).then((res) => res.data);
