// Ficheiro: backend-simec/services/timeService.js
// Padrão SaaS: UTC-first + local-intent aware

const DEFAULT_TIMEZONE = 'America/Campo_Grande';

export function getAgora() {
  return new Date();
}

export function isDataValida(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export function getTenantTimezone(tenant) {
  return tenant?.timezone || DEFAULT_TIMEZONE;
}

export function parseISOToUTC(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;

  const date = new Date(isoString);
  return isDataValida(date) ? date : null;
}

export function extrairDataUTC(date = new Date()) {
  if (!isDataValida(date)) return null;
  return date.toISOString().split('T')[0];
}

export function extrairHoraUTC(date = new Date()) {
  if (!isDataValida(date)) return null;
  return date.toISOString().slice(11, 16);
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
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function criarDateUTCFromLocal(
  dataLocal,
  horaLocal = '00:00',
  timeZone = DEFAULT_TIMEZONE
) {
  if (!dataLocal) return null;

  const [year, month, day] = String(dataLocal).split('-').map(Number);
  const [hour, minute] = String(horaLocal || '00:00').split(':').map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  if (!isDataValida(utcGuess)) return null;

  const zoned = getZonedParts(utcGuess, timeZone);

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

  return isDataValida(corrected) ? corrected : null;
}

export function criarIntervaloUTCFromLocal({
  dataLocal,
  horaInicioLocal,
  horaFimLocal,
  timeZone = DEFAULT_TIMEZONE,
}) {
  const inicio = criarDateUTCFromLocal(
    dataLocal,
    horaInicioLocal,
    timeZone
  );

  const fim = horaFimLocal
    ? criarDateUTCFromLocal(dataLocal, horaFimLocal, timeZone)
    : null;

  return { inicio, fim };
}

export function extrairDataLocalFromISO(
  isoString,
  timeZone = DEFAULT_TIMEZONE
) {
  const date = parseISOToUTC(isoString);
  if (!date) return null;

  const parts = getZonedParts(date, timeZone);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  return `${parts.year}-${month}-${day}`;
}

export function extrairHoraLocalFromISO(
  isoString,
  timeZone = DEFAULT_TIMEZONE
) {
  const date = parseISOToUTC(isoString);
  if (!date) return null;

  const parts = getZonedParts(date, timeZone);
  const hour = String(parts.hour).padStart(2, '0');
  const minute = String(parts.minute).padStart(2, '0');

  return `${hour}:${minute}`;
}