export function buildContratoAlertId(tenantId, tipo, contratoId, label = '') {
  const safeTenant = String(tenantId).trim();
  const safeTipo = String(tipo).trim().toLowerCase();
  const safeId = String(contratoId).trim();
  const safeLabel = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}

/**
 * 🔧 Helpers
 */
function normalizarTexto(valor, fallback = 'N/A') {
  return String(valor || fallback).trim();
}

function capitalizar(texto) {
  const str = String(texto || '').toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 🟢 TÍTULOS
 */
export function montarTituloContratoVencido() {
  return 'Contrato vencido';
}

export function montarTituloContratoVence(texto) {
  return `Contrato vence ${texto}`;
}

/**
 * 🟡 SUBTÍTULO
 */
export function montarSubtituloContrato(contrato) {
  const numero = normalizarTexto(contrato?.numeroContrato, 'S/N');
  const fornecedor = normalizarTexto(
    contrato?.fornecedor,
    'Fornecedor não informado'
  );

  return `Contrato Nº ${numero} • ${fornecedor}`;
}