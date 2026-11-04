// FoxESS adapter — porta a logica existente em services/foxess/foxessClient
// pro novo modelo de adapter generico. Mantem compatibilidade com dados
// cadastrados antes do refactor (migration 20261104000001).

import crypto from 'crypto';

const USER_AGENT = 'SIMEC-SolarAdapter/1.0';

export const id = 'foxess';
export const label = 'FoxESS';

export const credentialFields = [
  {
    name: 'apiKey',
    label: 'API Key',
    type: 'password',
    required: true,
    help: 'Gere em OpenPlatform > API Keys do portal FoxCloud.',
  },
];

export const defaultApiBase = 'https://www.foxesscloud.com';

export const apiBaseOptions = [
  { value: 'https://www.foxesscloud.com',       label: 'Global (foxesscloud.com)' },
  { value: 'https://portal-eu.foxesscloud.com', label: 'Europa (portal-eu)' },
  { value: 'https://portal-us.foxesscloud.com', label: 'EUA (portal-us)' },
];

function signatureMD5({ path, token, timestampMs }) {
  return crypto.createHash('md5')
    .update(`${path}\r\n${token}\r\n${timestampMs}`)
    .digest('hex');
}

function buildHeaders({ apiKey, path }) {
  const timestampMs = Date.now();
  return {
    'token': apiKey,
    'timestamp': String(timestampMs),
    'signature': signatureMD5({ path, token: apiKey, timestampMs }),
    'lang': 'pt',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };
}

async function callFoxess({ apiBase, apiKey, path, method = 'POST', body = null }) {
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  const opts = { method, headers: buildHeaders({ apiKey, path }) };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FoxESS HTTP ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text);
  if (json?.errno !== 0) {
    throw new Error(`FoxESS erro em ${path}: errno=${json?.errno} msg=${json?.msg || 'sem msg'}`);
  }
  return json.result;
}

export async function validarCredencial(credential, apiBase) {
  try {
    const result = await callFoxess({
      apiBase: apiBase || defaultApiBase,
      apiKey: credential.apiKey,
      path: '/op/v0/device/list',
      method: 'POST',
      body: { currentPage: 1, pageSize: 50 },
    });
    return {
      ok: true,
      devices: (result?.data || []).map((d) => ({
        sn:     d.deviceSN,
        tipo:   d.deviceType,
        modelo: d.productType,
        estacao: d.stationName,
        online: d.status === 1,
      })),
    };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

/**
 * Coleta snapshot do inversor. FoxESS H3 PRO e similares expoe variaveis
 * por bateria (_1/_2) — agregamos SoC pelo minimo (pior caso).
 */
export async function fetchSnapshot(inverter) {
  const result = await callFoxess({
    apiBase: inverter.apiBase,
    apiKey: inverter.credential.apiKey,
    path: '/op/v1/device/real/query',
    method: 'POST',
    body: { sns: [inverter.inverterSn] },
  });

  const device = (result || []).find((d) => d?.deviceSN === inverter.inverterSn) || (result || [])[0];
  const v = {};
  for (const d of (device?.datas || [])) {
    if (d?.variable == null) continue;
    const n = typeof d.value === 'number' ? d.value : parseFloat(d.value);
    v[d.variable] = Number.isFinite(n) ? n : d.value;
  }

  // SoC agregado = minimo entre SoC_1 e SoC_2 (conservador — alerta
  // pela bateria em pior estado).
  const s1 = typeof v.SoC_1 === 'number' ? v.SoC_1 : null;
  const s2 = typeof v.SoC_2 === 'number' ? v.SoC_2 : null;
  let soc = null;
  if (s1 == null && s2 != null) soc = s2;
  else if (s2 == null && s1 != null) soc = s1;
  else if (s1 != null && s2 != null) soc = Math.min(s1, s2);

  // Detalhes por bateria (apenas quando ha SoC_1/SoC_2 reportados).
  const detalhes = [];
  if (s1 != null) {
    detalhes.push({
      tipo: 'bateria',
      slot: 1,
      soc: s1,
      soh: v.SOH_1 ?? null,
      tempC: v.batTemperature_1 ?? null,
      powerKw: v.invBatPower_1 ?? null,
    });
  }
  if (s2 != null) {
    detalhes.push({
      tipo: 'bateria',
      slot: 2,
      soc: s2,
      soh: v.SOH_2 ?? null,
      tempC: v.batTemperature_2 ?? null,
      powerKw: v.invBatPower_2 ?? null,
    });
  }

  return {
    // Bateria / grid
    soc,
    batChargePower: v.batChargePower ?? null,
    batDischargePower: v.batDischargePower ?? null,
    feedinPower: v.feedinPower ?? null,
    gridConsumptionPower: v.gridConsumptionPower ?? null,
    epsPower: v.epsPower ?? null,
    runningState: typeof v.runningState === 'number' ? v.runningState : null,
    currentFault: typeof v.currentFault === 'string' && v.currentFault.trim() ? v.currentFault : null,

    // Geracao (FoxESS H3 PRO expoe tambem PV)
    powerKw: v.pvPower ?? null,
    generationKwhDay: v.generation ?? null,        // "generation" do FoxESS e kWh do dia
    generationKwhMonth: null,                       // nao reportado
    generationKwhTotal: v.PVEnergyTotal ?? null,

    // Diagnostico
    ambientTempC: typeof v.ambientTemperation === 'number' ? v.ambientTemperation : null,
    inverterTempC: typeof v.invTemperation === 'number' ? v.invTemperation : null,

    detalhes: detalhes.length > 0 ? detalhes : null,
    rawPayload: result,
  };
}
