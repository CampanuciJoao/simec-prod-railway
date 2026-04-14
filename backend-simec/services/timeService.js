// Ficheiro: backend-simec/services/timeService.js
// Camada de compatibilidade temporária.
// A fonte oficial agora é: services/time/

export {
  SYSTEM_DEFAULT_LOCALE,
  SYSTEM_DEFAULT_TIMEZONE,
  FAR_FUTURE_UTC_DATE,
  MANUTENCAO_STATUSS_CONFLITANTES,
  isValidDate as isDataValida,
  isValidTimezone,
  isValidLocalDate,
  isValidLocalTime,
  validateLocalInterval,
  getTenantTimezone,
  getUnidadeTimezone,
  resolveOperationalTimezone,
  parseIsoToUtc as parseISOToUTC,
  localDateTimeToUtc as criarDateUTCFromLocal,
  buildUtcIntervalFromLocal as criarIntervaloUTCFromLocal,
  utcToLocalParts,
  isoUtcToLocalParts,
  extractLocalDateFromIso as extrairDataLocalFromISO,
  extractLocalTimeFromIso as extrairHoraLocalFromISO,
  toUtcIso,
  formatUtcToLocalDate,
  formatUtcToLocalTime,
  formatUtcToLocalDateTime,
  formatLocalParts,
  isFutureLocalDateTime,
  validateSchedulingWindow,
  overlapsUtcIntervals,
  isSameLocalDay,
} from './time/index.js';

export function getAgora() {
  return new Date();
}

export function extrairDataUTC(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

export function extrairHoraUTC(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(11, 16);
}