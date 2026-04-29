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
import { normalizarParaExibicao as normalizarTexto } from '../../shared/textUtils.js';

function capitalizar(texto) {
  const str = String(texto || '').toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 🟢 TÍTULOS
 */
function resolverAlvoContrato(contrato) {
  if (contrato?.fornecedor) return contrato.fornecedor;
  return `Nº ${contrato?.numeroContrato || 'S/N'}`;
}

export function montarTituloContratoVencido(contrato) {
  return `Contrato ${resolverAlvoContrato(contrato)} vencido`;
}

export function montarTituloContratoVence(contrato, texto) {
  return `Contrato ${resolverAlvoContrato(contrato)} vence ${texto}`;
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