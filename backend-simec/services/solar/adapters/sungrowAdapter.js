// Sungrow adapter — iSolarCloud OpenAPI com OAuth 2.0.
//
// O Free plan da Sungrow exige OAuth 2.0 (nao aceita chamadas diretas
// com appkey). Fluxo:
//
//   1. Admin cadastra o inverter com appkey + secret_key pela UI
//   2. UI mostra badge "Precisa autorizar" + botao "Autorizar Sungrow"
//   3. Backend gera authorize URL (POST /inverters/:id/sungrow/authorize)
//      embedando o inverterId em um state assinado JWT
//   4. User abre essa URL numa nova aba, autoriza na Sungrow
//   5. Sungrow redireciona pra /api/solar/sungrow/oauth/callback?code=X&state=Y
//   6. Callback valida state, extrai inverterId, exchange code -> tokens,
//      salva tokens em credentialCrypt do inverter
//   7. fetchSnapshot agora usa access_token nos requests; se 401, usa
//      refresh_token pra renovar e tenta de novo
//
// Shape de credential (apos OAuth completo):
//   {
//     appkey:        'F5C...',
//     secretKey:     'zve...',
//     rsaPublicKey:  '...' (opcional),
//     accessToken:   'eyJ...',
//     refreshToken:  'eyJ...',
//     expiresAt:     1730765432000  (ms)
//   }
//
// Pre-OAuth (credential acabou de ser salva, user ainda nao autorizou):
//   { appkey, secretKey, rsaPublicKey } — fetchSnapshot vai levantar erro
//   AUTHORIZATION_REQUIRED, que a UI usa pra mostrar o badge.

export const id = 'sungrow';
export const label = 'Sungrow';

export const credentialFields = [
  {
    name: 'appkey',
    label: 'Appkey',
    type: 'text',
    required: true,
    help: 'Developer Portal > sua Application > Appkey.',
  },
  {
    name: 'secretKey',
    label: 'Secret Key',
    type: 'password',
    required: true,
    help: 'Developer Portal > sua Application > Secret key.',
  },
  {
    name: 'applicationId',
    label: 'Application ID',
    type: 'text',
    required: true,
    help: 'Numero que aparece na Authorization URL do portal (ex: applicationId=4709).',
  },
  {
    name: 'cloudId',
    label: 'Cloud ID',
    type: 'text',
    required: true,
    help: 'Numero que aparece na Authorization URL (ex: cloudId=2). Identifica a regiao da conta Sungrow.',
  },
  {
    name: 'rsaPublicKey',
    label: 'RSA Public Key (opcional)',
    type: 'text',
    required: false,
    help: 'Copie se seu app exige E2E encryption. Deixe vazio se nao exigir.',
  },
];

// URLs oficiais Sungrow (doc 2026):
//   China:          https://gateway.isolarcloud.com/
//   International:  https://gateway.isolarcloud.com.hk/  <- BR usa este
//   Europa:         https://gateway.isolarcloud.eu/
//   Australia:      https://augateway.isolarcloud.com/
//   India:          https://gateway.isolarcloud.in/
export const defaultApiBase = 'https://gateway.isolarcloud.com.hk';

export const apiBaseOptions = [
  { value: 'https://gateway.isolarcloud.com.hk', label: 'International / Brasil (gateway.isolarcloud.com.hk)' },
  { value: 'https://gateway.isolarcloud.com',    label: 'China (gateway.isolarcloud.com)' },
  { value: 'https://gateway.isolarcloud.eu',     label: 'Europa (gateway.isolarcloud.eu)' },
  { value: 'https://augateway.isolarcloud.com',  label: 'Oceania (augateway.isolarcloud.com)' },
  { value: 'https://gateway.isolarcloud.in',     label: 'India (gateway.isolarcloud.in)' },
];

// Flag para a UI saber que este provider exige fluxo OAuth separado
// depois de salvar a credencial (nao e plug-and-play como FoxESS/Growatt).
export const requerOAuth = true;

const USER_AGENT = 'SIMEC-SolarAdapter/1.0';

// ─── OAuth URLs ──────────────────────────────────────────────────────────────
//
// A Sungrow NAO usa OAuth2 padrao — ela expoe a URL de autorizacao no
// proprio Developer Portal, e o formato e:
//   https://web3.isolarcloud.com.hk/#/authorized-app
//     ?cloudId=<cloudId>
//     &applicationId=<applicationId>
//     &redirectUrl=<redirectUri URL-encoded>
//
// Observe: sem `state`, `response_type`, `app_key`, `client_id` etc.
// A Sungrow tem seu proprio esquema pre-OAuth2. State e feito de fora
// (aqui no backend) e mantido em memoria/Redis — Sungrow nao devolve
// state pra gente no callback.

