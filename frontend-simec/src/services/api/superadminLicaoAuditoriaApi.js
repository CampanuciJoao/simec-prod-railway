// G3: endpoints de auditoria de licoes IA cross-tenant — SuperAdmin Tenant System.

import api from '../http/apiClient';

export async function obterResumoAuditoria() {
  const res = await api.get('/superadmin/licao-auditoria/resumo');
  return res?.data ?? null;
}

export async function listarLicoesQuarentena(params = {}) {
  const res = await api.get('/superadmin/licao-auditoria/quarentena', { params });
  return res?.data ?? { items: [], total: 0 };
}

export async function decidirSobreLicao(licaoId, decisao) {
  const res = await api.post(`/superadmin/licao-auditoria/${licaoId}/decisao`, { decisao });
  return res?.data ?? null;
}

export async function executarAuditoriaAgora(limite = 500) {
  const res = await api.post('/superadmin/licao-auditoria/executar-auditoria', { limite });
  return res?.data ?? null;
}
