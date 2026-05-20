import api from '../http/apiClient';

export async function getSaudeSistema() {
  const res = await api.get('/superadmin/saude');
  return res?.data ?? null;
}
