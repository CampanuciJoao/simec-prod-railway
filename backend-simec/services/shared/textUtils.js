/**
 * Utilitários de texto compartilhados entre todos os serviços.
 * Centraliza lógica de normalização para evitar duplicação.
 */

/**
 * Normaliza texto para comparações: minúsculas, sem acentos, sem espaços extras.
 */
export function normalizarTexto(texto = '') {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Normaliza valor para exibição: retorna o valor trimado ou o fallback.
 */
export function normalizarParaExibicao(valor, fallback = 'N/A') {
  return String(valor || fallback).trim();
}

/**
 * Verifica se o texto contém algum dos termos (após normalização).
 */
export function contemAlgumTermo(texto = '', termos = []) {
  const normalizado = normalizarTexto(texto);
  return termos.some((t) => normalizado.includes(normalizarTexto(t)));
}

/**
 * Normaliza string opcional: retorna null se vazia/só espaços.
 */
export function normalizarOpcional(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Faz parse de inteiro positivo; retorna fallback se inválido ou <= 0.
 */
export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}
