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
      'sys_code': '901',
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
    const rc = String(json.result_code);
    const msg = json.result_msg || text.slice(0, 200);
    // result_code=3 (Unauthorized) e o mais comum: significa que a
    // Sungrow rejeitou appkey, secret_key ou redirect_uri. Nao e erro
    // no OAuth em si — e config errada no cadastro do inverter ou no
    // Developer Portal.
    if (rc === '3' || /unauthor/i.test(msg)) {
      throw new Error(
        `Sungrow token exchange falhou: result_code=${rc} msg=${msg}. ` +
        'Causas comuns (verifique no cadastro do inverter): ' +
        '(1) Secret Key digitado errado (sensivel a maiusculas/minusculas); ' +
        '(2) Redirect URI no Developer Portal Sungrow diferente de ' +
        'https://simec.cerdil.com.br/api/solar/sungrow/callback (precisa ser identico); ' +
        '(3) Application revogada ou nao publicada no portal; ' +
        '(4) Appkey nao corresponde a Application dessa conta iSolarCloud.'
      );
    }
    throw new Error(`Sungrow token exchange falhou: result_code=${rc} msg=${msg}`);
  }

  const data = json.result_data || json;
  const accessToken = data.access_token || data.accessToken;
  if (!accessToken) {
    // Nao houve result_code de erro, mas tambem nao veio token — algo
    // deu errado silenciosamente. Loga a resposta pra caso aconteca.
    console.error('[SUNGROW_TOKEN_EXCHANGE] resposta sem access_token:', text.slice(0, 500));
    throw new Error(`Sungrow nao retornou access_token. Resposta: ${text.slice(0, 200)}`);
  }
  // Log dos campos de expiracao — Sungrow tem historico de devolver 0 ou
  // formato nao-padrao, o que faria o SIMEC marcar o token como expirado
  // imediatamente apos obter.
  const rawExpiresIn = data.expires_in ?? data.expiresIn ?? data.expire_in;
  const expiresIn = Number(rawExpiresIn);
  console.log('[SUNGROW_TOKEN_EXCHANGE] expiresIn recebido:', {
    raw: rawExpiresIn,
    numerico: expiresIn,
    valido: Number.isFinite(expiresIn) && expiresIn > 0,
  });
  return {
    accessToken,
    refreshToken: data.refresh_token || data.refreshToken,
    // Se Sungrow devolver vazio/0, assume 24h (default do OAuth deles).
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 86400,
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
      'sys_code': '901',
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
    // IMPORTANTE: em chamadas DE DADOS (apos OAuth), x-access-key leva o
    // APPKEY (identifica a Application). O secretKey so e usado no fluxo
    // OAuth (exchange/refresh) — depois disso o pareamento e feito via
    // appkey + Bearer accessToken. Confundir os dois gera er_invalid_appkey.
    'x-access-key': credential.appkey,
    'Authorization': `Bearer ${credential.accessToken}`,
    'sys_code': '901',
    'User-Agent': USER_AGENT,
  };
}

// Buffer em memoria das ultimas chamadas, pra depuracao via endpoint.
// 20 ultimas requisicoes, com body/response mascarados. NAO persiste.
const DEBUG_RING = [];
const DEBUG_MAX = 20;
function pushDebug(entry) {
  DEBUG_RING.push({ ...entry, at: new Date().toISOString() });
  if (DEBUG_RING.length > DEBUG_MAX) DEBUG_RING.shift();
}
export function getUltimasChamadasSungrow() {
  return DEBUG_RING.slice().reverse();
}

