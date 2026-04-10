import api from '../http/apiClient';

export const gerarRelatorio = (filtros) =>
  api.post('/relatorios/gerar', filtros).then((res) => res.data);