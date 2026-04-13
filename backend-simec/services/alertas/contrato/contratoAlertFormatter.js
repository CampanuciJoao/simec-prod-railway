export function buildContratoAlertId(tenantId, tipo, contratoId, label = '') {
  return `tenant-${tenantId}-${tipo}-${contratoId}${label ? `-${label}` : ''}`;
}

export function montarTituloContratoVencido() {
  return 'Contrato vencido';
}

export function montarTituloContratoVence(texto) {
  return `Contrato vence ${texto}`;
}

export function montarSubtituloContrato(contrato) {
  const numero = contrato.numeroContrato || 'S/N';
  const fornecedor = contrato.fornecedor || 'Fornecedor não informado';
  return `Contrato Nº ${numero} | ${fornecedor}`;
}