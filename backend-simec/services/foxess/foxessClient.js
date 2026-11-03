// Cliente HTTP do FoxESS OpenAPI.
//
// Autenticacao: API key + signature MD5.
//   signature = md5(url + "\r\n" + token + "\r\n" + timestamp_ms)
//   Headers: token, timestamp, signature, lang, Content-Type, User-Agent
//
// Nao usa OAuth 2.0 pra simplificar a primeira iteracao (1 inversor da
// propria conta Cerdil, nao e autorizacao de terceiro). API key fica
// criptografada no banco (foxessCrypto) e so e descriptografada no
// momento da chamada — nunca persistida em memoria alem desse momento.
//
// Rate limits do fornecedor:
//   - 1440 calls/dia por inversor
//   - 1 req/segundo por endpoint de query
//   - 1 req/2s por endpoint de update
// Nosso polling a cada 60s cabe exatamente no limite diario.

import crypto from 'crypto';

const DEFAULT_BASE  = 'https://www.foxesscloud.com';
const DEFAULT_LANG  = 'pt';
const USER_AGENT    = 'SIMEC-FoxessClient/1.0';

function md5Signature({ path, token, timestampMs }) {
  const payload = `${path}\r\n${token}\r\n${timestampMs}`;
  return crypto.createHash('md5').update(payload).digest('hex');
}

function headers({ apiKey, path }) {
  const timestampMs = Date.now();
  return {
    'token': apiKey,
    'timestamp': String(timestampMs),
    'signature': md5Signature({ path, token: apiKey, timestampMs }),
    'lang': DEFAULT_LANG,
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };
}

// Resposta padrao do FoxESS: { errno: number, result: any, msg?: string }
// errno = 0 e sucesso; outros valores sao erro do fornecedor.
async function callFoxess({ apiBase, apiKey, path, method = 'POST', body = null }) {
  const base = apiBase || DEFAULT_BASE;
  const url  = `${base}${path}`;
  const opts = {
    method,
    headers: headers({ apiKey, path }),
  };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FoxESS HTTP ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`FoxESS retornou JSON invalido em ${path}: ${text.slice(0, 200)}`);
  }

  if (json?.errno !== 0) {
    throw new Error(`FoxESS erro em ${path}: errno=${json?.errno} msg=${json?.msg || 'sem msg'}`);
  }

  return json.result;
}

/**
 * Query real-time de 1 ou mais inversores.
 * @param {object} args
 * @param {string} args.apiBase  Base da API (ex: https://www.foxesscloud.com)
 * @param {string} args.apiKey   API key descriptografada
 * @param {string[]} args.sns    Serial numbers (max 50)
 * @param {string[]} [args.variables] Omitir pra pegar todas as variaveis
 * @returns {Promise<Array>} Array com 1 item por SN: { deviceSN, datas: [{ variable, value, unit }] }
 */
export async function queryRealTime({ apiBase, apiKey, sns, variables }) {
  const body = { sns };
  if (variables && variables.length > 0) {
    body.variables = variables;
  }
  return callFoxess({
    apiBase,
    apiKey,
    path: '/op/v1/device/real/query',
    method: 'POST',
    body,
  });
}

/**
 * Detalhes do device (status online/offline etc).
 * status: 1 = online, 2 = breakdown, 3 = offline.
 */
export async function queryDeviceDetail({ apiBase, apiKey, sn }) {
  return callFoxess({
    apiBase,
    apiKey,
    path: `/op/v1/device/detail?sn=${encodeURIComponent(sn)}`,
    method: 'GET',
  });
}

/**
 * Lista devices da conta (pra descoberta inicial / confirmar SNs).
 */
export async function listDevices({ apiBase, apiKey, currentPage = 1, pageSize = 50 }) {
  return callFoxess({
    apiBase,
    apiKey,
    path: '/op/v0/device/list',
    method: 'POST',
    body: { currentPage, pageSize },
  });
}

// Extrai variaveis do payload de queryRealTime num shape previsivel.
// A API devolve { deviceSN, datas: [{ variable, value, unit }] }; este
// helper transforma em { [variable]: valueNumerico }.
export function toVariablesMap(deviceResult) {
  const map = {};
  if (!deviceResult?.datas) return map;
  for (const d of deviceResult.datas) {
    if (d?.variable == null) continue;
    const v = typeof d.value === 'number' ? d.value : parseFloat(d.value);
    map[d.variable] = Number.isFinite(v) ? v : d.value;
  }
  return map;
}
