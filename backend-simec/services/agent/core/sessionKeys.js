export function getSessionKey(usuarioId, tenantId) {
  return `${tenantId}:${usuarioId}`;
}