// Nucleo HTTP — detecta "token expirado" e sinaliza pra o caller tentar refresh.
async function callSungrow({ apiBase, credential, path, body = {} }) {
  if (!credential.accessToken) {
    throw new Error('AUTHORIZATION_REQUIRED: credencial Sungrow precisa de autorizacao OAuth. Clique em "Autorizar Sungrow" no cadastro do inversor.');
  }
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  // IMPORTANTE: body contem apenas os campos documentados por endpoint
  // (ver doc oficial Sungrow v2). NAO incluir appkey/token/lang — campos
  // extras provocam er_unknown_exception. O accessToken vai apenas no
  // header Authorization Bearer; o secretKey no header x-access-key.
  const fullBody = { ...body };
  const res = await fetch(url, {
    method: 'POST',
    headers: headersComToken(credential),
    body: JSON.stringify(fullBody),
  });
  const text = await res.text();
  // Grava no ring de debug antes do parse/validacao (inclusive 500/non-JSON).
  pushDebug({
    path,
    bodyEnviado: { ...fullBody, token: '<mask>', appkey: '<mask>' },
    httpStatus: res.status,
    respostaCrua: text.slice(0, 2000),
  });
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
    // Sem filtro valid_flag — lista TODAS as plantas visiveis pelo token
    // (estados 0, 1, 2, 3 = pendente, normal, offline, atencao). Isso
    // revela quando a conta iSolarCloud autenticada tem plantas em
    // estados que nao sao "normal" — comum em instalacoes novas ou
    // recem-aprovadas.
    const data = await callSungrow({
      apiBase: apiBase || defaultApiBase,
      credential,
      path: '/openapi/platform/queryPowerStationList',
      // Doc oficial Sungrow: page (nao curPage). ps_type lista todos tipos
      // (1=Utility, 3=Distributed PV, 4=Residential, 5=Residential ESS,
      // 6=Village, 7=Distributed ESS, 8=Poverty, 9=Wind, 12=C&I ESS).
      // valid_flag: "1,3" = Normal + Connected (padrao doc).
      body: {
        ps_type: '1,3,4,5,6,7,8,12',
        valid_flag: '1,3',
        page: 1,
        size: 100,
      },
    });
    const stations = data?.pageList || data?.list || [];
    const toNum = (x) => {
      if (x == null) return null;
      const n = typeof x === 'number' ? x : parseFloat(x);
      return Number.isFinite(n) ? n : null;
    };

    // Debug: log numero de stations e nomes (ajuda a entender quando
    // vem vazio apesar do token OK).
    console.log(`[SUNGROW_VALIDAR] ${stations.length} station(s) visivel(eis) pelo token.`,
      stations.slice(0, 5).map((s) => ({
        ps_id: s.ps_id || s.psId,
        name: s.ps_name || s.psName || s.name,
        valid_flag: s.valid_flag || s.validFlag,
      }))
    );

    const devices = [];
    for (const s of stations.slice(0, 10)) {
      const stationId = s.ps_id || s.psId || s.id;
      if (!stationId) continue;
      let stationKwp = toNum(s.install_capacity ?? s.installedCapacity ?? s.ps_capacity);
      if (stationKwp != null && stationKwp > 10000) stationKwp = stationKwp / 1000;
      try {
        const devData = await callSungrow({
          apiBase: apiBase || defaultApiBase,
          credential,
          path: '/openapi/platform/getDeviceListByPsId',
          // device_type_list vazio = todos os tipos (inversor, bateria, meter).
          // Filtrar so [1] = inversor geral exclui modelos hibridos (type 14)
          // e string inverters de alguns modelos — melhor pegar tudo e deixar
          // o SN cadastrado filtrar.
          // Doc oficial Sungrow getDeviceListByPsId: ps_id STRING, page/size
          // integer. Sem appkey/token/lang no body (vai no header).
          body: { ps_id: String(stationId), page: 1, size: 100 },
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

    // Enriquece o retorno com a lista de stations (ajuda diagnostico quando
    // ha stations mas nenhum device dentro — ou nenhuma station).
    const stationsResumo = stations.map((s) => ({
      ps_id: s.ps_id || s.psId,
      nome: s.ps_name || s.psName || s.name,
    }));

    if (devices.length === 0) {
      return {
        ok: false,
        erro: stations.length === 0
          ? 'Token valido mas nenhuma planta encontrada. A conta iSolarCloud usada no OAuth nao tem plantas vinculadas. Refaca o OAuth logando com a conta Sungrow que gerencia essas plantas.'
          : `Encontrei ${stations.length} planta(s) mas nenhum device/inversor dentro. Verifique no portal iSolarCloud se os inversores estao vinculados a essas plantas.`,
        stations: stationsResumo,
        devices: [],
      };
    }

    return { ok: true, devices, stations: stationsResumo };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

// Pontos de inversor PV (device_type=1). IDs sem prefixo no REQUEST.
// A resposta devolve com 'p' prefixado (p24, p1 ...) mas o pedido usa
// a forma crua ("24", "1"). Conforme doc oficial Sungrow Appendix 10.
const POINTS_INVERTER_PV = [
  '24',   // Total Active Power (W)
  '1',    // Yield Today (Wh)
  '2',    // Total Yield (Wh)
  '87',   // Yield This Month (Wh)
  '88',   // Yield This Year (Wh)
  '4',    // Internal Air Temperature (C)
  '29',   // Operating status
  '27',   // Grid Frequency (Hz)
];

// Pontos de inversor hibrido/ESS (device_type=14) — Apendice 10 ESS.
const POINTS_INVERTER_ESS = [
  '13011', // Active Power (W)
  '13112', // Daily PV Yield (Wh)
  '13134', // Total PV Yield (Wh)
  '13141', // Battery SOC
  '13142', // Battery SOH
  '13143', // Battery Temperature (C)
  '13126', // Battery Charging Power (W)
  '13150', // Battery Discharging Power (W)
  '13121', // Feed-in Power (W)
  '13149', // Purchased Power (W)
  '13119', // Load Power (W)
  '13019', // Internal Air Temperature (C)
  '13146', // Operating status
];

export async function fetchSnapshot(inverter) {
  if (!inverter.credential?.accessToken) {
    const err = new Error('AUTHORIZATION_REQUIRED');
    err.code = 'AUTHORIZATION_REQUIRED';
    throw err;
  }

  // Sungrow rejeita SN com whitespace. Trim defensivo.
  const sn = String(inverter.inverterSn || '').trim();

  // Sungrow tem varios device_types: 1 (inversor generico), 11 (string
  // inverter — comum em C&I 40-100kW), 14 (hibrido/ESS), 22 (combiner).
  // Tenta cada um ate achar payload com pontos preenchidos. Sucesso HTTP
  // sem dados = device_type errado, nao autorizacao.
  const TENTATIVAS = [
    { deviceType: 1,  points: POINTS_INVERTER_PV,  label: 'PV generico' },
    { deviceType: 11, points: POINTS_INVERTER_PV,  label: 'String inverter' },
    { deviceType: 14, points: POINTS_INVERTER_ESS, label: 'Hibrido/ESS' },
  ];

  let data = null;
  let deviceType = 1;
  let errosTentativas = [];

  for (const t of TENTATIVAS) {
    try {
      const resp = await callSungrow({
        apiBase: inverter.apiBase,
        credential: inverter.credential,
        path: '/openapi/platform/getDeviceRealTimeData',
        body: {
          // Doc oficial Sungrow: device_type STRING (nao integer).
          device_type: String(t.deviceType),
          point_id_list: t.points,
          sn_list: [sn],
        },
      });
      // Considera "sucesso util" se trouxe device_point com pelo menos um
      // ponto numerico (p24, p1, p13011, etc). Sem isso, Sungrow devolve
      // array vazio e nao adianta parar aqui.
      const dp = resp?.device_point_list?.[0]?.device_point;
      const temPontosReais = dp && Object.keys(dp).some((k) => /^p\d+$/.test(k) && dp[k] != null && dp[k] !== '');
      if (temPontosReais) {
        data = resp;
        deviceType = t.deviceType;
        break;
      }
      errosTentativas.push(`device_type=${t.deviceType} (${t.label}): sem pontos`);
    } catch (err) {
      if (err.code === 'TOKEN_EXPIRED') throw err;
      errosTentativas.push(`device_type=${t.deviceType} (${t.label}): ${err.message}`);
    }
  }

  if (!data) {
    throw new Error(`Sungrow: nenhum device_type reconheceu SN ${sn}. Tentativas: ${errosTentativas.join(' | ')}`);
  }

  // Resposta oficial Sungrow: device_point_list[].device_point e um
  // OBJETO (nao array) com chaves tipo p24, p1, etc. Exemplo:
  //   { device_point: { ps_key: "...", device_sn: "...", p24: "4500.0", p1: "320.0" } }
  const v = data?.device_point_list?.[0]?.device_point || {};
  const n = (x) => {
    if (x == null) return null;
    const num = typeof x === 'number' ? x : parseFloat(x);
    return Number.isFinite(num) ? num : null;
  };
  // Doc: "Unidades sempre na menor unidade: Wh, W, A, V" — converter W→kW, Wh→kWh.
  const wToKw = (x) => { const r = n(x); return r == null ? null : r / 1000; };

  if (deviceType === 1 || deviceType === 11) {
    // Inversor PV puro (sem bateria) — device_type 1 (generico) ou
    // 11 (String Inverter C&I) compartilham o mesmo mapa de pontos.
    return {
      soc: null,
      batChargePower: null, batDischargePower: null,
      feedinPower: null, gridConsumptionPower: null, epsPower: null,
      runningState: n(v.p29),
      currentFault: null,
      powerKw: wToKw(v.p24),
      generationKwhDay:   wToKw(v.p1),
      generationKwhMonth: wToKw(v.p87),
      generationKwhTotal: wToKw(v.p2),
      ambientTempC: null,
      inverterTempC: n(v.p4),
      detalhes: null,
      rawPayload: data,
    };
  }

  // device_type=14 — Hibrido/ESS (com bateria)
  return {
    soc: n(v.p13141),
    batChargePower: wToKw(v.p13126),
    batDischargePower: wToKw(v.p13150),
    feedinPower: wToKw(v.p13121),
    gridConsumptionPower: wToKw(v.p13149),
    epsPower: null,
    runningState: n(v.p13146),
    currentFault: null,
    powerKw: wToKw(v.p13011),
    generationKwhDay:   wToKw(v.p13112),
    generationKwhMonth: null,
    generationKwhTotal: wToKw(v.p13134),
    ambientTempC: null,
    inverterTempC: n(v.p13019),
    detalhes: [{
      tipo: 'bateria',
      soc: n(v.p13141),
      soh: n(v.p13142),
      tempC: n(v.p13143),
      powerKw: wToKw(v.p13126) ?? wToKw(v.p13150),
    }],
    rawPayload: data,
  };
}

// ─── fetchFalhas — getFaultAlarmInfo (Apendice 10 da doc oficial) ───────────
//
// Retorna falhas abertas (process_status=8) nas ultimas 24h. Cada falha vem
// com fault_code unico (ex "66296.202408.5516fd3031855") que usamos como
// chave de dedupe no SolarFalha.codigoExterno. fault_type_code mapeia pro
// Apendice 9 (60001 Grid Overvoltage, 60002 Grid Undervoltage, etc).

export async function fetchFalhas(inverter) {
  if (!inverter.credential?.accessToken) {
    const err = new Error('AUTHORIZATION_REQUIRED');
    err.code = 'AUTHORIZATION_REQUIRED';
    throw err;
  }

  // Doc Sungrow: sem datas = mes corrente. process_status=8 = abertas.
  const data = await callSungrow({
    apiBase: inverter.apiBase,
    credential: inverter.credential,
    path: '/openapi/platform/getFaultAlarmInfo',
    body: {
      process_status: '8',
      fault_type: '1,2,3,4',
      page: '1',
      size: '50',
    },
  });

  const lista = data?.pageList || data?.list || [];
  return lista
    .filter((f) => f.fault_code)
    .map((f) => ({
      codigoExterno: String(f.fault_code),
      codigoTipo: f.fault_type_code != null ? String(f.fault_type_code) : null,
      nome: f.fault_name || f.fault_desc || 'Falha sem nome',
      descricao: f.fault_desc || null,
      nivel: Number(f.fault_type) || 2,
      codigoReason: f.fault_reason || null,
      reportadaEm: f.create_time ? new Date(f.create_time) : new Date(),
      rawPayload: f,
    }));
}

