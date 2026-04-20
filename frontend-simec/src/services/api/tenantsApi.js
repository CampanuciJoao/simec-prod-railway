import api from '../http/apiClient';

export const listarTenants = () =>
  api.get('/superadmin/tenants').then((res) => res.data);

export const detalharTenant = (id) =>
  api.get(`/superadmin/tenants/${id}`).then((res) => res.data);

export const criarTenant = (payload) =>
  api.post('/superadmin/tenants', payload).then((res) => res.data);

export const atualizarTenant = (id, payload) =>
  api.put(`/superadmin/tenants/${id}`, payload).then((res) => res.data);

export const alterarStatusTenant = (id, ativo) =>
  api.post(`/superadmin/tenants/${id}/status`, { ativo }).then((res) => res.data);

export const bootstrapAdminTenant = (id, payload) =>
  api
    .post(`/superadmin/tenants/${id}/bootstrap-admin`, payload)
    .then((res) => res.data);
