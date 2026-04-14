// Ficheiro: backend-simec/services/timeService.js
// Padrão SaaS: UTC-first + timezone-aware

const DEFAULT_TIMEZONE = 'America/Campo_Grande';

/**
 * Retorna o instante atual.
 * Regra: Date no JS já representa um instante absoluto.
 * Ao salvar no banco, será persistido em UTC.
 */
export function getAgora() {
  return new Date();
}

/**
 * Verifica se a data é válida.
 */
export function isDataValida(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Retorna o timezone oficial do tenant.
 */
export function getTenantTimezone(tenant) {
  return tenant?.timezone || DEFAULT_TIMEZONE;
}

/**
 * Faz parse seguro de um ISO UTC já pronto.
 * Use quando o frontend já enviar um datetime ISO completo.
 */
export function parseISOToUTC(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;

  const date = new Date(isoString);

  return isDataValida(date) ? date : null;
}

/**
 * Extrai a data UTC no formato YYYY-MM-DD.
 */
export function extrairDataUTC(date = new Date()) {
  if (!isDataValida(date)) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Extrai a hora UTC no formato HH:mm.
 */
export function extrairHoraUTC(date = new Date()) {
  if (!isDataValida(date)) return null;
  return date.toISOString().slice(11, 16);
}

/**
 * Cria um Date em UTC assumindo que a data/hora recebida JÁ está em UTC.
 *
 * Útil apenas quando a origem explicitamente já trabalha em UTC.
 * NÃO usar para horário digitado localmente pelo usuário.
 */
export function criarDateUTC(data, hora = '00:00') {
  if (!data) return null;

  const [ano, mes, dia] = String(data).split('-').map(Number);
  const [h, m] = String(hora || '00:00').split(':').map(Number);

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
  return isDataValida(dt) ? dt : null;
}

/**
 * Junta data + hora local do negócio sem inventar parsing solto.
 *
 * Retorna uma estrutura intermediária que representa
 * a intenção local do usuário.
 */
export function criarDateTimeLocalParts(data, hora = '00:00') {
  if (!data) return null;

  const [ano, mes, dia] = String(data).split('-').map(Number);
  const [h, m] = String(hora || '00:00').split(':').map(Number);

  if (
    !ano ||
    !mes ||
    !dia ||
    Number.isNaN(h) ||
    Number.isNaN(m)
  ) {
    return null;
  }

  return {
    ano,
    mes,
    dia,
    hora: h,
    minuto: m,
  };
}

/**
 * Converte uma data local do tenant para UTC.
 *
 * IMPORTANTE:
 * Esta implementação usa o deslocamento manual informado.
 * É a forma mais segura sem depender de libs externas.
 *
 * Exemplo:
 * local 2026-04-13 19:00 em UTC-04:00
 * vira 2026-04-13T23:00:00.000Z
 *
 * utcOffsetMinutes:
 * - Campo Grande (UTC-4) => -240
 * - Brasília (UTC-3) => -180
 */
export function criarDateUTCFromLocal({
  data,
  hora = '00:00',
  utcOffsetMinutes,
}) {
  const parts = criarDateTimeLocalParts(data, hora);

  if (!parts) return null;
  if (typeof utcOffsetMinutes !== 'number' || Number.isNaN(utcOffsetMinutes)) {
    return null;
  }

  const utcMillis = Date.UTC(
    parts.ano,
    parts.mes - 1,
    parts.dia,
    parts.hora,
    parts.minuto,
    0
  ) - utcOffsetMinutes * 60 * 1000;

  const dt = new Date(utcMillis);

  return isDataValida(dt) ? dt : null;
}

/**
 * Helper para intervalo completo local -> UTC.
 */
export function criarIntervaloUTCFromLocal({
  data,
  horaInicio,
  horaFim,
  utcOffsetMinutes,
}) {
  const inicio = criarDateUTCFromLocal({
    data,
    hora: horaInicio,
    utcOffsetMinutes,
  });

  const fim = horaFim
    ? criarDateUTCFromLocal({
        data,
        hora: horaFim,
        utcOffsetMinutes,
      })
    : null;

  return { inicio, fim };
}