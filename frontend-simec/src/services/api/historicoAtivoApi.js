import api from '../http/apiClient';

export const getHistoricoAtivoByEquipamento = (id) =>
  api.get(`/equipamentos/${id}/historico`).then((res) => res.data);
