/**
 * Mapeamento de UF brasileira para timezone IANA.
 * Fonte: IBGE / ANATEL — fusos oficiais do Brasil.
 *
 * Casos especiais:
 *   - AM: a maioria é UTC-4 (Manaus), cidades do extremo oeste são UTC-5,
 *          mas o IBGE não diferencia por município no CEP; usamos America/Manaus.
 *   - PE: Fernando de Noronha é UTC-2, mas não tem CEP de cidade continental diferente.
 */
export const UF_TIMEZONE_MAP = {
  AC: 'America/Rio_Branco',    // UTC-5
  AL: 'America/Maceio',        // UTC-3
  AM: 'America/Manaus',        // UTC-4
  AP: 'America/Belem',         // UTC-3
  BA: 'America/Bahia',         // UTC-3
  CE: 'America/Fortaleza',     // UTC-3
  DF: 'America/Sao_Paulo',     // UTC-3
  ES: 'America/Sao_Paulo',     // UTC-3
  GO: 'America/Sao_Paulo',     // UTC-3
  MA: 'America/Fortaleza',     // UTC-3
  MG: 'America/Sao_Paulo',     // UTC-3
  MS: 'America/Campo_Grande',  // UTC-4
  MT: 'America/Cuiaba',        // UTC-4
  PA: 'America/Belem',         // UTC-3
  PB: 'America/Fortaleza',     // UTC-3
  PE: 'America/Recife',        // UTC-3
  PI: 'America/Fortaleza',     // UTC-3
  PR: 'America/Sao_Paulo',     // UTC-3
  RJ: 'America/Sao_Paulo',     // UTC-3
  RN: 'America/Fortaleza',     // UTC-3
  RO: 'America/Porto_Velho',   // UTC-4
  RR: 'America/Boa_Vista',     // UTC-4
  RS: 'America/Sao_Paulo',     // UTC-3
  SC: 'America/Sao_Paulo',     // UTC-3
  SE: 'America/Maceio',        // UTC-3
  SP: 'America/Sao_Paulo',     // UTC-3
  TO: 'America/Araguaina',     // UTC-3
};

export function timezoneParaUF(uf) {
  return UF_TIMEZONE_MAP[uf?.toUpperCase()] || null;
}

export function labelTimezone(timezone) {
  const labels = {
    'America/Rio_Branco':   'UTC-5 — Acre',
    'America/Manaus':       'UTC-4 — Amazonas',
    'America/Campo_Grande': 'UTC-4 — Mato Grosso do Sul',
    'America/Cuiaba':       'UTC-4 — Mato Grosso',
    'America/Porto_Velho':  'UTC-4 — Rondônia',
    'America/Boa_Vista':    'UTC-4 — Roraima',
    'America/Sao_Paulo':    'UTC-3 — Horário de Brasília',
    'America/Bahia':        'UTC-3 — Bahia',
    'America/Fortaleza':    'UTC-3 — Fortaleza',
    'America/Recife':       'UTC-3 — Recife',
    'America/Maceio':       'UTC-3 — Maceió',
    'America/Belem':        'UTC-3 — Belém',
    'America/Araguaina':    'UTC-3 — Araguaína',
    'America/Noronha':      'UTC-2 — Fernando de Noronha',
  };
  return labels[timezone] || timezone || '—';
}
