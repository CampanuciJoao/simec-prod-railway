// Ficheiro: backend-simec/services/timeService.js
// Padrão SaaS: UTC-first

/**
 * Retorna o instante atual em UTC.
 * Regra: backend SEMPRE trabalha em UTC.
 */
export function getAgora() {
  return new Date();
}

/**
 * Cria um Date a partir de data + hora (YYYY-MM-DD + HH:mm)
 * SEMPRE em UTC.
 *
 * Evita inconsistências de parsing do JS.
 */
export function criarDateUTC(data, hora = '00:00') {
  if (!data) return null;

  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, m] = (hora || '00:00').split(':').map(Number);

  if (
    !ano ||
    !mes ||
    !dia ||
    Number.isNaN(h) ||
    Number.isNaN(m)
  ) {
    return null;
  }

  const dt = new Date(Date.UTC(ano, mes - 1, dia, h, m, 0));

  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Extrai apenas a data (YYYY-MM-DD) em UTC
 */
export function extrairDataUTC(date = new Date()) {
  if (!(date instanceof Date)) return null;
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().split('T')[0];
}

/**
 * Verifica se uma data é válida
 */
export function isDataValida(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}