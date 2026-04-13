export function buildSeguroAlertId(tenantId, tipo, seguroId, label = '') {
  return `tenant-${tenantId}-${tipo}-${seguroId}${label ? `-${label}` : ''}`;
}

export function montarTituloSeguroVencido() {
  return 'Seguro vencido';
}

export function montarSubtituloSeguro(seguro) {
  return `Apólice Nº ${seguro.apoliceNumero}`;
}

export function montarTituloSeguroVence(texto) {
  return `Seguro vence ${texto}`;
}