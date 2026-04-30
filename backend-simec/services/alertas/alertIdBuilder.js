/**
 * Constrói um ID de alerta único e determinístico.
 * Centralizado para evitar duplicação nos módulos de seguro, contrato e manutenção.
 */
export function buildAlertId(tenantId, tipo, entityId, label = '') {
  const safeTenant = String(tenantId).trim();
  const safeTipo   = String(tipo).trim().toLowerCase();
  const safeId     = String(entityId).trim();
  const safeLabel  = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}
