// Ficheiro: src/utils/timeUtils.js
// Descrição: Utilitário central de datas/horas do frontend
// Regra do sistema:
// - backend salva UTC
// - frontend recebe ISO UTC
// - frontend exibe no timezone do tenant
// - setDefaultTimezone() deve ser chamado no AuthContext ao carregar o tenant

const DEFAULT_LOCALE = 'pt-BR';

let _runtimeTimezone = 'UTC';
export const setDefaultTimezone = (tz) => { _runtimeTimezone = tz || 'UTC'; };
export const getDefaultTimezone = () => _runtimeTimezone;

const isDateInstance = (value) => value instanceof Date;

const parseDate = (value) => {
  if (!value) return null;
  const date = isDateInstance(value) ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const safeFormatter = (value, options, fallback = 'N/A') => {
  const date = parseDate(value);
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, options).format(date);
  } catch {
    return fallback;
  }
};

/**
 * Formata apenas a data.
 * Usa UTC por padrão — datas de calendário (dataInicio, dataFim) não mudam de dia com offset.
 */
export const formatarData = (
  dataISO,
  { locale = DEFAULT_LOCALE, timeZone = 'UTC' } = {}
) => {
  return safeFormatter(dataISO, { locale, timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }, 'N/A');
};

/**
 * Formata apenas a hora no timezone do tenant (lido dinamicamente).
 */
export const formatarHora = (
  dataISO,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone() } = {}
) => {
  return safeFormatter(dataISO, { locale, timeZone, hour: '2-digit', minute: '2-digit', hour12: false }, 'N/A');
};

/**
 * Formata data + hora no timezone do tenant (lido dinamicamente).
 */
export const formatarDataHora = (
  dataISO,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone() } = {}
) => {
  return safeFormatter(
    dataISO,
    { locale, timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
    'N/A'
  );
};

/**
 * Formata intervalo de horário a partir de datetimes ISO.
 */
export const formatarHorario = (
  inicioISO,
  fimISO,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone() } = {}
) => {
  if (!inicioISO) return 'N/A';
  const inicio = formatarHora(inicioISO, { locale, timeZone });
  const fim = fimISO ? formatarHora(fimISO, { locale, timeZone }) : null;
  if (!fim || inicio === fim) return inicio;
  return `${inicio} - ${fim}`;
};

/**
 * Formata um intervalo completo com data + hora.
 * Exemplo: 13/04/2026 • 19:00 - 20:00
 */
export const formatarDataEHorario = (
  inicioISO,
  fimISO,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone(), dateTimeZone = 'UTC' } = {}
) => {
  if (!inicioISO) return 'N/A';
  const data = formatarData(inicioISO, { locale, timeZone: dateTimeZone });
  const horario = formatarHorario(inicioISO, fimISO, { locale, timeZone });
  return `${data} • ${horario}`;
};

/**
 * Formata data curta com hora.
 */
export const formatarDataHoraCurta = (
  dataISO,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone() } = {}
) => {
  return formatarDataHora(dataISO, { locale, timeZone });
};

export const normalizarISO = (value) => {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
};

export const isDataValida = (value) => Boolean(parseDate(value));

export const isInicioAntesDoFim = (inicio, fim) => {
  const dataInicio = parseDate(inicio);
  const dataFim = parseDate(fim);
  if (!dataInicio || !dataFim) return false;
  return dataInicio.getTime() < dataFim.getTime();
};

/**
 * Retorna yyyy-mm-dd no timezone informado — para inputs type="date".
 */
export const formatarParaInputDate = (
  value,
  { locale = 'en-CA', timeZone = getDefaultTimezone() } = {}
) => {
  const date = parseDate(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return '';
  }
};

/**
 * Retorna HH:mm no timezone informado — para inputs de hora.
 */
export const formatarParaInputTime = (
  value,
  { locale = DEFAULT_LOCALE, timeZone = getDefaultTimezone() } = {}
) => {
  const date = parseDate(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  } catch {
    return '';
  }
};

export const TIME_DEFAULTS = {
  locale: DEFAULT_LOCALE,
  get timeZone() { return getDefaultTimezone(); },
};
