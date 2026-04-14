// Ficheiro: backend-simec/services/time/converters.js

import {
  isValidDate,
  isValidLocalDate,
  isValidLocalTime,
  isValidTimezone,
} from './validators.js';
import { SYSTEM_DEFAULT_TIMEZONE } from './constants.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeTimezone(timezone) {
  return isValidTimezone(timezone) ? timezone : SYSTEM_DEFAULT_TIMEZONE;
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function parseLocalDateParts(dateLocal) {
  if (!isValidLocalDate(dateLocal)) return null;

  const [year, month, day] = dateLocal.split('-').map(Number);
  return { year, month, day };
}

export function parseIsoToUtc(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;

  const date = new Date(isoString);
  return isValidDate(date) ? date : null;
}

export function localDateTimeToUtc({
  dateLocal,
  timeLocal = '00:00',
  timezone,
}) {
  if (!isValidLocalDate(dateLocal) || !isValidLocalTime(timeLocal)) {
    return null;
  }

  const safeTimezone = normalizeTimezone(timezone);

  const [year, month, day] = dateLocal.split('-').map(Number);
  const [hour, minute] = timeLocal.split(':').map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  if (!isValidDate(utcGuess)) return null;

  const zoned = getZonedParts(utcGuess, safeTimezone);

  const desiredWall = Date.UTC(year, month - 1, day, hour, minute, 0);
  const actualWall = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second || 0
  );

  const diffMs = desiredWall - actualWall;
  const corrected = new Date(utcGuess.getTime() + diffMs);

  return isValidDate(corrected) ? corrected : null;
}

export function buildUtcIntervalFromLocal({
  dateLocal,
  startTimeLocal,
  endTimeLocal,
  timezone,
}) {
  const startUtc = localDateTimeToUtc({
    dateLocal,
    timeLocal: startTimeLocal,
    timezone,
  });

  const endUtc = endTimeLocal
    ? localDateTimeToUtc({
        dateLocal,
        timeLocal: endTimeLocal,
        timezone,
      })
    : null;

  return {
    startUtc,
    endUtc,
  };
}

export function utcToLocalParts({ date, timezone }) {
  if (!isValidDate(date)) return null;

  const safeTimezone = normalizeTimezone(timezone);
  const parts = getZonedParts(date, safeTimezone);

  return {
    dateLocal: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    timeLocal: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function isoUtcToLocalParts({ isoString, timezone }) {
  const date = parseIsoToUtc(isoString);
  if (!date) return null;

  return utcToLocalParts({ date, timezone });
}

export function extractLocalDateFromIso(isoString, timezone) {
  const parts = isoUtcToLocalParts({ isoString, timezone });
  return parts?.dateLocal || null;
}

export function extractLocalTimeFromIso(isoString, timezone) {
  const parts = isoUtcToLocalParts({ isoString, timezone });
  return parts?.timeLocal || null;
}

export function getCurrentLocalDate({ timezone, now = new Date() }) {
  if (!isValidDate(now)) return null;

  const parts = utcToLocalParts({
    date: now,
    timezone,
  });

  return parts?.dateLocal || null;
}

export function addDaysToLocalDate(dateLocal, days) {
  const parts = parseLocalDateParts(dateLocal);
  if (!parts || Number.isNaN(Number(days))) return null;

  const baseUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (!isValidDate(baseUtc)) return null;

  baseUtc.setUTCDate(baseUtc.getUTCDate() + Number(days));

  const y = baseUtc.getUTCFullYear();
  const m = String(baseUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(baseUtc.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

export function localDateToUtcStartOfDay({ dateLocal, timezone }) {
  return localDateTimeToUtc({
    dateLocal,
    timeLocal: '00:00',
    timezone,
  });
}

export function localDateToUtcEndOfDay({ dateLocal, timezone }) {
  const nextDateLocal = addDaysToLocalDate(dateLocal, 1);
  if (!nextDateLocal) return null;

  const nextDayStartUtc = localDateToUtcStartOfDay({
    dateLocal: nextDateLocal,
    timezone,
  });

  if (!nextDayStartUtc) return null;

  return new Date(nextDayStartUtc.getTime() - 1);
}

export function diffLocalDateInDays({ fromDateLocal, toDateLocal }) {
  const fromParts = parseLocalDateParts(fromDateLocal);
  const toParts = parseLocalDateParts(toDateLocal);

  if (!fromParts || !toParts) return null;

  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);

  return Math.floor((toUtc - fromUtc) / DAY_IN_MS);
}

export function toUtcIso(date) {
  if (!isValidDate(date)) return null;
  return date.toISOString();
}