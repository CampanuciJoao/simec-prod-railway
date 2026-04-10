import api from '../http/apiClient';

export const getDashboardData = () =>
  api.get('/dashboard-data').then((res) => res.data);