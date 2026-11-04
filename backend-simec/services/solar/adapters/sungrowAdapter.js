// Sungrow adapter — iSolarCloud OpenAPI.
//
// Auth model (descoberto via libs pysolarcloud/sungrow-isolarcloud):
//   - 3 credenciais: Appkey (publica), Secret Key (shared secret),
//     RSA Public Key (da Sungrow — usada se E2E encryption ligada)
//   - Headers em CADA request:
//       x-access-key : Secret Key
//       appkey       : Appkey
//       sys_code     : '901' (fixo pra integracoes OEM/custom), as vezes '900'
//       Content-Type : application/json;charset=UTF-8
//       lang         : '_en_US' (ou '_pt_BR' quando suportado)
//   - Body JSON com appkey + outros parametros do endpoint
//
// E2E encryption via RSA eh opcional — por default mandamos requests
// nao-encriptadas (mais simples, Sungrow aceita). Se for necessario
// ligar E2E depois, basta usar o rsaPublicKey pra encriptar uma AES
// key e enviar no header 'x-random-secret-key'. Mantemos como extensao
// futura; a implementacao inicial segue sem encriptacao.
//
// Endpoints principais (sao `POST` com body JSON):
//   POST /openapi/getPowerStationList    lista das estacoes do app/org
//   POST /openapi/getDeviceList          devices (inversores) de uma estacao
//   POST /openapi/getDeviceRealTimeData  telemetria em tempo real
//
// Taxa de atualizacao: Sungrow atualiza dados a cada ~5min no cloud
// — chamadas mais frequentes retornam o mesmo payload. Nosso poll de 60s
// e redundante aqui, mas nao causa problema (apenas dados repetidos).

export const id = 'sungrow';
export const label = 'Sungrow';

export const credentialFields = [
  {
    name: 'appkey',
    label: 'Appkey',
    type: 'text',
    required: true,
    help: 'Copie do Developer Portal > sua Application > Appkey.',
  },
  {
    name: 'secretKey',
    label: 'Secret Key',
    type: 'password',
    required: true,
    help: 'Copie do Developer Portal > sua Application > Secret key.',
  },
  {
    name: 'rsaPublicKey',
    label: 'RSA Public Key (opcional)',
    type: 'text',
    required: false,
    help: 'Copie se seu app exige E2E encryption. Deixe vazio se nao exigir.',
  },
];

export const defaultApiBase = 'https://gateway.isolarcloud.com';

export const apiBaseOptions = [
  { value: 'https://gateway.isolarcloud.com',    label: 'Global (gateway.isolarcloud.com)' },
  { value: 'https://gateway.isolarcloud.eu',     label: 'Europa (gateway.isolarcloud.eu)' },
  { value: 'https://augateway.isolarcloud.com',  label: 'Oceania (augateway.isolarcloud.com)' },
  { value: 'https://cngateway.isolarcloud.com',  label: 'China (cngateway.isolarcloud.com)' },
];

const USER_AGENT = 'SIMEC-SolarAdapter/1.0';

function buildHeaders(credential, sysCode) {
  return {
    'x-access-key': credential.secretKey,
    'appkey': credential.appkey,
    'sys_code': sysCode,
    'Content-Type': 'application/json;charset=UTF-8',
    'lang': '_pt_BR',
    'User-Agent': USER_AGENT,
  };
}

async function fazerRequest({ url, headers, body }) {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { httpOk: res.ok, httpStatus: res.status, text, json };
}

async function callSungrow({ apiBase, credential, path, body = {} }) {
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  const fullBody = { appkey: credential.appkey, ...body };

  // Tenta sys_code '901' primeiro (OEM/custom integrations). Se vier
  // er_invalid_appkey ou similar, retry com '900' (standard). Isso cobre
  // a maioria dos tipos de app sem exigir configuracao do admin — a
  // Sungrow nao expoe claramente qual sys_code vai com cada tier de app.
  const sysCodesPraTentar = ['901', '900'];
  let ultimaRespostaErro = null;

  for (const sysCode of sysCodesPraTentar) {
    const resp = await fazerRequest({
      url,
      headers: buildHeaders(credential, sysCode),
      body: fullBody,
    });

    if (!resp.httpOk) {
      ultimaRespostaErro = `HTTP ${resp.httpStatus} (sys_code=${sysCode}): ${resp.text.slice(0, 200)}`;
      continue;
    }

    if (!resp.json) {
      ultimaRespostaErro = `resposta nao-JSON (sys_code=${sysCode}): ${resp.text.slice(0, 200)}`;
      continue;
    }

    // Sucesso: result_code '1' (ou 1 int). Alguns tenants retornam 0.
    if (!resp.json.result_code || String(resp.json.result_code) === '1' || String(resp.json.result_code) === '0') {
      return resp.json.result_data || resp.json;
    }

    const msg = `result_code=${resp.json.result_code} msg=${resp.json.result_msg || 'sem msg'}`;

    // Se o erro e relacionado a sys_code/appkey, tenta a proxima variacao.
    const errStr = String(resp.json.result_code || '') + ' ' + String(resp.json.result_msg || '');
    if (/sys_code|invalid.?appkey|E00000|E009/i.test(errStr)) {
      ultimaRespostaErro = msg;
      continue;
    }

    // Erro legitimo da aplicacao (nao auth) — propaga imediatamente.
    throw new Error(`Sungrow erro em ${path}: ${msg}`);
  }

  throw new Error(`Sungrow erro em ${path} apos tentar sys_code [${sysCodesPraTentar.join(', ')}]: ${ultimaRespostaErro}`);
}

