// Growatt adapter — ShineServer OpenAPI V1 (openapi.growatt.com/v1/).
// Autenticacao por token header. Suporta modelos MIN (TLX), MAC, MAX,
// MIX, SPH. Rate limit nao publicado mas e generoso (Growatt documenta
// "V1 API offers more relaxed rate limiting").
//
// Fluxo:
//   1. GET /plant/list — pega todos os plantId do usuario
//   2. GET /device/list?plant_id=X — pega devices (inversores) e o deviceSn
//   3. POST /device/inverter/last_new_data body={device_sn} — telemetria
//
// Como um token pode ver N plantas e N inversores, exigimos que o admin
// cadastre cada inversor SN separadamente. O adapter so busca o SN
// especifico cadastrado.

const USER_AGENT = 'SIMEC-SolarAdapter/1.0';

export const id = 'growatt';
export const label = 'Growatt';

export const credentialFields = [
  {
    name: 'apiToken',
    label: 'API Token',
    type: 'password',
    required: true,
    help: 'Gere em "My Center > API" no portal openapi.growatt.com apos solicitar acesso.',
  },
];

export const defaultApiBase = 'https://openapi.growatt.com';

export const apiBaseOptions = [
  { value: 'https://openapi.growatt.com',    label: 'Global (openapi.growatt.com)' },
  { value: 'https://openapi-cn.growatt.com', label: 'China (openapi-cn)' },
  { value: 'https://openapi-us.growatt.com', label: 'EUA (openapi-us)' },
];

async function callGrowatt({ apiBase, token, path, method = 'GET', body = null }) {
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  const headers = {
    'token': token,
    'User-Agent': USER_AGENT,
    ...(method === 'POST' && body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
  };
  const opts = { method, headers };
  if (body && method === 'POST') {
    // Growatt V1 espera form-encoded no body (nao JSON).
    opts.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Growatt HTTP ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Growatt resposta nao-JSON em ${path}: ${text.slice(0, 200)}`);
  }
  // Growatt V1: code 0 = sucesso; outros valores sao erro logico (HTTP 200 mesmo).
  if (json.error_code && json.error_code !== 0) {
    throw new Error(`Growatt erro em ${path}: error_code=${json.error_code} msg=${json.error_msg || 'sem msg'}`);
  }
  return json.data || json;
}

export async function validarCredencial(credential, apiBase) {
  try {
    // /plant/list — rota leve que confirma token valido e lista plantas.
    const data = await callGrowatt({
      apiBase: apiBase || defaultApiBase,
      token: credential.apiToken,
      path: '/v1/plant/list',
      method: 'GET',
    });

    // Resposta: { plants: [{plant_id, name, create_date, ...}, ...], count }
    const plantas = data?.plants || [];

    // Pra cada planta, pega devices. Limita a 5 plantas na validacao pra
    // nao estourar tempo em contas muito grandes. Inclui peak_power da
    // planta (stationKwp) e nominal_power do device (capacidadeKw) pra
    // auto-fill na UI.
    const devices = [];
    for (const p of plantas.slice(0, 5)) {
      const stationKwp = p.peak_power != null ? parseFloat(p.peak_power) : null;
      try {
        const dev = await callGrowatt({
          apiBase: apiBase || defaultApiBase,
          token: credential.apiToken,
          path: `/v1/device/list?plant_id=${p.plant_id}`,
          method: 'GET',
        });
        for (const d of (dev?.devices || [])) {
          const capKw = d.nominal_power != null
            ? parseFloat(d.nominal_power) / 1000  // Growatt expoe em W
            : (d.rated_power != null ? parseFloat(d.rated_power) / 1000 : null);
          devices.push({
            sn:           d.device_sn,
            tipo:         d.type,
            modelo:       d.model || d.device_model || d.type,
            capacidadeKw: Number.isFinite(capKw) ? capKw : null,
            estacao:      p.name,
            stationKwp:   Number.isFinite(stationKwp) ? stationKwp : null,
            online:       d.status === 1 || d.status === '1',
          });
        }
      } catch (err) {
        // Ignora erro em planta especifica — segue listando as outras.
      }
    }

    return { ok: true, devices };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

export async function fetchSnapshot(inverter) {
  // Pega telemetria mais recente do inversor.
  // Endpoint depende do tipo de device. "inverter" cobre MAX/MAC/TLX.
  // Se o device for MIN (G2-G3) ou MIX/SPH, usa rotas especificas.
  // Por ora, tentamos a rota generica inverter e caimos nas especificas se falhar.
  let data = null;
  let tipoTentado = 'inverter';
  try {
    data = await callGrowatt({
      apiBase: inverter.apiBase,
      token: inverter.credential.apiToken,
      path: '/v1/device/inverter/last_new_data',
      method: 'POST',
      body: { device_sn: inverter.inverterSn },
    });
  } catch (errInv) {
    // Tenta MIN (modelos residenciais mais recentes)
    try {
      tipoTentado = 'min';
      data = await callGrowatt({
        apiBase: inverter.apiBase,
        token: inverter.credential.apiToken,
        path: '/v1/device/min/last_new_data',
        method: 'POST',
        body: { device_sn: inverter.inverterSn },
      });
    } catch (errMin) {
      throw new Error(`Growatt: nenhuma rota reconheceu SN ${inverter.inverterSn}. Tentou inverter e min. Ultimo erro: ${errMin.message}`);
    }
  }

  // Normaliza campos. Growatt expoe nomes diferentes por tipo:
  //   inverter: ppv (power atual kW), eToday, eMonth, eTotal, temperature
  //   min:      pac, eacToday, eacMonth, eacTotal, temperature
  const n = (x) => (typeof x === 'number' ? x : (x != null ? parseFloat(x) : null));
  const normalizado = tipoTentado === 'min'
    ? {
        powerKw: n(data?.pac) != null ? n(data.pac) / 1000 : null, // pac vem em W
        generationKwhDay:   n(data?.eacToday ?? data?.eToday),
        generationKwhMonth: n(data?.eacMonth ?? data?.eMonth),
        generationKwhTotal: n(data?.eacTotal ?? data?.eTotal),
        inverterTempC:      n(data?.temperature1 ?? data?.temperature),
      }
    : {
        powerKw: n(data?.ppv),
        generationKwhDay:   n(data?.eToday),
        generationKwhMonth: n(data?.eMonth),
        generationKwhTotal: n(data?.eTotal),
        inverterTempC:      n(data?.temperature),
      };

  return {
    // Bateria / grid (Growatt puro geracao nao tem bateria — null)
    soc: null,
    batChargePower: null,
    batDischargePower: null,
    feedinPower: null,
    gridConsumptionPower: null,
    epsPower: null,
    runningState: null,
    currentFault: data?.warnCode ? String(data.warnCode) : null,

    // Geracao
    powerKw: normalizado.powerKw,
    generationKwhDay: normalizado.generationKwhDay,
    generationKwhMonth: normalizado.generationKwhMonth,
    generationKwhTotal: normalizado.generationKwhTotal,

    ambientTempC: null,
    inverterTempC: normalizado.inverterTempC,

    detalhes: null,
    rawPayload: data,
  };
}
