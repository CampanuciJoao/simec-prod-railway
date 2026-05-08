import { chromium } from 'playwright';
import prisma from '../prismaService.js';
import { encryptToken, decryptToken } from './gehcCrypto.js';

const GEHC_PORTAL_URL = 'https://www.gehealthcare.com.br/account';
const REFRESH_URL     = 'https://www.gehealthcare.com.br/api/v1/RefreshToken';

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// ─── Credenciais por tenant ───────────────────────────────────────────────────

export async function salvarCredenciais(tenantId, login, password) {
  await prisma.gehcToken.upsert({
    where:  { tenantId },
    create: { id: crypto.randomUUID(), tenantId, gehcLogin: encryptToken(login), gehcPassword: encryptToken(password) },
    update: { gehcLogin: encryptToken(login), gehcPassword: encryptToken(password), updatedAt: new Date() },
  });
}

export async function removerCredenciais(tenantId) {
  await prisma.gehcToken.updateMany({
    where: { tenantId },
    data:  { gehcLogin: null, gehcPassword: null, accessToken: null, idToken: null, refreshToken: null, expiresAt: null },
  });
}

async function lerCredenciais(tenantId) {
  const row = await prisma.gehcToken.findUnique({
    where:  { tenantId },
    select: { gehcLogin: true, gehcPassword: true },
  });
  if (!row?.gehcLogin || !row?.gehcPassword) return null;
  return { login: decryptToken(row.gehcLogin), password: decryptToken(row.gehcPassword) };
}

export async function temCredenciaisConfiguradas(tenantId) {
  const row = await prisma.gehcToken.findUnique({ where: { tenantId }, select: { gehcLogin: true } });
  if (row?.gehcLogin) return true;
  return !!(process.env.GEHC_LOGIN && process.env.GEHC_PASSWORD);
}

// ─── Tokens por tenant ────────────────────────────────────────────────────────

async function salvarTokens(tenantId, { accessToken, idToken, refreshToken, expiresAt }) {
  const enc = {
    accessToken:  encryptToken(accessToken),
    idToken:      encryptToken(idToken),
    refreshToken: refreshToken ? encryptToken(refreshToken) : null,
  };
  await prisma.gehcToken.upsert({
    where:  { tenantId },
    create: { id: crypto.randomUUID(), tenantId, ...enc, expiresAt: expiresAt ?? null },
    update: { ...enc, expiresAt: expiresAt ?? null, updatedAt: new Date() },
  });
}

async function lerTokens(tenantId) {
  const row = await prisma.gehcToken.findUnique({ where: { tenantId } });
  if (!row?.accessToken) return null;
  return {
    ...row,
    accessToken:  decryptToken(row.accessToken),
    idToken:      decryptToken(row.idToken),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
  };
}

// ─── Refresh via API ──────────────────────────────────────────────────────────

async function refreshViaApi(refreshToken) {
  const res = await fetch(REFRESH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`RefreshToken HTTP ${res.status}`);
  const json = await res.json();
  if (!json.access_token || !json.id_token) throw new Error('RefreshToken: resposta sem tokens');
  return {
    accessToken:  json.access_token,
    idToken:      json.id_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

// ─── Login completo via Playwright ───────────────────────────────────────────

export async function capturarTokensViaPlaywright(tenantId) {
  const creds = await lerCredenciais(tenantId);
  const login    = creds?.login    ?? process.env.GEHC_LOGIN;
  const password = creds?.password ?? process.env.GEHC_PASSWORD;

  if (!login || !password) {
    throw new Error('Credenciais GE não configuradas. Acesse Gerenciamento → Integrações para configurar o login e senha do portal GE Healthcare.');
  }

  console.log('[GEHC_AUTH] Iniciando login via Playwright para capturar tokens...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  let tokensCaptured = null;

  page.on('response', async (response) => {
    if (tokensCaptured) return;
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('json')) return;
    if (response.status() < 200 || response.status() >= 300) return;
    try {
      const json = await response.json().catch(() => null);
      if (json?.access_token && json?.id_token) {
        tokensCaptured = {
          accessToken:  json.access_token,
          idToken:      json.id_token,
          refreshToken: json.refresh_token ?? null,
          expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
        };
        console.log('[GEHC_AUTH] Tokens capturados via interceptação de resposta.');
      }
    } catch { /* ignorar */ }
  });

  try {
    await page.goto(GEHC_PORTAL_URL, { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator('input[name="username"], input[type="email"]').first().fill(login);
    await page.locator('input[name="password"], input[type="password"]').first().fill(password);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (!tokensCaptured) {
      const lsTokens = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          try {
            const val = JSON.parse(localStorage.getItem(key));
            if (val?.access_token && val?.id_token) return val;
            if (val?.AccessToken && val?.IdToken) return { access_token: val.AccessToken, id_token: val.IdToken, refresh_token: val.RefreshToken };
          } catch { /* ignora */ }
        }
        const access  = localStorage.getItem('access_token') || localStorage.getItem('CognitoAccessToken');
        const id      = localStorage.getItem('id_token')     || localStorage.getItem('CognitoIdToken');
        const refresh = localStorage.getItem('refresh_token')|| localStorage.getItem('CognitoRefreshToken');
        if (access && id) return { access_token: access, id_token: id, refresh_token: refresh };
        return null;
      }).catch(() => null);

      if (lsTokens) {
        tokensCaptured = {
          accessToken:  lsTokens.access_token,
          idToken:      lsTokens.id_token,
          refreshToken: lsTokens.refresh_token ?? null,
          expiresAt:    null,
        };
        console.log('[GEHC_AUTH] Tokens encontrados no localStorage.');
      }
    }

    if (!tokensCaptured) {
      throw new Error('Login realizado mas nenhum token JWT foi capturado. Verifique as credenciais ou o fluxo de autenticação do portal.');
    }

    await salvarTokens(tenantId, tokensCaptured);
    console.log(`[GEHC_AUTH] Tokens salvos para tenant ${tenantId}.`);
    return tokensCaptured;
  } finally {
    await browser.close();
  }
}

// ─── Ponto de entrada principal ───────────────────────────────────────────────

export async function obterTokensGehc(tenantId) {
  const stored = await lerTokens(tenantId);

  if (stored) {
    const expired = stored.expiresAt
      ? stored.expiresAt.getTime() - Date.now() < EXPIRY_MARGIN_MS
      : false;

    if (!expired) {
      return { accessToken: stored.accessToken, idToken: stored.idToken };
    }

    if (stored.refreshToken) {
      try {
        console.log(`[GEHC_AUTH] Token expirado para tenant ${tenantId} — tentando refresh...`);
        const novos = await refreshViaApi(stored.refreshToken);
        await salvarTokens(tenantId, novos);
        return { accessToken: novos.accessToken, idToken: novos.idToken };
      } catch (err) {
        console.warn(`[GEHC_AUTH] Refresh falhou (${err.message}) — refazendo login completo.`);
      }
    }
  }

  const novos = await capturarTokensViaPlaywright(tenantId);
  return { accessToken: novos.accessToken, idToken: novos.idToken };
}

export async function invalidarTokensGehc(tenantId) {
  await prisma.gehcToken.updateMany({
    where: { tenantId },
    data:  { accessToken: null, idToken: null, refreshToken: null, expiresAt: null },
  });
  console.log(`[GEHC_AUTH] Tokens invalidados para tenant ${tenantId}.`);
}
