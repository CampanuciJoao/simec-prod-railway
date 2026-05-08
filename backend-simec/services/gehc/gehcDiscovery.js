import { chromium } from 'playwright';
import prisma from '../prismaService.js';
import { obterTokensGehc } from './gehcAuthService.js';
import { fetchAllAssets } from './gehcGraphqlClient.js';

const GEHC_BASE  = 'https://www.gehealthcare.com.br';
const GEHC_LOGIN = `${GEHC_BASE}/account`;

// ─── Fuzzy matching ───────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizar(s) {
  return String(s ?? '').trim().toUpperCase().replace(/[\s\-_.]/g, '');
}

function matchSerial(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return { match: false };
  if (na === nb) return { match: true, distancia: 0, confianca: 'exato' };
  if (na.includes(nb) || nb.includes(na)) return { match: true, distancia: 1, confianca: 'fuzzy' };
  const dist = levenshtein(na, nb);
  if (dist <= 2) return { match: true, distancia: dist, confianca: 'fuzzy' };
  return { match: false };
}

// ─── Modo 1: Discovery via GraphQL (preferencial) ────────────────────────────
// Usa fetchAllAssets — retorna lista completa com equipmentId (serial), systemId,
// modelo, modalidade, localização. Uma chamada HTTP, ~2s.

async function descobrirViaGraphql(tenantId, equipamentosSimec) {
  let tokens;
  try {
    tokens = await obterTokensGehc(tenantId);
  } catch (err) {
    console.warn(`[GEHC_DISCOVERY] Não foi possível obter tokens (${err.message}) — usando Playwright.`);
    return null;
  }

  const assetsGe = await fetchAllAssets(tokens);
  console.log(`[GEHC_DISCOVERY] GraphQL: ${assetsGe.length} equipamento(s) encontrado(s) no portal GE.`);

  // Filtra ressonâncias magnéticas
  const rmsGe = assetsGe.filter(a => {
    const texto = `${a.modality ?? ''} ${a.model ?? ''} ${a.productDescription ?? ''}`.toUpperCase();
    return texto.includes('MR') || texto.includes('RM') || texto.includes('RESSONANCIA') ||
           texto.includes('RESONANCE') || texto.includes('SIGNA') || texto.includes('DISCOVERY');
  });

  console.log(`[GEHC_DISCOVERY] ${rmsGe.length} RM(s) GE encontradas no portal.`);
  return { rmsGe, tokens };
}

// ─── Modo 2: Discovery via Playwright (fallback) ──────────────────────────────