export function getAuthorizeUrl({ credential, redirectUri }) {
  const base = 'https://web3.isolarcloud.com.hk/#/authorized-app';
  const params = new URLSearchParams({
    cloudId: String(credential.cloudId || ''),
    applicationId: String(credential.applicationId || ''),
    redirectUrl: redirectUri,
  });
  return `${base}?${params.toString()}`;
}

export async function exchangeCodeForToken({ apiBase, appkey, secretKey, code, redirectUri }) {
  // Endpoint segundo a doc de Developer Portal (Fluxo OAuth 2.0 iSolarCloud)
  //
  // Importante: o body DEVE incluir redirect_uri (mesmo valor passado
  // na authorize URL). Sem isso a Sungrow devolve erro ou resposta
  // vazia sem explicar. Padrao OAuth2 (RFC 6749 sec. 4.1.3).
  const url = `${apiBase.replace(/\/$/, '')}/openapi/apiManage/token`;
  const body = {
    appkey,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'x-access-key': secretKey,
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    console.error('[SUNGROW_TOKEN_EXCHANGE] resposta nao-JSON:', text.slice(0, 500));
    throw new Error(`Sungrow token: resposta nao-JSON: ${text.slice(0,200)}`);
  }

  // Log verboso pra diagnostico — mascarando tokens.
  const resumoDebug = {
    httpStatus: res.status,
    result_code: json.result_code,
    result_msg: json.result_msg,
    req_serial_num: json.req_serial_num,
    temAccessToken: Boolean(json.access_token || json.result_data?.access_token),
    temRefreshToken: Boolean(json.refresh_token || json.result_data?.refresh_token),
  };
  console.log('[SUNGROW_TOKEN_EXCHANGE] resposta:', resumoDebug);

  if (json.result_code && String(json.result_code) !== '1') {
    throw new Error(`Sungrow token exchange falhou: result_code=${json.result_code} msg=${json.result_msg || text.slice(0, 200)}`);
  }

  const data = json.result_data || json;
  const accessToken = data.access_token || data.accessToken;
  if (!accessToken) {
    // Nao houve result_code de erro, mas tambem nao veio token — algo
    // deu errado silenciosamente. Loga a resposta pra caso aconteca.
    console.error('[SUNGROW_TOKEN_EXCHANGE] resposta sem access_token:', text.slice(0, 500));
    throw new Error(`Sungrow nao retornou access_token. Resposta: ${text.slice(0, 200)}`);
  }
  return {
    accessToken,
    refreshToken: data.refresh_token || data.refreshToken,
    expiresIn: Number(data.expires_in || data.expiresIn || 86400),
  };
}

