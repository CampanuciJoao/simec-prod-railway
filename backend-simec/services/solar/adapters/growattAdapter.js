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

// Growatt V1 tem dois modelos de conta:
//
//   1. Conta direta (shineserver): o token ja identifica o user; `/plant/list`
//      aceita chamada sem `C_user_id` ou com `C_user_id=0`. A doc antiga de 2016
//      marca o parametro como obrigatorio, mas na pratica o OpenAPI V1 moderno
//      aceita sem (retorna as plantas do proprio token).
//   2. Conta business/revendedor: o token enxerga N c_users. Nesses casos a
//      chamada sem `C_user_id` devolve lista vazia; e preciso primeiro listar
//      `user/c_user_list` e depois iterar `plant/list?C_user_id=<id>`.
//
// Pra funcionar nos dois casos, tentamos sem C_user_id; se a lista vier vazia
// (mas sem erro), caimos pro fluxo business. Isso tambem explica o sintoma
// "cadastrei o token e nenhum dado veio" — o portal gerou token business e o
// adapter antigo chamava direto.
async function listarTodasPlantas({ apiBase, token }) {
  const chamada = (path) => callGrowatt({ apiBase, token, path, method: 'GET' });

  let plantas = [];
  let avisoBusiness = null;

  try {
    const direto = await chamada('/v1/plant/list?page=1&perpage=100');
    plantas = direto?.plants || [];
  } catch (err) {
    avisoBusiness = err.message;
  }

  if (plantas.length > 0) return { plantas, modelo: 'direto' };

  try {
    const u = await chamada('/v1/user/c_user_list?page=1&perpage=100');
    const cUsers = u?.c_user || u?.c_users || [];
    if (cUsers.length === 0) {
      return {
        plantas: [],
        modelo: 'desconhecido',
        aviso: avisoBusiness || 'Token valido mas sem plantas nem c_users associados.',
      };
    }
    for (const cu of cUsers) {
      try {
        const cUserId = cu.c_user_id;
        const p = await chamada(`/v1/plant/list?C_user_id=${cUserId}&page=1&perpage=100`);
        plantas.push(...(p?.plants || []));
      } catch {
        // segue listando os outros c_users
      }
    }
    return { plantas, modelo: 'business' };
  } catch (err) {
    return {
      plantas: [],
      modelo: 'desconhecido',
      aviso: `Direto falhou (${avisoBusiness || 'vazio'}); c_user_list tambem falhou: ${err.message}`,
    };
  }
}

export async function validarCredencial(credential, apiBase) {
  try {
    const { plantas, modelo, aviso } = await listarTodasPlantas({
      apiBase: apiBase || defaultApiBase,
      token: credential.apiToken,
    });

    if (plantas.length === 0) {
      return {
        ok: false,
        erro:
          `Token aceito, mas nenhuma planta encontrada no portal Growatt. ` +
          (aviso ? `Detalhe: ${aviso}. ` : '') +
          'Verifique em openapi.growatt.com se o token tem permissao de leitura ' +
          'e se a conta esta associada a alguma planta ativa.',
      };
    }

    // Pra cada planta, pega devices. Limita a 10 plantas na validacao pra
    // nao estourar tempo em contas muito grandes.
    const devices = [];
    for (const p of plantas.slice(0, 10)) {
      const stationKwp = p.peak_power != null ? parseFloat(p.peak_power) : null;
      try {
        const dev = await callGrowatt({
          apiBase: apiBase || defaultApiBase,
          token: credential.apiToken,
          path: `/v1/device/list?plant_id=${p.plant_id}&page=1&perpage=50`,
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
      } catch {
        // Ignora erro em planta especifica — segue listando as outras.
      }
    }

    if (devices.length === 0) {
      return {
        ok: false,
        erro:
          `Encontrei ${plantas.length} planta(s) (modelo ${modelo}) mas nenhum device/inversor dentro delas. ` +
          'Verifique em openapi.growatt.com se o token enxerga os inversores das plantas.',
      };
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
