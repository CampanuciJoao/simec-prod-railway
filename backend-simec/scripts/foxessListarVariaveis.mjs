// Diagnostico: lista TODAS as variaveis que o inversor FoxESS devolve,
// pra descobrir o nome exato do SoC (e outras) do modelo H3 PRO.
//
// Uso: mesmas env vars de cadastrarFoxess.mjs (SIMEC_URL + credenciais).
//   node scripts/foxessListarVariaveis.mjs

const env = process.env;
const req = (k) => { const v = env[k]; if (!v) { console.error('faltou', k); process.exit(1); } return v; };

const SIMEC_URL = req('SIMEC_URL').replace(/\/$/, '');
const TENANT    = req('SIMEC_TENANT');
const USER      = req('SIMEC_USER');
const PASS      = req('SIMEC_PASS');
const INV_SN    = req('FOXESS_INVERTER_SN');

async function http(method, path, { token, body } = {}) {
  const res = await fetch(`${SIMEC_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  if (!res.ok) { console.error('HTTP', res.status, text); process.exit(1); }
  return json;
}

const login = await http('POST', '/api/auth/login', { body: { username: USER, senha: PASS, tenant: TENANT } });
const token = login?.accessToken || login?.token;

// Usa a rota interna de FoxESS que ja fizemos: fica mais simples do que montar signature aqui
// — reaproveitamos a chave encriptada que ja esta no banco pelo cadastro anterior.
// Nao temos rota de "query bruta" exposta — entao vou chamar a FoxESS DIRETO via script,
// mas pra isso preciso da API key em texto puro. Ela esta na env var do bootstrap.
const FOXESS_API_KEY = req('FOXESS_API_KEY');
const FOXESS_API_BASE = env.FOXESS_API_BASE || 'https://www.foxesscloud.com';

import crypto from 'crypto';
const path = '/op/v1/device/real/query';
const timestampMs = Date.now();
const signature = crypto.createHash('md5').update(`${path}\r\n${FOXESS_API_KEY}\r\n${timestampMs}`).digest('hex');

const res = await fetch(`${FOXESS_API_BASE}${path}`, {
  method: 'POST',
  headers: {
    'token': FOXESS_API_KEY,
    'timestamp': String(timestampMs),
    'signature': signature,
    'lang': 'pt',
    'Content-Type': 'application/json',
    'User-Agent': 'SIMEC-FoxessDiagnostico/1.0',
  },
  // Sem `variables` = retorna tudo
  body: JSON.stringify({ sns: [INV_SN] }),
});

const text = await res.text();
const json = JSON.parse(text);
if (json?.errno !== 0) { console.error('FoxESS errno:', json?.errno, json?.msg); process.exit(1); }

const device = json.result?.[0];
console.log('=== DEVICE ===');
console.log('SN:', device?.deviceSN);
console.log('Total variaveis:', device?.datas?.length);
console.log('');
console.log('=== TODAS AS VARIAVEIS ===');
for (const d of (device?.datas || [])) {
  console.log(`  ${d.variable.padEnd(30)} = ${String(d.value).padEnd(15)} ${d.unit || ''}`);
}

// Procura candidatos pra SoC
console.log('');
console.log('=== POSSIVEIS CANDIDATOS DE SoC ===');
const socLike = (device?.datas || []).filter((d) =>
  /soc|charge.*state|state.*charge|bat.*soc/i.test(d.variable)
);
for (const d of socLike) {
  console.log(`  ${d.variable} = ${d.value} ${d.unit || ''}`);
}
