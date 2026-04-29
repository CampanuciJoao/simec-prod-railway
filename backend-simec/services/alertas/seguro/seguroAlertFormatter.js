export function buildSeguroAlertId(tenantId, tipo, seguroId, label = '') {
  // 🔥 padroniza e evita problemas com caracteres
  const safeTenant = String(tenantId).trim();
  const safeTipo = String(tipo).trim().toLowerCase();
  const safeId = String(seguroId).trim();
  const safeLabel = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}

function resolverAlvoSeguro(seguro) {
  if (seguro?.unidade?.nomeSistema) return `unidade "${seguro.unidade.nomeSistema}"`;
  if (seguro?.equipamento?.modelo) return `equipamento "${seguro.equipamento.modelo}"`;
  return `apólice ${seguro?.apoliceNumero || 'S/N'}`;
}

export function montarTituloSeguroVencido(seguro) {
  return `Seguro da ${resolverAlvoSeguro(seguro)} vencido`;
}

export function montarSubtituloSeguro(seguro) {
  const apolice = seguro?.apoliceNumero || 'N/A';
  return `Apólice Nº ${apolice}`;
}

export function montarTituloSeguroVence(seguro, texto) {
  return `Seguro da ${resolverAlvoSeguro(seguro)} vence ${texto}`;
}