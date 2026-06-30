import { chromium } from 'playwright';
import prisma from '../prismaService.js';
import { encryptToken, decryptToken } from './gehcCrypto.js';
import { observeGehcAuth } from '../metrics/metricsService.js';
import {
  getSharedRedisClient,
  isSharedRedisUnavailable,
} from '../redis/sharedRedisClient.js';

// GE migrou o portal brasileiro de www.gehealthcare.com.br/account para
// www.gehealthcare.com/pt-br/account em 2026-06. O dominio antigo redireciona
// mas /myequipment no path antigo virou 404 no novo (incidente 2026-06-29).
// Refresh API: dominio atualizado pra .com tambem; path mantido (endpoint
// de API, sem locale).
const GEHC_PORTAL_URL = 'https://www.gehealthcare.com/pt-br/account';
const REFRESH_URL     = 'https://www.gehealthcare.com/api/v1/RefreshToken';

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

// TTL conservador aplicado quando capturamos tokens sem `expires_in` explícito
// (acontece na estratégia 1 — header CDX, ver capturarTokensViaPlaywright).
// 50 minutos é menor que o ciclo típico de expiração da GE (~60min), então
// disparamos refresh/relogin antes do servidor da fonte revogar o token.
// Sem isso, tokens ficavam considerados eternamente válidos e o monitor
// silenciava 401 sem renovar (incidente 2026-05-10, ver ADR-015).
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
    data:  { gehcLogin: null, gehcPassword: null, accessToken: null, idToken: null, refreshToken: null, expiresAt: null },
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
  // Token salvo com sucesso = auth válida pra esse tenant
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

  let resolveToken, rejectToken;
  const tokenPromise = new Promise((res, rej) => { resolveToken = res; rejectToken = rej; });

  const CDX_HOST = 'cx-us-prd-services.cloud.gehealthcare.com';

  // Estratégia 1: interceptar requests de saída para a API CDX
  page.on('request', (request) => {
    if (!request.url().includes(CDX_HOST)) return;
    const h = request.headers();
    // Loga o corpo da requisição para revelar a query GraphQL real do portal
    const body = request.postData();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        console.log('[GEHC_AUTH] CDX query capturada:', JSON.stringify({ operationName: parsed.operationName, query: parsed.query?.slice(0, 300) }));
      } catch { /* ignorar */ }
    }
    if (h['accesstoken'] && h['idtoken']) {
      console.log(`[GEHC_AUTH] Tokens capturados via header de request CDX. TTL fallback: ${FALLBACK_TTL_MS / 60000}min.`);
      resolveToken({
        accessToken: h['accesstoken'],
        idToken: h['idtoken'],
        refreshToken: null,
        expiresAt: new Date(Date.now() + FALLBACK_TTL_MS),
      });
    }
  });

  // Estratégia 2: interceptar resposta JSON com access_token (OAuth token endpoint)
  page.on('response', async (response) => {
    if (response.status() < 200 || response.status() >= 300) return;
    if (!(response.headers()['content-type'] ?? '').includes('json')) return;
    try {
      const json = await response.json().catch(() => null);
      if (json?.access_token && json?.id_token) {
        console.log('[GEHC_AUTH] Tokens capturados via resposta JSON OAuth.');
        resolveToken({
          accessToken:  json.access_token,
          idToken:      json.id_token,
          refreshToken: json.refresh_token ?? null,
          expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
        });
      }
    } catch { /* ignorar */ }
  });

  try {
    // domcontentloaded: não espera scripts de analytics — só o DOM
    await page.goto(GEHC_PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('[GEHC_AUTH] URL após goto:', page.url());

    // GEIDP usa input[type="text"] para username, não type="email"
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

    // Tenta clicar no botão submit; fallback para Enter
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Entrar"), button:has-text("Login")').first();
    const hasSubmit = await submitBtn.count() > 0;
    if (hasSubmit) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    console.log('[GEHC_AUTH] Credenciais enviadas, aguardando tokens...');

    // Aguarda a página autenticar (URL muda ou inputs somem)
    await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 30000 }).catch(() => {});

    // Força o SPA a chamar a API CDX navegando para a lista de equipamentos.
    // URL nova pos-migracao do portal BR (2026-06): /pt-br/account/myequipment
    // (antes era /myequipment no dominio .com.br).
    await page.goto('https://www.gehealthcare.com/pt-br/account/myequipment', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    console.log('[GEHC_AUTH] Navegando para myequipment para forçar chamadas à API CDX...');

    // Aguarda networkidle para que o SPA faça TODAS as chamadas GraphQL (incluindo listagem de equipamentos)
    // antes de capturar os tokens — o listener de 'request' loga cada query CDX feita neste período
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('[GEHC_AUTH] networkidle timeout — prosseguindo com tokens já capturados.');
    });

    const tokensCaptured = await Promise.race([
      tokenPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout aguardando tokens após login (45s)')), 45000)),
    ]);

    await salvarTokens(tenantId, tokensCaptured);
    console.log(`[GEHC_AUTH] Tokens salvos para tenant ${tenantId}.`);
    return tokensCaptured;
  } catch (err) {
    rejectToken?.(err);
    // Screenshot para diagnóstico — salvo em /tmp para não poluir o projeto
    await page.screenshot({ path: '/tmp/gehc_auth_error.png', fullPage: true }).catch(() => {});
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
  // Caso explícito: temos expiresAt da fonte (OAuth response com expires_in).
  if (stored.expiresAt) {
    return {
      expirado: stored.expiresAt.getTime() - Date.now() < EXPIRY_MARGIN_MS,
      motivo: 'expiresAt explicito',
    };
  }

  // Caso histórico: tokens salvos antes do TTL fallback existir podem ter
  // expiresAt null. Tratamos como suspeitos depois de FALLBACK_TTL_MS da
  // última atualização — protege contra o cenário do incidente 2026-05-10
  // (token sem expiresAt considerado eternamente válido).
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
// Sem isso, múltiplos jobs do worker (gehc-monitorar-saude,
// gehc-capturar-pdfs, knowledge-layer-sync, ia-insights) detectam token
// expirado ao mesmo tempo e disparam Playwright em paralelo. Resultado:
// um sucede, outros falham com timeout/erro de sessão concorrente, e
// jobs como GEHC_MONITOR desistem da execução inteira.
//
// O lock garante que apenas UM worker renova por vez por tenant. Os
// demais aguardam por polling do banco e usam os tokens novos assim
// que aparecem. Resolve o race observado em 2026-05-21.

const REFRESH_LOCK_TTL_S = 120;
const REFRESH_WAIT_TIMEOUT_MS = 90_000;
const REFRESH_WAIT_POLL_MS = 1500;

function refreshLockKey(tenantId) {
  return `gehc:auth_lock:${tenantId}`;
}

async function tryAcquireRefreshLock(tenantId) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) {
    // Sem Redis: modo degradado — sem lock distribuído. Mantém o
    // comportamento antigo (com risco de race) em vez de bloquear tudo.
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

// Aguarda outro worker renovar fazendo polling no banco. Retorna assim
// que vê tokens válidos. Lança erro se estourar timeout.
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

  // Tenta adquirir lock. Apenas o vencedor faz refresh; demais aguardam.
  const adquirido = await tryAcquireRefreshLock(tenantId);

  if (!adquirido) {
    return aguardarRefreshConcorrente(tenantId);
  }

  try {
    // Re-le do banco DEPOIS de adquirir o lock: pode ser que outro worker
    // tenha renovado entre o lerTokens() inicial e a aquisição do lock.
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
