export { buildAlertId as buildSeguroAlertId } from '../alertIdBuilder.js';

function resolverAlvoSeguro(seguro) {
  if (seguro?.unidade?.nomeSistema) return `unidade ${seguro.unidade.nomeSistema}`;
  if (seguro?.equipamento?.modelo) return `equipamento ${seguro.equipamento.modelo}`;
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

export function montarTituloSeguroConflito(seguro) {
  return `Conflito de cobertura na ${resolverAlvoSeguro(seguro)}`;
}

export function montarSubtituloSeguroConflito(seguroA, seguroB) {
  const a = seguroA?.apoliceNumero || 'S/N';
  const b = seguroB?.apoliceNumero || 'S/N';
  return `Apólices ${a} e ${b} com cobertura simultânea`;
}