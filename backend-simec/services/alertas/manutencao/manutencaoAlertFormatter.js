// Ficheiro: services/alertas/manutencao/manutencaoAlertFormatter.js
// Descrição: formata títulos e payload base dos alertas de manutenção

import { buildAlertMetaManutencao } from './manutencaoAlertMeta.js';

export function montarTituloInicio(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} na unidade de ${unidade}`;
}

export function montarSubtituloBase(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  return `${modelo} (${tag})`;
}

export function montarTituloFim(manut) {
  const tipo = String(manut.tipo || 'Manutenção').toLowerCase();
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Término de ${tipo} na unidade de ${unidade}`;
}

export function montarTituloConfirmacao(manut) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';
  const unidade = manut.equipamento?.unidade?.nomeSistema || 'N/A';
  return `Confirmar conclusão: ${modelo} (${tag}) na unidade de ${unidade}`;
}

export function montarSubtituloConfirmacaoFallback(manut) {
  return `OS ${manut.numeroOS} | O prazo expirou. Confirme se a manutenção foi concluída ou prorrogada.`;
}

export function buildAlertId(tenantId, tipo, manutId, label = '') {
  return `tenant-${tenantId}-${tipo}-${manutId}${label ? `-${label}` : ''}`;
}

export function montarPayloadAlertaManutencaoBase(manut) {
  const subtituloBase = montarSubtituloBase(manut);

  return buildAlertMetaManutencao(manut, {
    subtituloBase,
  });
}