export async function validarCredencial(credential, apiBase) {
  try {
    const data = await callSungrow({
      apiBase: apiBase || defaultApiBase,
      credential,
      path: '/openapi/getPowerStationList',
      body: { curPage: 1, size: 20 },
    });

    const stations = data?.pageList || data?.list || [];
    const toNum = (x) => {
      if (x == null) return null;
      const n = typeof x === 'number' ? x : parseFloat(x);
      return Number.isFinite(n) ? n : null;
    };

    // Pra cada station, busca devices rapido (limita a 5 pra nao demorar).
    // Inclui install_capacity (kWp da estacao) e nominal_power (kW do inversor)
    // pra auto-preenchimento na UI.
    const devices = [];
    for (const s of stations.slice(0, 5)) {
      const stationId = s.ps_id || s.psId || s.id;
      if (!stationId) continue;
      // install_capacity vem em kWp; alguns tenants expoem em W — se >10000, divide
      let stationKwp = toNum(s.install_capacity ?? s.installedCapacity ?? s.ps_capacity);
      if (stationKwp != null && stationKwp > 10000) stationKwp = stationKwp / 1000;

      try {
        const devData = await callSungrow({
          apiBase: apiBase || defaultApiBase,
          credential,
          path: '/openapi/getDeviceList',
          body: { ps_id: stationId, device_type_list: [1] }, // 1 = inverter
        });
        for (const d of (devData?.pageList || devData?.list || [])) {
          // nominal_power em Sungrow geralmente em W — normaliza pra kW
          let capKw = toNum(d.nominal_power ?? d.inverter_capacity ?? d.rated_power);
          if (capKw != null && capKw > 1000) capKw = capKw / 1000;
          devices.push({
            sn:           d.device_sn || d.deviceSn,
            tipo:         'inverter',
            modelo:       d.device_model_name || d.device_type_name || d.deviceModel,
            capacidadeKw: capKw,
            estacao:      s.ps_name || s.psName || s.name,
            stationKwp,
            online:       d.dev_status === 1 || d.dev_status === '1',
          });
        }
      } catch { /* ignora station individual */ }
    }

    return { ok: true, devices };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

export async function fetchSnapshot(inverter) {
  // Real-time data requer passar o SN e o tipo de dispositivo.
  // device_type=1 = inverter string, 11 = hybrid inverter.
  // Pra plantas so de geracao assumimos 1; se nao der certo, pode
  // cair pra 11. Backlog: deixar config por planta.
  let data = null;
  try {
    data = await callSungrow({
      apiBase: inverter.apiBase,
      credential: inverter.credential,
      path: '/openapi/getDeviceRealTimeData',
      body: {
        device_type: 1,
        point_id_list: [],   // vazio = retorna todos os points disponiveis
        sn_list: [inverter.inverterSn],
      },
    });
  } catch (err) {
    // Tenta com device_type=11 (hybrid) se o SN nao for reconhecido como type 1
    try {
      data = await callSungrow({
        apiBase: inverter.apiBase,
        credential: inverter.credential,
        path: '/openapi/getDeviceRealTimeData',
        body: {
          device_type: 11,
          point_id_list: [],
          sn_list: [inverter.inverterSn],
        },
      });
    } catch (errH) {
      throw new Error(`Sungrow: nenhum device_type reconheceu SN ${inverter.inverterSn}. Tentou 1 (string) e 11 (hybrid). Erro: ${errH.message}`);
    }
  }

  // Normaliza o shape — Sungrow devolve `device_point_list` com items {point_id, point_name, value}
  // ou `device_point` dependendo da versao da API. Flatten pra um map plano.
  const pointList = data?.device_point_list?.[0]?.device_point
                 || data?.device_point_list?.[0]?.point_list
                 || data?.device_point_list
                 || [];
  const v = {};
  for (const p of pointList) {
    const key = p.point_code || p.point_id || p.pointCode;
    if (key != null) {
      const num = typeof p.value === 'number' ? p.value : parseFloat(p.value);
      v[key] = Number.isFinite(num) ? num : p.value;
    }
  }

  // Mapeamento de point_codes mais comuns (pode variar por modelo):
  //   p24   -> active power (kW)
  //   p83022 -> daily yield (kWh)
  //   p83025 -> monthly yield (kWh)
  //   p83004 -> total yield (kWh)
  //   p13   -> inverter temp (C)
  //   p30   -> device status (1=run, 2=stop, 3=fault)
  const n = (x) => (typeof x === 'number' ? x : (x != null ? parseFloat(x) : null));

  return {
    soc: null, batChargePower: null, batDischargePower: null,
    feedinPower: null, gridConsumptionPower: null, epsPower: null,
    runningState: null,
    currentFault: v.p30 === 3 ? 'FAULT' : null,

    powerKw: n(v.p24 ?? v.p83032),
    generationKwhDay:   n(v.p83022),
    generationKwhMonth: n(v.p83025),
    generationKwhTotal: n(v.p83004),

    ambientTempC: null,
    inverterTempC: n(v.p13 ?? v.p12),

    detalhes: null,
    rawPayload: data,
  };
}
