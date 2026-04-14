// Ficheiro: backend-simec/services/time/businessCalendar.js

import { FAR_FUTURE_UTC_DATE } from './constants.js';
import { buildUtcIntervalFromLocal, localDateTimeToUtc } from './converters.js';
import { isValidDate, validateLocalInterval } from './validators.js';

export function isFutureLocalDateTime({
  dateLocal,
  timeLocal,
  timezone,
  now = new Date(),
}) {
  if (!isValidDate(now)) {
    return {
      valid: false,
      code: 'INVALID_NOW',
      message: 'Referência de data atual inválida.',
    };
  }

  const targetUtc = localDateTimeToUtc({
    dateLocal,
    timeLocal,
    timezone,
  });

  if (!targetUtc) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_DATETIME',
      message: 'Data/hora local inválida.',
    };
  }

  if (targetUtc.getTime() < now.getTime()) {
    return {
      valid: false,
      code: 'PAST_LOCAL_DATETIME',
      message: 'A data/hora informada está no passado.',
    };
  }

  return {
    valid: true,
    code: 'OK',
    message: null,
    targetUtc,
  };
}

export function validateSchedulingWindow({
  dateLocal,
  startTimeLocal,
  endTimeLocal,
  timezone,
  now = new Date(),
}) {
  const baseValidation = validateLocalInterval({
    dateLocal,
    startTimeLocal,
    endTimeLocal,
  });

  if (!baseValidation.valid) {
    return baseValidation;
  }

  const futureValidation = isFutureLocalDateTime({
    dateLocal,
    timeLocal: startTimeLocal,
    timezone,
    now,
  });

  if (!futureValidation.valid) {
    return futureValidation;
  }

  const { startUtc, endUtc } = buildUtcIntervalFromLocal({
    dateLocal,
    startTimeLocal,
    endTimeLocal,
    timezone,
  });

  if (!startUtc) {
    return {
      valid: false,
      code: 'INVALID_START_UTC',
      message: 'Não foi possível converter a data/hora inicial.',
    };
  }

  if (endTimeLocal && !endUtc) {
    return {
      valid: false,
      code: 'INVALID_END_UTC',
      message: 'Não foi possível converter a data/hora final.',
    };
  }

  if (endUtc && endUtc.getTime() <= startUtc.getTime()) {
    return {
      valid: false,
      code: 'END_BEFORE_OR_EQUAL_START',
      message: 'A hora final deve ser maior que a hora inicial.',
    };
  }

  return {
    valid: true,
    code: 'OK',
    message: null,
    startUtc,
    endUtc,
  };
}

export function overlapsUtcIntervals({ startA, endA, startB, endB }) {
  if (!isValidDate(startA) || !isValidDate(startB)) {
    return false;
  }

  const safeEndA = isValidDate(endA) ? endA : FAR_FUTURE_UTC_DATE;
  const safeEndB = isValidDate(endB) ? endB : FAR_FUTURE_UTC_DATE;

  return startA < safeEndB && safeEndA > startB;
}

export function isSameLocalDay({ utcDate, timezone, dateLocal }) {
  if (!isValidDate(utcDate) || !dateLocal) return false;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(utcDate);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const currentLocal = `${map.year}-${map.month}-${map.day}`;

  return currentLocal === dateLocal;
}