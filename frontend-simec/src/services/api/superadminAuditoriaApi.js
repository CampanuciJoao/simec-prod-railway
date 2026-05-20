import api from '../http/apiClient';

export async function listarLogAdmin(params = {}) {
  const res = await api.get('/superadmin/auditoria/admin', { params });
  return res?.data ?? { items: [], total: 0, page: 1, pageSize: 25 };
}

export async function listarImpersonacoes(params = {}) {
  const res = await api.get('/superadmin/auditoria/impersonacoes', { params });
  return res?.data ?? { items: [], total: 0, page: 1, pageSize: 25 };
}
