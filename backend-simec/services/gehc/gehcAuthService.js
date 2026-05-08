import { chromium } from 'playwright';
import prisma from '../prismaService.js';

const GEHC_BASE    = 'https://www.gehealthcare.com.br';
const GEHC_LOGIN   = `${GEHC_BASE}/account`;
const REFRESH_URL  = `${GEHC_BASE}/api/v1/RefreshToken`;

// Tokens expiram em ~1h; renova com 5 min de margem
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// ─── Persistência ─────────────────────────────────────────────────────────────

async function salvarTokens(tenantId, { accessToken, idToken, refreshToken, expiresAt }) {
  await prisma.gehcToken.upsert({
    where:  { tenantId },
    create: { id: crypto.randomUUID(), tenantId, accessToken, idToken, refreshToken: refreshToken ?? null, expiresAt: expiresAt ?? null },
    update: { accessToken, idToken, refreshToken: refreshToken ?? null, expiresAt: expiresAt ?? null, updatedAt: new Date() },
  });
}

async function lerTokens(tenantId) {
  return prisma.gehcToken.findUnique({ where: { tenantId } });
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
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    throw new Error('GEHC_LOGIN e GEHC_PASSWORD não configurados no .env');
  }

  console.log('[GEHC_AUTH] Iniciando login via Playwright para capturar tokens...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  let tokensCaptured = null;

  // Intercepta qualquer resposta JSON que contenha access_token
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
    } catch {
      // ignorar respostas não JSON
    }
  });

  try {
    await page.goto(GEHC_LOGIN, { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator('input[name="username"], input[type="email"]').first().fill(process.env.GEHC_LOGIN);
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.GEHC_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

    // Aguarda mais um tick para interceptações pendentes processarem
    await page.waitForTimeout(2000);

    // Fallback: tenta ler tokens do localStorage
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
        // Tenta chaves individuais comuns do Cognito
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

    // Fallback final: tenta ler cookies de sessão
    if (!tokensCaptured) {
      const cookies = await context.cookies();
      const at = cookies.find(c => c.name.toLowerCase().includes('access') || c.name.toLowerCase().includes('token'));
      if (at) {
        console.warn('[GEHC_AUTH] Apenas cookie encontrado — pode não ser suficiente para GraphQL.');
      }
    }

    if (!tokensCaptured) {
      throw new Error('Login realizado mas nenhum token JWT foi capturado. Verifique o fluxo de autenticação do portal.');
    }

    await salvarTokens(tenantId, tokensCaptured);
    console.log(`[GEHC_AUTH] Tokens salvos para tenant ${tenantId}.`);
    return tokensCaptured;
  } finally {
    await browser.close();
  }
}

// ─── Ponto de entrada principal ───────────────────────────────────────────────
// Retorna { accessToken, idToken } válidos.
// Ordem: DB → refresh automático → login completo.

export async function obterTokensGehc(tenantId) {
  const stored = await lerTokens(tenantId);

  if (stored) {
    const expired = stored.expiresAt
      ? stored.expiresAt.getTime() - Date.now() < EXPIRY_MARGIN_MS
      : false;

    if (!expired) {
      return { accessToken: stored.accessToken, idToken: stored.idToken };
    }

    // Tenta refresh
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

  // Login completo
  const novos = await capturarTokensViaPlaywright(tenantId);
  return { accessToken: novos.accessToken, idToken: novos.idToken };
}

// Invalida os tokens armazenados (força novo login na próxima chamada)
export async function invalidarTokensGehc(tenantId) {
  await prisma.gehcToken.deleteMany({ where: { tenantId } });
  console.log(`[GEHC_AUTH] Tokens invalidados para tenant ${tenantId}.`);
}
