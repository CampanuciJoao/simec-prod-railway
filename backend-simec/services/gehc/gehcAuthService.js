import { chromium } from 'playwright';
import prisma from '../prismaService.js';
import { encryptToken, decryptToken } from './gehcCrypto.js';
import { observeGehcAuth } from '../metrics/metricsService.js';
import {
  getSharedRedisClient,
  isSharedRedisUnavailable,
} from '../redis/sharedRedisClient.js';

// URLs do portal pos-migracao GE BR (jun/2026). Antes era .com.br/account
// e .com.br/myequipment, mas o dominio antigo redireciona pra cá e o path
// antigo /myequipment virou 404. Ver doc completo em
// simec/GEHC - Portal URLs e Fluxo Auth.txt
const GEHC_PORTAL_URL = 'https://www.gehealthcare.com/pt-br/account';
const GEHC_MYEQUIPMENT_URL = 'https://www.gehealthcare.com/pt-br/account/myequipment';
const REFRESH_URL = 'https://www.gehealthcare.com/api/v1/RefreshToken';

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// TTL conservador aplicado quando capturamos tokens sem `expires_in` explícito.
// 50 minutos é menor que o ciclo típico de expiração da GE (~60min), então
// disparamos refresh/relogin antes do servidor da fonte revogar o token.
// Incidente 2026-05-10: tokens sem expiresAt eram considerados eternamente
// válidos e o monitor silenciava 401 sem renovar.
const FALLBACK_TTL_MS = 50 * 60 * 1000;

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
    data:  { gehcLogin: null, gehcPassword: null, accessToken: null, idToken: null, refreshToken: null, expiresAt: null, storageState: null },
  });
}

