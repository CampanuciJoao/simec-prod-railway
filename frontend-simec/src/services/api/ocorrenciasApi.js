import api from '../http/apiClient';

export const getOcorrenciasPorEquipamento = (id) =>
  api.get(`/ocorrencias/equipamento/${id}`).then((res) => res.data);

export const addOcorrencia = (dados) =>
  api.post('/ocorrencias', dados).then((res) => res.data);

export const resolverOcorrencia = (id, dados) =>
  api.put(`/ocorrencias/${id}/resolver`, dados).then((res) => res.data);