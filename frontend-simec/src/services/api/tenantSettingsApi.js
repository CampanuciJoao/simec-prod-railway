import api from '../http/apiClient';

export const getTenantSettings = () =>
  api.get('/tenant/settings').then((res) => res.data);

export const updateTenantSettings = (payload) =>
  api.put('/tenant/settings', payload).then((res) => res.data);
