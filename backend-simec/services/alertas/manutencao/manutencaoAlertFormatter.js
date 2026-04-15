// Ficheiro: services/alertas/manutencao/manutencaoAlertFormatter.js
// Descrição: formata títulos e payload base dos alertas de manutenção

import { buildAlertMetaManutencao } from './manutencaoAlertMeta.js';

/**
 * 🔧 Helpers internos
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
export function montarTituloInicio(manut) {
  const tipo = capitalizar(manut.tipo || 'Manutenção');
  const unidade = normalizarTexto(
    manut.equipamento?.unidade?.nomeSistema
  );

  return `${tipo} na unidade de ${unidade}`;
}

export function montarTituloFim(manut) {
  const tipo = capitalizar(manut.tipo || 'Manutenção');
  const unidade = normalizarTexto(
    manut.equipamento?.unidade?.nomeSistema
  );

  return `Término de ${tipo} na unidade de ${unidade}`;
}

export function montarTituloConfirmacao(manut) {
  const modelo = normalizarTexto(manut.equipamento?.modelo, 'Equipamento');
  const tag = normalizarTexto(manut.equipamento?.tag, 'Sem TAG');
  const unidade = normalizarTexto(
    manut.equipamento?.unidade?.nomeSistema
  );

  return `Confirmar conclusão: ${modelo} (${tag}) na unidade de ${unidade}`;
}

/**
 * 🟡 SUBTÍTULOS
 */
export function montarSubtituloBase(manut) {
  const modelo = normalizarTexto(manut.equipamento?.modelo, 'Equipamento');
  const tag = normalizarTexto(manut.equipamento?.tag, 'Sem TAG');

  return `${modelo} (${tag})`;
}

export function montarSubtituloConfirmacaoFallback(manut) {
  return `OS ${manut.numeroOS} | O prazo expirou. Confirme se a manutenção foi concluída ou prorrogada.`;
}

/**
 * 🔥 ID PADRONIZADO (mesma lógica do seguro)
 */
export function buildAlertId(tenantId, tipo, manutId, label = '') {
  const safeTenant = String(tenantId).trim();
  const safeTipo = String(tipo).trim().toLowerCase();
  const safeId = String(manutId).trim();
  const safeLabel = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}

/**
 * 🧠 BASE DE PAYLOAD (sem lógica de negócio)
 */
export function montarPayloadAlertaManutencaoBase(manut) {
  const subtituloBase = montarSubtituloBase(manut);

  return buildAlertMetaManutencao(manut, {
    subtituloBase,
  });
}