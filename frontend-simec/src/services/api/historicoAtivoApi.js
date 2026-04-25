import api from '../http/apiClient';

export const getHistoricoAtivoByEquipamento = (id, params = {}) =>
  api.get(`/equipamentos/${id}/historico`, { params }).then((res) => res.data);

export const exportHistoricoAtivoByEquipamento = (id, params = {}) =>
  api.get(`/equipamentos/${id}/historico/exportar`, { params }).then((res) => res.data);

export const updateHistoricoEvento = (equipamentoId, eventoId, data) =>
  api.patch(`/equipamentos/${equipamentoId}/historico/${eventoId}`, data).then((res) => res.data);

export const deleteHistoricoEvento = (equipamentoId, eventoId) =>
  api.delete(`/equipamentos/${equipamentoId}/historico/${eventoId}`).then((res) => res.data);