async function loginGehc(page) {
  await page.goto(GEHC_LOGIN, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[name="username"], input[type="email"]').first().fill(process.env.GEHC_LOGIN);
  await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.GEHC_PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
}

async function extrairEquipamentosGe(page) {
  await page.goto(`${GEHC_BASE}/account/equipment`, { waitUntil: 'networkidle', timeout: 20000 });

  const equipamentos = [];
  let pagina = 1;

  while (true) {
    await page.waitForLoadState('networkidle');

    const cards = await page.locator('[class*="equipment-card"], [class*="asset-item"], [class*="product-item"]').all();

    if (cards.length === 0) {
      const links = await page.locator('a[href*="/equipment/"]').all();
      for (const link of links) {
        const href  = await link.getAttribute('href');
        const texto = await link.innerText().catch(() => '');
        const assetId = href?.split('/equipment/')[1]?.split('/')[0]?.split('?')[0];
        if (assetId) equipamentos.push({ assetId, equipmentId: texto.trim(), href });
      }
      break;
    }

    for (const card of cards) {
      const href    = await card.locator('a[href*="/equipment/"]').first().getAttribute('href').catch(() => null);
      const serial  = await card.locator('[class*="serial"], [class*="tag"], [class*="model-number"]').first().innerText().catch(() => '');
      const modelo  = await card.locator('[class*="model"], [class*="name"]').first().innerText().catch(() => '');
      const tipo    = await card.locator('[class*="modality"], [class*="type"]').first().innerText().catch(() => '');
      const assetId = href?.split('/equipment/')[1]?.split('/')[0]?.split('?')[0];
      if (assetId) equipamentos.push({ assetId, equipmentId: serial.trim(), model: modelo.trim(), modality: tipo.trim(), href });
    }

    const btnProximo = page.locator('button[aria-label*="next"], button[aria-label*="Next"], [class*="pagination"] button:last-child').first();
    const desabilitado = await btnProximo.isDisabled().catch(() => true);
    if (desabilitado) break;

    await btnProximo.click();
    pagina++;
    if (pagina > 20) break;
  }

  return equipamentos;
}

async function descobrirViaPlaywright(equipamentosSimec) {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  try {
    await loginGehc(page);
    const todos  = await extrairEquipamentosGe(page);
    const rmsGe  = todos.filter(a => {
      const texto = `${a.modality ?? ''} ${a.model ?? ''}`.toUpperCase();
      return texto.includes('MR') || texto.includes('RM') || texto.includes('SIGNA') || texto.includes('DISCOVERY');
    });
    console.log(`[GEHC_DISCOVERY] Playwright: ${rmsGe.length} RM(s) encontradas no portal.`);
    return { rmsGe, tokens: null };
  } finally {
    await browser.close();
  }
}

// ─── Matching e persistência ──────────────────────────────────────────────────

function melhorMatchGe(simec, rmsGe) {
  let melhor = null;
  let melhorDist = Infinity;

  for (const ge of rmsGe) {
    // Tenta serial (equipmentId) e depois assetId como referência
    const porSerial  = matchSerial(simec.tag, ge.equipmentId ?? '');
    const porAssetId = matchSerial(simec.tag, ge.assetId ?? '');
    const resultado  = porSerial.match ? porSerial : (porAssetId.match ? porAssetId : null);

    if (resultado?.match && resultado.distancia < melhorDist) {
      melhor     = { ge, resultado };
      melhorDist = resultado.distancia;
    }
  }

  return melhor;
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function descobrirEquipamentosGehc(tenantId) {
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    throw new Error('GEHC_LOGIN e GEHC_PASSWORD não configurados no .env');
  }

  const equipamentosSimec = await prisma.equipamento.findMany({
    where: {
      tenantId,
      fabricante: { contains: 'GE', mode: 'insensitive' },
      tipo:       { contains: 'RM',  mode: 'insensitive' },
    },
    select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true },
  });

  if (equipamentosSimec.length === 0) {
    return { vinculados: [], semMatch: [], jaVinculados: [], modo: 'sem_equipamentos' };
  }

  console.log(`[GEHC_DISCOVERY] ${equipamentosSimec.length} RM(s) GE encontradas no SIMEC.`);

  // Tenta GraphQL primeiro, Playwright como fallback
  let resultado = await descobrirViaGraphql(tenantId, equipamentosSimec);
  let modo = 'graphql';

  if (!resultado) {
    resultado = await descobrirViaPlaywright(equipamentosSimec);
    modo = 'playwright';
  }

  const { rmsGe } = resultado;
  const vinculados   = [];
  const semMatch     = [];
  const jaVinculados = [];

  for (const simec of equipamentosSimec) {
    if (simec.gehcAssetId) {
      jaVinculados.push({ simecId: simec.id, tag: simec.tag, gehcAssetId: simec.gehcAssetId });
      continue;
    }

    const match = melhorMatchGe(simec, rmsGe);

    if (match) {
      await prisma.equipamento.update({
        where: { tenantId_id: { tenantId, id: simec.id } },
        data:  {
          gehcAssetId:  match.ge.id ?? match.ge.assetId,
          gehcSystemId: match.ge.systemId ?? null,
        },
      });

      vinculados.push({
        simecId:     simec.id,
        tag:         simec.tag,
        gehcAssetId: match.ge.id ?? match.ge.assetId,
        gehcSystemId: match.ge.systemId ?? null,
        modelo:      match.ge.model ?? match.ge.modelo,
        modalidade:  match.ge.modality ?? null,
        confianca:   match.resultado.confianca,
        distancia:   match.resultado.distancia,
        serialGe:    match.ge.equipmentId ?? match.ge.serial,
      });

      console.log(`[GEHC_DISCOVERY] ✓ Vinculado: SIMEC "${simec.tag}" ↔ GE "${match.ge.equipmentId ?? match.ge.serial}" (confiança: ${match.resultado.confianca}, dist: ${match.resultado.distancia})`);
    } else {
      semMatch.push({ simecId: simec.id, tag: simec.tag, modelo: simec.modelo });
      console.log(`[GEHC_DISCOVERY] ✗ Sem match: SIMEC "${simec.tag}" (${simec.modelo})`);
    }
  }

  return { vinculados, semMatch, jaVinculados, modo, totalPortalGe: rmsGe.length };
}
