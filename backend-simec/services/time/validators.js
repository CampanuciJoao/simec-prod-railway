// Ficheiro: backend-simec/services/time/validators.js

export function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isValidLocalDate(dateLocal) {
  if (typeof dateLocal !== 'string') return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function isValidLocalTime(timeLocal) {
  if (typeof timeLocal !== 'string') return false;

  const match = /^(\d{2}):(\d{2})$/.exec(timeLocal);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function validateLocalInterval({
  dateLocal,
  startTimeLocal,
  endTimeLocal,
}) {
  if (!isValidLocalDate(dateLocal)) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_DATE',
      message: 'A data local informada é inválida.',
    };
  }

  if (!isValidLocalTime(startTimeLocal)) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_START_TIME',
      message: 'A hora inicial informada é inválida.',
    };
  }

  if (endTimeLocal && !isValidLocalTime(endTimeLocal)) {
    return {
      valid: false,
      code: 'INVALID_LOCAL_END_TIME',
      message: 'A hora final informada é inválida.',
    };
  }

  return {
    valid: true,
    code: 'OK',
    message: null,
  };
}