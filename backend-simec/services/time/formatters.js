// Ficheiro: backend-simec/services/time/formatters.js

import { SYSTEM_DEFAULT_LOCALE, SYSTEM_DEFAULT_TIMEZONE } from './constants.js';
import { isValidDate, isValidTimezone } from './validators.js';

function safeLocale(locale) {
  return locale || SYSTEM_DEFAULT_LOCALE;
}

function safeTimezone(timezone) {
  return isValidTimezone(timezone) ? timezone : SYSTEM_DEFAULT_TIMEZONE;
}

export function formatUtcToLocalDate({
  date,
  timezone,
  locale = SYSTEM_DEFAULT_LOCALE,
}) {
  if (!isValidDate(date)) return null;

  return new Intl.DateTimeFormat(safeLocale(locale), {
    timeZone: safeTimezone(timezone),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatUtcToLocalTime({
  date,
  timezone,
  locale = SYSTEM_DEFAULT_LOCALE,
}) {
  if (!isValidDate(date)) return null;

  return new Intl.DateTimeFormat(safeLocale(locale), {
    timeZone: safeTimezone(timezone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatUtcToLocalDateTime({
  date,
  timezone,
  locale = SYSTEM_DEFAULT_LOCALE,
}) {
  if (!isValidDate(date)) return null;

  return new Intl.DateTimeFormat(safeLocale(locale), {
    timeZone: safeTimezone(timezone),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatLocalParts({
  dateLocal,
  timeLocal,
  locale = SYSTEM_DEFAULT_LOCALE,
}) {
  if (!dateLocal) return null;

  const [year, month, day] = dateLocal.split('-');

  if (!year || !month || !day) return null;

  if (!timeLocal) {
    if (locale === 'pt-BR') {
      return `${day}/${month}/${year}`;
    }

    return `${year}-${month}-${day}`;
  }

  if (locale === 'pt-BR') {
    return `${day}/${month}/${year} ${timeLocal}`;
  }

  return `${year}-${month}-${day} ${timeLocal}`;
}