// Ficheiro: backend-simec/services/time/businessCalendar.js
// Regras de negócio temporal do SIMEC.
// Suporta agendamento local-first, conversão para UTC e virada de dia.

import { FAR_FUTURE_UTC_DATE } from './constants.js';
import { localDateTimeToUtc } from './converters.js';
import { isValidDate, validateLocalInterval } from './validators.js';

function extrairMinutos(timeLocal) {
  if (!timeLocal || typeof timeLocal !== 'string') return null;

  const [hour, minute] = timeLocal.split(':').map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function proximaDataLocal(dateLocal) {
  const [year, month, day] = String(dateLocal).split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const base = new Date(Date.UTC(year, month - 1, day));

  if (!isValidDate(base)) {
    return null;
  }

  base.setUTCDate(base.getUTCDate() + 1);

  const nextYear = base.getUTCFullYear();
  const nextMonth = String(base.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(base.getUTCDate()).padStart(2, '0');

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

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
    endTimeLocal: null,
  });

  if (!baseValidation.valid) {
    return baseValidation;
  }

  if (endTimeLocal) {
    const endValidation = validateLocalInterval({
      dateLocal,
      startTimeLocal: endTimeLocal,
      endTimeLocal: null,
    });

    if (!endValidation.valid) {
      return {
        valid: false,
        code: 'INVALID_LOCAL_END_TIME',
        message: 'A hora final informada é inválida.',
      };
    }
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

  const startUtc = localDateTimeToUtc({
    dateLocal,
    timeLocal: startTimeLocal,
    timezone,
  });

  if (!startUtc) {
    return {
      valid: false,
      code: 'INVALID_START_UTC',
      message: 'Não foi possível converter a data/hora inicial.',
    };
  }

  let effectiveEndDateLocal = dateLocal;
  let endUtc = null;
  let crossesMidnight = false;

  if (endTimeLocal) {
    const startMinutes = extrairMinutos(startTimeLocal);
    const endMinutes = extrairMinutos(endTimeLocal);

    if (startMinutes === null || endMinutes === null) {
      return {
        valid: false,
        code: 'INVALID_LOCAL_END_TIME',
        message: 'A hora final informada é inválida.',
      };
    }

    // Se a hora final for menor ou igual à inicial,
    // o sistema interpreta como término no dia seguinte.
    if (endMinutes <= startMinutes) {
      effectiveEndDateLocal = proximaDataLocal(dateLocal);
      crossesMidnight = true;
    }

    if (!effectiveEndDateLocal) {
      return {
        valid: false,
        code: 'INVALID_END_DATE',
        message: 'Não foi possível calcular a data local final.',
      };
    }

    endUtc = localDateTimeToUtc({
      dateLocal: effectiveEndDateLocal,
      timeLocal: endTimeLocal,
      timezone,
    });

    if (!endUtc) {
      return {
        valid: false,
        code: 'INVALID_END_UTC',
        message: 'Não foi possível converter a data/hora final.',
      };
    }

    if (endUtc.getTime() <= startUtc.getTime()) {
      return {
        valid: false,
        code: 'END_BEFORE_OR_EQUAL_START',
        message: 'A hora final deve ser maior que a hora inicial.',
      };
    }
  }

  return {
    valid: true,
    code: 'OK',
    message: null,
    startUtc,
    endUtc,
    crossesMidnight,
    effectiveEndDateLocal,
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