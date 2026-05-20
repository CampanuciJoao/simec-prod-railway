import api from '../http/apiClient';

// Inicia sessão de impersonação. Retorna novo access token + dados do tenant alvo.
export async function iniciarImpersonacao({ tenantId, motivo }) {
  const res = await api.post(`/superadmin/impersonar/${tenantId}`, { motivo });
  return res?.data ?? null;
}

// Encerra a sessão ativa. Retorna token "limpo" sem claims de impersonação.
export async function encerrarImpersonacao() {
  const res = await api.delete('/superadmin/impersonar');
  return res?.data ?? null;
}
