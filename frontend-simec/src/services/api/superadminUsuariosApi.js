import api from '../http/apiClient';

export async function listarUsuariosCrossTenant(params = {}) {
  const res = await api.get('/superadmin/usuarios', { params });
  return res?.data ?? { items: [], total: 0, page: 1, pageSize: 25 };
}

export async function listarTenantsParaFiltro() {
  const res = await api.get('/superadmin/usuarios/_tenants');
  return res?.data?.items ?? [];
}

export async function resetarSenhaUsuario(id) {
  const res = await api.post(`/superadmin/usuarios/${id}/reset-senha`);
  return res?.data ?? null;
}