export async function refreshAccessToken({ apiBase, appkey, secretKey, refreshToken }) {
  // Per pysolarcloud (bugjam) o body do refresh e so appkey + refresh_token
  // (sem grant_type). Pode ser que a Sungrow aceite ambos, mas vamos
  // seguir a implementacao de referencia pra reduzir chance de erro.
  const url = `${apiBase.replace(/\/$/, '')}/openapi/apiManage/refreshToken`;
  const body = { appkey, refresh_token: refreshToken };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'x-access-key': secretKey,
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Sungrow refresh: resposta nao-JSON: ${text.slice(0,200)}`);
  }
  if (json.result_code && String(json.result_code) !== '1') {
    throw new Error(`Sungrow refresh falhou: result_code=${json.result_code} msg=${json.result_msg || text.slice(0, 200)}`);
  }
  const data = json.result_data || json;
  const accessToken = data.access_token || data.accessToken;
  if (!accessToken) {
    throw new Error(`Sungrow refresh sem access_token. Resposta: ${text.slice(0, 200)}`);
  }
  return {
    accessToken,
    refreshToken: data.refresh_token || data.refreshToken || refreshToken,
    expiresIn: Number(data.expires_in || data.expiresIn || 86400),
  };
}

// ─── Chamadas API com access_token ───────────────────────────────────────────

// Headers pra chamadas de dados (apos OAuth) seguindo doc Sungrow 2026:
//   Content-Type: application/json;charset=UTF-8
//   x-access-key: <secretKey>
//   Authorization: Bearer <access_token>   <- token vai AQUI, nao no body
function headersComToken(credential) {
  return {
    'Content-Type': 'application/json;charset=UTF-8',
    'x-access-key': credential.secretKey,
    'Authorization': `Bearer ${credential.accessToken}`,
    'User-Agent': USER_AGENT,
  };
}

// Nucleo HTTP — detecta "token expirado" e sinaliza pra o caller tentar refresh.
async function callSungrow({ apiBase, credential, path, body = {} }) {
  if (!credential.accessToken) {
    throw new Error('AUTHORIZATION_REQUIRED: credencial Sungrow precisa de autorizacao OAuth. Clique em "Autorizar Sungrow" no cadastro do inversor.');
  }
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  // Body: appkey + lang + params do endpoint (SEM token — token vai no header)
  const fullBody = { appkey: credential.appkey, lang: '_pt_BR', ...body };
  const res = await fetch(url, {
    method: 'POST',
    headers: headersComToken(credential),
    body: JSON.stringify(fullBody),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Sungrow resposta nao-JSON em ${path}: ${text.slice(0, 200)}`);
  }

  if (json.result_code && String(json.result_code) !== '1' && String(json.result_code) !== '0') {
    const errStr = String(json.result_code) + ' ' + String(json.result_msg || '');
    if (/E00002|invalid.?token|token.?expir|E009|unauthor/i.test(errStr)) {
      const e = new Error(`Sungrow token invalido/expirado: ${json.result_msg || json.result_code}`);
      e.code = 'TOKEN_EXPIRED';
      throw e;
    }
    throw new Error(`Sungrow erro em ${path}: result_code=${json.result_code} msg=${json.result_msg || 'sem msg'}`);
  }

  return json.result_data || json;
}

// ─── validarCredencial / fetchSnapshot (interface padrao) ────────────────────

export async function validarCredencial(credential, apiBase) {
  // Sem OAuth ainda: sinaliza que precisa autorizar (nao e erro de fato).
  if (!credential.accessToken) {
    return {
      ok: false,
      precisaAutorizar: true,
      erro: 'Credencial salva, mas ainda precisa autorizar via OAuth. Clique em "Autorizar Sungrow" para completar.',
    };
  }

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

    const devices = [];
    for (const s of stations.slice(0, 5)) {
      const stationId = s.ps_id || s.psId || s.id;
      if (!stationId) continue;
      let stationKwp = toNum(s.install_capacity ?? s.installedCapacity ?? s.ps_capacity);
      if (stationKwp != null && stationKwp > 10000) stationKwp = stationKwp / 1000;
      try {
        const devData = await callSungrow({
          apiBase: apiBase || defaultApiBase,
          credential,
          path: '/openapi/getDeviceList',
          body: { ps_id: stationId, device_type_list: [1] },
        });
        for (const d of (devData?.pageList || devData?.list || [])) {
          let capKw = toNum(d.nominal_power ?? d.inverter_capacity ?? d.rated_power);
          if (capKw != null && capKw > 1000) capKw = capKw / 1000;
          devices.push({
            sn: d.device_sn || d.deviceSn,
            tipo: 'inverter',
            modelo: d.device_model_name || d.device_type_name || d.deviceModel,
            capacidadeKw: capKw,
            estacao: s.ps_name || s.psName || s.name,
            stationKwp,
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
  if (!inverter.credential?.accessToken) {
    const err = new Error('AUTHORIZATION_REQUIRED');
    err.code = 'AUTHORIZATION_REQUIRED';
    throw err;
  }

  let data = null;
  try {
    data = await callSungrow({
      apiBase: inverter.apiBase,
      credential: inverter.credential,
      path: '/openapi/getDeviceRealTimeData',
      body: {
        device_type: 1,
        point_id_list: [],
        sn_list: [inverter.inverterSn],
      },
    });
  } catch (err) {
    if (err.code === 'TOKEN_EXPIRED') {
      // Propaga pro poller cuidar do refresh (poller acessa o banco pra
      // persistir o novo token). Adapter em si nao persiste.
      throw err;
    }
    // Tenta device_type=11 (hybrid)
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
      if (errH.code === 'TOKEN_EXPIRED') throw errH;
      throw new Error(`Sungrow: nenhum device_type reconheceu SN ${inverter.inverterSn}. Erro: ${errH.message}`);
    }
  }

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
