export function buildSeguroAlertId(tenantId, tipo, seguroId, label = '') {
  // 🔥 padroniza e evita problemas com caracteres
  const safeTenant = String(tenantId).trim();
  const safeTipo = String(tipo).trim().toLowerCase();
  const safeId = String(seguroId).trim();
  const safeLabel = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}

export function montarTituloSeguroVencido() {
  return 'Seguro vencido';
}

export function montarSubtituloSeguro(seguro) {
  // 🔥 evita undefined quebrando UI
  const apolice = seguro?.apoliceNumero || 'N/A';
  return `Apólice Nº ${apolice}`;
}

export function montarTituloSeguroVence(texto) {
  return `Seguro vence ${texto}`;
}