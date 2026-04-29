// Ficheiro: backend-simec/services/time/index.js

// ==============================
// CONSTANTS
// ==============================
export * from './constants.js';

// ==============================
// VALIDATORS
// ==============================
export * from './validators.js';

// ==============================
// TIMEZONE RESOLUTION
// ==============================
export * from './timezoneResolver.js';

// ==============================
// CONVERTERS (LOCAL <-> UTC)
// ==============================
export * from './converters.js';

// ==============================
// FORMATTERS (DISPLAY)
// ==============================
export * from './formatters.js';

// ==============================
// BUSINESS RULES (AGENDA)
// ==============================
export * from './businessCalendar.js';

// ==============================
// UTILITIES
// ==============================
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