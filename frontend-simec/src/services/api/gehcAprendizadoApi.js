// Cliente HTTP para os endpoints da sub-aba "Aprendizado da IA".
// Espelha as rotas em backend-simec/routes/gehcAprendizadoRoutes.js.

import api from '../http/apiClient';

export const getAprendizadoStatus = () =>
  api.get('/gehc/aprendizado/status').then((r) => r.data);

export const getAprendizadoEquipamentos = () =>
  api.get('/gehc/aprendizado/equipamentos').then((r) => r.data);

export const getAprendizadoCausas = () =>
  api.get('/gehc/aprendizado/causas').then((r) => r.data);

export const getAprendizadoEquipamentoDetalhes = (equipamentoId) =>
  api.get(`/gehc/aprendizado/equipamentos/${equipamentoId}`).then((r) => r.data);

export const getAprendizadoAtividade = () =>
  api.get('/gehc/aprendizado/atividade').then((r) => r.data);

export const getAprendizadoPipelines = () =>
  api.get('/gehc/aprendizado/pipelines').then((r) => r.data);

export const postPausarPipeline = (pipeline, { motivo, escopo = 'tenant' } = {}) =>
  api.post(`/gehc/aprendizado/pipelines/${pipeline}/pausar`, { motivo, escopo }).then((r) => r.data);

export const postRetomarPipeline = (pipeline, { escopo = 'tenant' } = {}) =>
  api.post(`/gehc/aprendizado/pipelines/${pipeline}/retomar`, { escopo }).then((r) => r.data);

// URL absoluta do PDF servido pelo backend (stream do R2).
// Usar em <a href={...}> para abrir em nova aba ou baixar.
export const urlPdfDocumento = (documentId) =>
  `/api/gehc/aprendizado/pdf/${encodeURIComponent(documentId)}`;