// Exportado para que outros módulos (ex: gehcDocumentDownloader) possam abrir
// uma sessão Playwright autenticada reusando as mesmas credenciais sem
// reimplementar a leitura+descriptografia.
export async function lerCredenciais(tenantId) {
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

// ─── StorageState do Playwright (cookies + localStorage) ─────────────────────
// Persiste o storageState completo do Playwright entre execucoes pra preservar
// o cookie de device trust da GE Healthcare (logon.gehealthcare.com, httpOnly).
// Sem isso, o login programatico cai no gate GEIDP2FAPage e nunca completa.
// Descoberta em 2026-06-30 via inspecao do portal real (cookies access_token
// e id_token estao no .gehealthcare.com sem httpOnly, mas o cookie de trust
// fica no domain logon e e' httpOnly — so capturavel via context.storageState()).

export async function salvarStorageState(tenantId, storageState) {
  if (!storageState) return;
  const json = typeof storageState === 'string' ? storageState : JSON.stringify(storageState);
  await prisma.gehcToken.upsert({
    where:  { tenantId },
    create: { id: crypto.randomUUID(), tenantId, storageState: encryptToken(json) },
    update: { storageState: encryptToken(json), updatedAt: new Date() },
  });
}

export async function lerStorageState(tenantId) {
  const row = await prisma.gehcToken.findUnique({
    where:  { tenantId },
    select: { storageState: true },
  });
  if (!row?.storageState) return null;
  try {
    const json = decryptToken(row.storageState);
    return JSON.parse(json);
  } catch (err) {
    console.warn(`[GEHC_AUTH] storageState corrompido para tenant ${tenantId}: ${err.message}`);
    return null;
  }
}

export async function removerStorageState(tenantId) {
  await prisma.gehcToken.updateMany({
    where: { tenantId },
    data:  { storageState: null },
  });
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
  observeGehcAuth(tenantId, true);
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

// ─── Extracao de tokens a partir de cookies do contexto ──────────────────────
// Descoberta 2026-06-30: tokens access_token e id_token ficam em cookies
// NAO-httpOnly no domain .gehealthcare.com. Em vez de interceptar requests
// (que depende de timing do SPA), lemos direto via context.cookies().

function tokensDosCookies(cookies) {
  const find = (nome) => cookies.find((c) => c.name === nome)?.value || null;
  const accessToken = find('access_token');
  const idToken     = find('id_token');
  if (!accessToken || !idToken) return null;
  return {
    accessToken,
    idToken,
    refreshToken: null,
    expiresAt:    new Date(Date.now() + FALLBACK_TTL_MS),
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

  // Anti-detection: GE Healthcare detecta Playwright headless pelo
  // navigator.webdriver e user-agent "HeadlessChrome", o que ativa o
  // gate GEIDP2FAPage. Combinando com storageState persistente (cookie
  // de device trust no logon.gehealthcare.com), conseguimos pular o 2FA.
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const storageState = await lerStorageState(tenantId);
  if (storageState) {
    console.log(`[GEHC_AUTH] storageState anterior carregado (${storageState.cookies?.length || 0} cookies).`);
  } else {
    console.log('[GEHC_AUTH] Sem storageState anterior — primeira execucao ou foi limpo.');
  }

  const context = await browser.newContext({
    storageState: storageState || undefined,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  try {
    // Atalho: se ja temos cookies validos do storageState, tenta direto
    // a pagina de equipamentos. Se autenticar sem login form, ganhamos.
    if (storageState?.cookies?.some((c) => c.name === 'access_token')) {
      console.log('[GEHC_AUTH] Tentando atalho via storageState (sem digitar credenciais)...');
      await page.goto(GEHC_MYEQUIPMENT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const cookies = await context.cookies();
      const tokens = tokensDosCookies(cookies);
      if (tokens) {
        console.log(`[GEHC_AUTH] Atalho funcionou — tokens extraidos dos cookies (storageState valido). access_token=${tokens.accessToken.slice(0, 8)}... idtoken=${tokens.idToken.slice(0, 8)}...`);
        await salvarTokens(tenantId, tokens);
        // Atualiza storageState (cookies podem ter sido renovados).
        const novoState = await context.storageState();
        await salvarStorageState(tenantId, novoState);
        await browser.close();
        return tokens;
      }
      console.log('[GEHC_AUTH] Atalho nao funcionou — cookies expirados ou ausentes. Fazendo login normal.');
    }

    // Login normal via formulario.
    await page.goto(GEHC_PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('[GEHC_AUTH] URL após goto:', page.url());

    const emailInput = page.locator([
      'input[name="username"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[id="username"]',
    ].join(', ')).first();

    await emailInput.waitFor({ timeout: 20000 });
    console.log('[GEHC_AUTH] Campo de email encontrado.');
    await emailInput.fill(login);

    const passInput = page.locator('input[name="password"], input[type="password"], input[id="password"]').first();
    await passInput.waitFor({ timeout: 10000 });
    await passInput.fill(password);

    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Entrar"), button:has-text("Login")').first();
    if ((await submitBtn.count()) > 0) {
      console.log('[GEHC_AUTH] Botao submit encontrado, clicando.');
      await submitBtn.click();
    } else {
      console.log('[GEHC_AUTH] Sem botao submit — usando Enter no campo password.');
      await passInput.press('Enter');
    }
    console.log('[GEHC_AUTH] Credenciais enviadas, aguardando autenticacao...');

    // Espera ate (a) password sumir, (b) URL mudar do /account inicial.
    const urlPreSubmit = page.url();
    try {
      await Promise.race([
        page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 30000 }),
        page.waitForURL((url) => url.toString() !== urlPreSubmit, { timeout: 30000 }),
      ]);
    } catch {
      console.warn('[GEHC_AUTH] Apos submit: password input ainda presente E URL nao mudou em 30s.');
    }
    console.log(`[GEHC_AUTH] URL pos-submit: ${page.url()}`);

    // Navega pra myequipment pra o SPA renovar cookies e disparar CDX
    // (o portal renova tokens nesse momento).
    await page.goto(GEHC_MYEQUIPMENT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log(`[GEHC_AUTH] URL pos-myequipment: ${page.url()}`);

    // Le tokens dos cookies (descoberta 2026-06-30 — access_token e
    // id_token sao cookies JS-visiveis).
    const cookies = await context.cookies();
    const tokens = tokensDosCookies(cookies);

    if (!tokens) {
      // Diagnostico denso quando falha
      try { await page.screenshot({ path: '/tmp/gehc_auth_post_submit.png', fullPage: true }); } catch {}
      const html = await page.content().catch(() => '');
      console.error(`[GEHC_AUTH] Cookies sem access_token/id_token. URL: ${page.url()}`);
      console.error(`[GEHC_AUTH] Cookies disponiveis: ${cookies.map((c) => c.name).join(', ')}`);
      console.error(`[GEHC_AUTH] HTML pos-submit (${html.length} chars). Primeiros 800: ${html.slice(0, 800).replace(/\s+/g, ' ')}`);
      throw new Error('Tokens nao encontrados nos cookies pos-login (provavelmente parou em 2FA ou login falhou).');
    }

    console.log(`[GEHC_AUTH] Tokens extraidos dos cookies. access_token=${tokens.accessToken.slice(0, 8)}... idtoken=${tokens.idToken.slice(0, 8)}...`);

    // Persiste storageState INTEIRO (cookies httpOnly do logon.gehealthcare.com
    // + nao-httpOnly + localStorage). Proxima execucao usa pra pular 2FA.
    const novoState = await context.storageState();
    await salvarStorageState(tenantId, novoState);
    console.log(`[GEHC_AUTH] storageState persistido (${novoState.cookies?.length || 0} cookies).`);

    await salvarTokens(tenantId, tokens);
    console.log(`[GEHC_AUTH] Tokens salvos para tenant ${tenantId}.`);
    return tokens;
  } catch (err) {
    try { await page.screenshot({ path: '/tmp/gehc_auth_error.png', fullPage: true }); } catch {}
    const html = await page.content().catch(() => '');
    console.error('[GEHC_AUTH] Erro. URL atual:', page.url());
    console.error('[GEHC_AUTH] Inputs visíveis:', html.match(/<input[^>]+>/g)?.join('\n') ?? 'nenhum');
    throw err;
  } finally {
    await browser.close();
  }
}

// ─── Ponto de entrada principal ───────────────────────────────────────────────

function calcularExpiracao(stored) {
  if (stored.expiresAt) {
    return {
      expirado: stored.expiresAt.getTime() - Date.now() < EXPIRY_MARGIN_MS,
      motivo: 'expiresAt explicito',
    };
  }

  const referencia = stored.updatedAt || stored.capturedAt;
  if (referencia) {
    const idade = Date.now() - new Date(referencia).getTime();
    return {
      expirado: idade > FALLBACK_TTL_MS,
      motivo: `expiresAt nulo, idade=${Math.round(idade / 60000)}min`,
    };
  }

  return { expirado: true, motivo: 'sem expiresAt e sem referencia temporal' };
}

// ─── Lock distribuído no Redis ────────────────────────────────────────────────
// Sem isso, multiplos jobs (gehc-monitorar-saude, gehc-capturar-pdfs,
// knowledge-layer-sync, ia-insights) detectam token expirado e disparam
// Playwright em paralelo — um sucede, outros falham com timeout. Resolve
// race observado em 2026-05-21.

const REFRESH_LOCK_TTL_S = 120;
const REFRESH_WAIT_TIMEOUT_MS = 90_000;
const REFRESH_WAIT_POLL_MS = 1500;

function refreshLockKey(tenantId) {
  return `gehc:auth_lock:${tenantId}`;
}

async function tryAcquireRefreshLock(tenantId) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) {
    console.warn('[GEHC_AUTH] Redis indisponível — refresh sem lock distribuído.');
    return true;
  }
  try {
    const result = await redis.set(refreshLockKey(tenantId), '1', 'EX', REFRESH_LOCK_TTL_S, 'NX');
    return result === 'OK';
  } catch (err) {
    console.warn(`[GEHC_AUTH] Falha ao adquirir lock (${err.message}) — prosseguindo sem.`);
    return true;
  }
}

async function releaseRefreshLock(tenantId) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) return;
  try {
    await redis.del(refreshLockKey(tenantId));
  } catch {
    // expira sozinho via TTL
  }
}

async function aguardarRefreshConcorrente(tenantId) {
  const inicio = Date.now();
  console.log(`[GEHC_AUTH] Lock ocupado para tenant ${tenantId} — aguardando outro worker renovar.`);

  while (Date.now() - inicio < REFRESH_WAIT_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, REFRESH_WAIT_POLL_MS));
    const recheck = await lerTokens(tenantId);
    if (recheck) {
      const { expirado } = calcularExpiracao(recheck);
      if (!expirado) {
        const esperaSegundos = Math.round((Date.now() - inicio) / 1000);
        console.log(`[GEHC_AUTH] Tokens renovados por outro worker para tenant ${tenantId} (espera=${esperaSegundos}s).`);
        return { accessToken: recheck.accessToken, idToken: recheck.idToken };
      }
    }
  }

  throw new Error(`Timeout (${Math.round(REFRESH_WAIT_TIMEOUT_MS / 1000)}s) aguardando renovação concorrente de tokens GEHC.`);
}

