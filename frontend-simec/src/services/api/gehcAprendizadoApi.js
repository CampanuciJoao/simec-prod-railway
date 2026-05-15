// Cliente HTTP para os endpoints da sub-aba "Aprendizado da IA".
// Espelha as rotas em backend-simec/routes/gehcAprendizadoRoutes.js.

import api from '../http/apiClient';

export const getAprendizadoStatus = () =>
  api.get('/gehc/aprendizado/status').then((r) => r.data);

export const getAprendizadoEquipamentos = () =>
  api.get('/gehc/aprendizado/equipamentos').then((r) => r.data);

export const getAprendizadoCausas = () =>
  api.get('/gehc/aprendizado/causas').then((r) => r.data);

export const getAprendizadoInsights = () =>
  api.get('/gehc/aprendizado/insights').then((r) => r.data);

export const patchInsightFeedback = (id, util) =>
  api.patch(`/gehc/aprendizado/insights/${id}/feedback`, { util }).then((r) => r.data);

export const patchInsightResolver = (id) =>
  api.patch(`/gehc/aprendizado/insights/${id}/resolver`).then((r) => r.data);

export const patchInsightDescartar = (id) =>
  api.patch(`/gehc/aprendizado/insights/${id}/descartar`).then((r) => r.data);

export const postLimparTodosInsights = (motivo) =>
  api.post('/gehc/aprendizado/insights/limpar-todos', { motivo }).then((r) => r.data);

export const postDescartarTodosInsights = (motivo) =>
  api.post('/gehc/aprendizado/insights/descartar-todos', { motivo }).then((r) => r.data);

export const postResetarExtracoes = (motivo) =>
  api.post('/gehc/aprendizado/extracoes/resetar', { motivo }).then((r) => r.data);

export const getExtracoesDiagnostico = () =>
  api.get('/gehc/aprendizado/extracoes/diagnostico').then((r) => r.data);

export const getCausaDetalhe = (categoria) =>
  api.get(`/gehc/aprendizado/causas/${encodeURIComponent(categoria)}`).then((r) => r.data);

export const postIaAsk = ({ pergunta, equipamentoId }) =>
  api.post('/gehc/aprendizado/ia/ask', { pergunta, equipamentoId }).then((r) => r.data);

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

export const postDispararPipeline = (pipeline) =>
  api.post(`/gehc/aprendizado/pipelines/${pipeline}/disparar`).then((r) => r.data);

// Polling do estado do job enquanto o botao "Rodar agora" mostra spinner.
// Retorna { executando, waiting, active, delayed } — quando executando=false
// o job terminou (ou nunca chegou na fila) e o botao pode ser liberado.
export const getJobStatus = (pipeline) =>
  api.get(`/gehc/aprendizado/pipelines/${pipeline}/job-status`).then((r) => r.data);

// URL absoluta do PDF servido pelo backend (stream do R2).
// Usar em <a href={...}> para abrir em nova aba ou baixar.
export const urlPdfDocumento = (documentId) =>
  `/api/gehc/aprendizado/pdf/${encodeURIComponent(documentId)}`;
