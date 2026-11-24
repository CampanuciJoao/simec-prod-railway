import api from '../http/apiClient';

// ─── Listagens ──────────────────────────────────────────────────────────────
export const getLembretes = (params = {}) =>
  api.get('/lembretes', { params }).then((r) => r.data);

export const getBadgeLembretes = () =>
  api.get('/lembretes/badge').then((r) => r.data);

export const getUsuariosTenant = () =>
  api.get('/lembretes/usuarios').then((r) => r.data);

// ─── CRUD ───────────────────────────────────────────────────────────────────
export const criarLembrete = (payload) =>
  api.post('/lembretes', payload).then((r) => r.data);

export const atualizarLembrete = (id, patch) =>
  api.patch(`/lembretes/${id}`, patch).then((r) => r.data);

export const excluirLembrete = (id) =>
  api.delete(`/lembretes/${id}`).then((r) => r.data);

// ─── Acoes rapidas ──────────────────────────────────────────────────────────
export const concluirLembrete = (id) =>
  api.post(`/lembretes/${id}/concluir`).then((r) => r.data);

export const descartarLembrete = (id) =>
  api.post(`/lembretes/${id}/descartar`).then((r) => r.data);

export const marcarLembreteLido = (id) =>
  api.post(`/lembretes/${id}/lido`).then((r) => r.data);

export const marcarTodosLembretesLidos = () =>
  api.post('/lembretes/marcar-todos-lidos').then((r) => r.data);
