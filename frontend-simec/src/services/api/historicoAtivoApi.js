import api from '../http/apiClient';

export const getHistoricoAtivoByEquipamento = (id, params = {}) =>
  api.get(`/equipamentos/${id}/historico`, { params }).then((res) => res.data);

export const exportHistoricoAtivoByEquipamento = (id, params = {}) =>
  api.get(`/equipamentos/${id}/historico/exportar`, { params }).then((res) => res.data);
