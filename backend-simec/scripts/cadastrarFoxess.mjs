// Cadastra (ou atualiza) um site FoxESS via API do SIMEC.
//
// Uso:
//   SIMEC_URL='https://seu-backend-staging.up.railway.app'
//   SIMEC_TENANT='cerdil'
//   SIMEC_USER='seu.email@dominio' SIMEC_PASS='sua_senha'
//   FOXESS_API_KEY='chave-foxess'
//   FOXESS_UNIDADE_NOME='Cerdil Centro de Radiologia'    (nome EXATO da unidade)
//   FOXESS_INVERTER_SN='60KJ303064JP038'
//   FOXESS_BATERIA_SNS='60EP711063UP054,60EP711063UP052'
//   node scripts/cadastrarFoxess.mjs
//
// Fluxo:
//   1. Login via POST /api/auth/login (username, senha, tenant)
//   2. GET /api/unidades e acha a Unidade pelo nomeSistema
//   3. POST /api/foxess/sites/validar — testa a key (nao salva)
//   4. POST /api/foxess/sites — upsert do site
//   5. GET /api/foxess/sites/:id/status — confirma leitura

const env = process.env;
const req = (k) => {
  const v = env[k];
  if (!v) { console.error(`[FOXESS_CADASTRO] Variavel obrigatoria ausente: ${k}`); process.exit(1); }
  return v;
};

const SIMEC_URL  = req('SIMEC_URL').replace(/\/$/, '');
const TENANT     = req('SIMEC_TENANT');
const USER       = req('SIMEC_USER');
const PASS       = req('SIMEC_PASS');
const API_KEY    = req('FOXESS_API_KEY');
const UNIDADE    = req('FOXESS_UNIDADE_NOME');
const INV_SN     = req('FOXESS_INVERTER_SN');
const BAT_SNS    = (env.FOXESS_BATERIA_SNS || '').split(',').map((s) => s.trim()).filter(Boolean);
const API_BASE   = env.FOXESS_API_BASE || 'https://www.foxesscloud.com';
const MODELO     = env.FOXESS_MODELO_INVERSOR || 'H3 PRO';
const CAPACIDADE = env.FOXESS_CAPACIDADE_KWH ? Number(env.FOXESS_CAPACIDADE_KWH) : null;
const AUTONOMIA  = env.FOXESS_AUTONOMIA_HORAS ? Number(env.FOXESS_AUTONOMIA_HORAS) : null;

const log  = (...args) => console.log('[FOXESS_CADASTRO]', ...args);
const die  = (msg) => { console.error('[FOXESS_CADASTRO]', msg); process.exit(1); };

async function http(method, path, { token, body } = {}) {
  const res = await fetch(`${SIMEC_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* raw */ }
  if (!res.ok) {
    die(`HTTP ${res.status} em ${method} ${path}: ${(json?.message || json?.error || text).slice(0, 300)}`);
  }
  return json;
}

(async () => {
  log('Logando como', USER, 'no tenant', TENANT);
  const login = await http('POST', '/api/auth/login', {
    body: { username: USER, senha: PASS, tenant: TENANT },
  });
  const token = login?.accessToken || login?.token;
  if (!token) die(`Resposta de login sem accessToken: ${JSON.stringify(login).slice(0, 200)}`);
  log('Login OK');

  log('Buscando unidade pelo nome:', UNIDADE);
  const unidades = await http('GET', '/api/unidades', { token });
  const lista = Array.isArray(unidades) ? unidades : (unidades?.items || unidades?.data || []);
  const unidade = lista.find((u) => (u.nomeSistema || '').trim().toLowerCase() === UNIDADE.trim().toLowerCase());
  if (!unidade) {
    die(`Unidade "${UNIDADE}" nao encontrada. Opcoes: ${lista.map((u) => u.nomeSistema).join(' | ')}`);
  }
  log('Unidade encontrada:', unidade.id, unidade.nomeSistema);

  log('Validando API key FoxESS (nao salva)...');
  const validacao = await http('POST', '/api/foxess/sites/validar', {
    token,
    body: { apiKey: API_KEY, apiBase: API_BASE },
  });
  log('API key valida. Devices visiveis:', JSON.stringify(validacao?.devices).slice(0, 300));

  log('Upsert do site FoxESS...');
  const resultado = await http('POST', '/api/foxess/sites', {
    token,
    body: {
      unidadeId: unidade.id,
      nome: `${unidade.nomeSistema} - ${MODELO}`,
      apiKey: API_KEY,
      apiBase: API_BASE,
      inverterSn: INV_SN,
      bateriaSns: BAT_SNS,
      modeloInversor: MODELO,
      capacidadeKwh: CAPACIDADE,
      autonomiaHoras: AUTONOMIA,
    },
  });
  const siteId = resultado?.site?.id;
  if (!siteId) die('POST /sites nao devolveu site.id');
  log('Site cadastrado:', siteId);

  // Aguarda proximo ciclo do poller (~60s) e tenta ler status
  log('Aguardando 75s pra o primeiro ciclo do poller...');
  await new Promise((r) => setTimeout(r, 75000));

  log('Lendo /status...');
  const status = await http('GET', `/api/foxess/sites/${siteId}/status`, { token });
  console.log(JSON.stringify(status, null, 2));

  if (!status?.snapshot) {
    log('AVISO: ainda nao tem snapshot. Aguarde mais 1-2min e confira novamente.');
  } else {
    log('OK — primeiro snapshot capturado em', status.snapshot.capturedAt);
  }
})().catch((err) => die(err?.message || String(err)));
