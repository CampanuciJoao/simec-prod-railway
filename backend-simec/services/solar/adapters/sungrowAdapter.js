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

function buildHeaders(credential) {
  return {
    'x-access-key': credential.secretKey,
    'appkey': credential.appkey,
    'sys_code': '901',
    'Content-Type': 'application/json;charset=UTF-8',
    'lang': '_pt_BR',
    'User-Agent': USER_AGENT,
  };
}

async function callSungrow({ apiBase, credential, path, body = {} }) {
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  const fullBody = { appkey: credential.appkey, ...body };

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(credential),
    body: JSON.stringify(fullBody),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sungrow HTTP ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sungrow resposta nao-JSON em ${path}: ${text.slice(0, 200)}`);
  }

  // iSolarCloud: result_code === '1' = sucesso. Outros valores = erro.
  if (json?.result_code && String(json.result_code) !== '1') {
    throw new Error(`Sungrow erro em ${path}: result_code=${json.result_code} msg=${json.result_msg || 'sem msg'}`);
  }

  return json.result_data || json;
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

    // Pra cada station, busca devices rapido (limita a 5 pra nao demorar).
    const devices = [];
    for (const s of stations.slice(0, 5)) {
      const stationId = s.ps_id || s.psId || s.id;
      if (!stationId) continue;
      try {
        const devData = await callSungrow({
          apiBase: apiBase || defaultApiBase,
          credential,
          path: '/openapi/getDeviceList',
          body: { ps_id: stationId, device_type_list: [1] }, // 1 = inverter
        });
        for (const d of (devData?.pageList || devData?.list || [])) {
          devices.push({
            sn: d.device_sn || d.deviceSn,
            tipo: 'inverter',
            modelo: d.device_model_name || d.device_type_name || d.deviceModel,
            estacao: s.ps_name || s.psName || s.name,
            online: d.dev_status === 1 || d.dev_status === '1',
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