export async function obterTokensGehc(tenantId) {
  const stored = await lerTokens(tenantId);

  if (stored) {
    const { expirado, motivo } = calcularExpiracao(stored);

    if (!expirado) {
      return { accessToken: stored.accessToken, idToken: stored.idToken };
    }

    console.log(`[GEHC_AUTH] Token suspeito para tenant ${tenantId} (${motivo}) — renovando.`);
  }

  const adquirido = await tryAcquireRefreshLock(tenantId);

  if (!adquirido) {
    return aguardarRefreshConcorrente(tenantId);
  }

  try {
    const recheck = await lerTokens(tenantId);
    if (recheck && !calcularExpiracao(recheck).expirado) {
      return { accessToken: recheck.accessToken, idToken: recheck.idToken };
    }

    if (recheck?.refreshToken) {
      try {
        console.log(`[GEHC_AUTH] Tentando refresh via API para tenant ${tenantId}...`);
        const novos = await refreshViaApi(recheck.refreshToken);
        await salvarTokens(tenantId, novos);
        return { accessToken: novos.accessToken, idToken: novos.idToken };
      } catch (err) {
        console.warn(`[GEHC_AUTH] Refresh falhou (${err.message}) — refazendo login completo.`);
      }
    }

    const novos = await capturarTokensViaPlaywright(tenantId);
    return { accessToken: novos.accessToken, idToken: novos.idToken };
  } finally {
    await releaseRefreshLock(tenantId);
  }
}

export async function invalidarTokensGehc(tenantId) {
  await prisma.gehcToken.updateMany({
    where: { tenantId },
    data:  { accessToken: null, idToken: null, refreshToken: null, expiresAt: null },
  });
  console.log(`[GEHC_AUTH] Tokens invalidados para tenant ${tenantId}.`);
}
