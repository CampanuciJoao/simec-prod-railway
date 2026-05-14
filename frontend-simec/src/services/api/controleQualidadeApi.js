import api from '../http/apiClient';

// Tipos (catalogo)
export const getTiposTeste = (params = {}) =>
  api.get('/controle-qualidade/tipos', { params }).then((r) => r.data);

export const createTipoTeste = (data) =>
  api.post('/controle-qualidade/tipos', data).then((r) => r.data);

export const updateTipoTeste = (id, data) =>
  api.put(`/controle-qualidade/tipos/${id}`, data).then((r) => r.data);

// Dashboard
export const getDashboardCq = () =>
  api.get('/controle-qualidade/dashboard').then((r) => r.data);

// Programa
export const ativarProgramaCq = (equipamentoId, codigos = null) =>
  api
    .post(`/controle-qualidade/equipamento/${equipamentoId}/programa`,
      codigos ? { codigos } : {})
    .then((r) => r.data);

// Testes
export const listarTestesCq = (params = {}) =>
  api.get('/controle-qualidade/testes', { params }).then((r) => r.data);

export const listarTestesPorEquipamento = (equipamentoId) =>
  api
    .get(`/controle-qualidade/testes/equipamento/${equipamentoId}`)
    .then((r) => r.data);

export const obterTesteCq = (id) =>
  api.get(`/controle-qualidade/testes/${id}`).then((r) => r.data);

export const criarTesteCq = (data) =>
  api.post('/controle-qualidade/testes', data).then((r) => r.data);

export const atualizarTesteCq = (id, data) =>
  api.put(`/controle-qualidade/testes/${id}`, data).then((r) => r.data);

// Soft delete com justificativa obrigatoria
export const excluirTesteCq = (id, motivoExclusao) =>
  api
    .delete(`/controle-qualidade/testes/${id}`, { data: { motivoExclusao } })
    .then((r) => r.data);

export const restaurarTesteCq = (id) =>
  api.post(`/controle-qualidade/testes/${id}/restaurar`).then((r) => r.data);

// Pendencias
export const atualizarPendenciaCq = (testeId, indice, payload) =>
  api
    .patch(`/controle-qualidade/testes/${testeId}/pendencias/${indice}`, payload)
    .then((r) => r.data);

export const adicionarPendenciaCq = (testeId, descricao) =>
  api
    .post(`/controle-qualidade/testes/${testeId}/pendencias`, { descricao })
    .then((r) => r.data);

// Anexos
export const uploadAnexoTesteCq = (testeId, formData) =>
  api
    .post(`/controle-qualidade/testes/${testeId}/anexos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const deleteAnexoTesteCq = (testeId, anexoId) =>
  api
    .delete(`/controle-qualidade/testes/${testeId}/anexos/${anexoId}`)
    .then((r) => r.data);
