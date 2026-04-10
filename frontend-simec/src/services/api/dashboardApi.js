import api from '../http/apiClient';

export const getDashboardData = async () => {
  const response = await api.get('/dashboard-data');
  return response.data;
};