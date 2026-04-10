import api from '../http/apiClient';

export const getIndicadoresBI = () =>
  api.get('/bi/indicadores').then((res) => res.data);