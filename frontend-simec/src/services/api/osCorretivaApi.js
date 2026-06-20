import api from '../http/apiClient';

export const getOsCorretivas = (params = {}) =>
  api.get('/os-corretiva', { params }).then((res) => res.data);

export const getOsCorretivaById = (id) =>
  api.get(`/os-corretiva/${id}`).then((res) => res.data);

export const criarOsCorretiva = (data) =>
  api.post('/os-corretiva', data).then((res) => res.data);

export const adicionarNota = (id, data) =>
  api.post(`/os-corretiva/${id}/notas`, data).then((res) => res.data);

// Edição admin: payload pode ter { nota?, data? } (ISO string em data).
export const editarNotaOsCorretiva = (id, notaId, data) =>
  api.patch(`/os-corretiva/${id}/notas/${notaId}`, data).then((res) => res.data);

// Edição admin do descritivo original. data = { descricaoProblema, motivo }
// (motivo obrigatorio pra rastreabilidade em LogAuditoria).
export const editarDescricaoOsCorretiva = (id, data) =>
  api.patch(`/os-corretiva/${id}/descricao`, data).then((res) => res.data);

export const agendarVisita = (id, data) =>
  api.post(`/os-corretiva/${id}/visitas`, data).then((res) => res.data);

// Reagendar visita Agendada. data = { prestadorNome?, dataHoraInicioPrevista,
// dataHoraFimPrevista, motivo }. Marca a antiga como Reagendada e cria
// uma nova Agendada (mantem OS em AguardandoTerceiro).
export const reagendarVisita = (id, visitaId, data) =>
  api.patch(`/os-corretiva/${id}/visitas/${visitaId}/reagendar`, data).then((res) => res.data);

export const iniciarVisita = (id, visitaId) =>
  api.post(`/os-corretiva/${id}/visitas/${visitaId}/iniciar`).then((res) => res.data);

export const registrarResultadoVisita = (id, visitaId, data) =>
  api.post(`/os-corretiva/${id}/visitas/${visitaId}/resultado`, data).then((res) => res.data);

export const concluirOsCorretiva = (id, data) =>
  api.post(`/os-corretiva/${id}/concluir`, data).then((res) => res.data);

export const cancelarOsCorretiva = (id, motivoCancelamento) =>
  api.post(`/os-corretiva/${id}/cancelar`, { motivoCancelamento }).then((res) => res.data);

export const moverOsCorretivaEquipamento = (id, { novoEquipamentoId, motivo }) =>
  api.patch(`/os-corretiva/${id}/equipamento`, { novoEquipamentoId, motivo }).then((res) => res.data);

export const excluirOsCorretiva = (id) =>
  api.delete(`/os-corretiva/${id}`).then((res) => res.data);

export const downloadPdfOsCorretiva = (id) =>
  api.get(`/pdfs/os-corretiva/${id}`, { responseType: 'blob' });

// Anexos: aceita FormData (campo 'file' multivalorado, pra suportar drop
// de multiplos arquivos). Funciona inclusive em OS Concluida/Cancelada.
export const uploadAnexosOsCorretiva = (id, formData) =>
  api
    .post(`/os-corretiva/${id}/anexos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

export const removerAnexoOsCorretiva = (id, anexoId) =>
  api.delete(`/os-corretiva/${id}/anexos/${anexoId}`).then((res) => res.data);

export const getHistoricoOsCorretiva = (id) =>
  api.get(`/os-corretiva/${id}/historico`).then((res) => res.data);
