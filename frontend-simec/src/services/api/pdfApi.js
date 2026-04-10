import api from '../http/apiClient';

export const getPdfDataManutencao = (manutencaoId) =>
  api.get(`/pdf-data/manutencao/${manutencaoId}`).then((res) => res.data);

export const getPdfDataRelatorio = (ids = []) =>
  api.post('/pdf-data/relatorio', { ids }).then((res) => res.data);