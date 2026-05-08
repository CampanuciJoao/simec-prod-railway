import { chromium } from 'playwright';
import prisma from '../prismaService.js';

const GEHC_BASE  = 'https://www.gehealthcare.com.br';
const GEHC_LOGIN = `${GEHC_BASE}/account`;

// Levenshtein distance para fuzzy matching de seriais
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

function normalizarSerial(s) {
  return String(s ?? '').trim().toUpperCase().replace(/[\s\-_.]/g, '');
}

// Retorna { match, distancia, confianca } — confianca: 'exato' | 'fuzzy' | null
function matchSerial(tagSimec, tagGe) {
  const a = normalizarSerial(tagSimec);
  const b = normalizarSerial(tagGe);
  if (!a || !b) return { match: false };

  if (a === b) return { match: true, distancia: 0, confianca: 'exato' };

  // Um contém o outro (prefixo/sufixo extra)
  if (a.includes(b) || b.includes(a)) return { match: true, distancia: 1, confianca: 'fuzzy' };

  const dist = levenshtein(a, b);
  if (dist <= 2) return { match: true, distancia: dist, confianca: 'fuzzy' };

  return { match: false };
}

async function loginGehc(page) {
  await page.goto(GEHC_LOGIN, { waitUntil: 'networkidle', timeout: 30000 });

  await page.locator('input[name="username"], input[type="email"]').first().fill(process.env.GEHC_LOGIN);
  await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.GEHC_PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
}

// Extrai todos os equipamentos RM da lista do portal GE
async function extrairEquipamentosGe(page) {
  // Navega para a lista de equipamentos
  await page.goto(`${GEHC_BASE}/account/equipment`, { waitUntil: 'networkidle', timeout: 20000 });

  const equipamentos = [];

  // Captura todos os cards/linhas de equipamento
  // O portal pode ter paginação — captura até não ter mais "próximo"
  let pagina = 1;
  while (true) {
    await page.waitForLoadState('networkidle');

    const cards = await page.locator('[class*="equipment-card"], [class*="asset-item"], [class*="product-item"]').all();

    if (cards.length === 0) {
      // Tenta seletor genérico baseado em links com serial
      const links = await page.locator('a[href*="/equipment/"]').all();
      for (const link of links) {
        const href  = await link.getAttribute('href');
        const texto = await link.innerText().catch(() => '');
        const assetId = href?.split('/equipment/')[1]?.split('/')[0]?.split('?')[0];
        if (assetId) {
          equipamentos.push({ assetId, texto: texto.trim(), href });
        }
      }
      break;
    }

    for (const card of cards) {
      const href    = await card.locator('a[href*="/equipment/"]').first().getAttribute('href').catch(() => null);
      const serial  = await card.locator('[class*="serial"], [class*="tag"], [class*="model-number"]').first().innerText().catch(() => '');
      const modelo  = await card.locator('[class*="model"], [class*="name"]').first().innerText().catch(() => '');
      const tipo    = await card.locator('[class*="modality"], [class*="type"]').first().innerText().catch(() => '');
      const assetId = href?.split('/equipment/')[1]?.split('/')[0]?.split('?')[0];

      if (assetId) {
        equipamentos.push({ assetId, serial: serial.trim(), modelo: modelo.trim(), tipo: tipo.trim(), href });
      }
    }

    // Tenta próxima página
    const btnProximo = page.locator('button[aria-label*="next"], button[aria-label*="Next"], [class*="pagination"] button:last-child').first();
    const desabilitado = await btnProximo.isDisabled().catch(() => true);
    if (desabilitado) break;

    await btnProximo.click();
    pagina++;
    if (pagina > 20) break; // segurança
  }

  return equipamentos;
}

// Detecta se é RM pelo tipo/modelo
function ehRessonancia(equipGe) {
  const texto = `${equipGe.tipo} ${equipGe.modelo} ${equipGe.texto ?? ''}`.toUpperCase();
  return texto.includes('MR') || texto.includes('RM') || texto.includes('RESSONANCIA') ||
         texto.includes('RESONANCE') || texto.includes('SIGNA') || texto.includes('DISCOVERY');
}

export async function descobrirEquipamentosGehc(tenantId) {
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    throw new Error('GEHC_LOGIN e GEHC_PASSWORD não configurados no .env');
  }

  // Busca RMs GE cadastradas no SIMEC sem gehcAssetId
  const equipamentosSimec = await prisma.equipamento.findMany({
    where: {
      tenantId,
      fabricante: { contains: 'GE', mode: 'insensitive' },
      tipo:       { contains: 'RM',  mode: 'insensitive' },
    },
    select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true },
  });

  if (equipamentosSimec.length === 0) {
    return { vinculados: [], semMatch: [], jaVinculados: [] };
  }

  console.log(`[GEHC_DISCOVERY] ${equipamentosSimec.length} RM(s) GE encontradas no SIMEC.`);

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  try {
    await loginGehc(page);
    const equipamentosGe = await extrairEquipamentosGe(page);
    const rmsGe = equipamentosGe.filter(ehRessonancia);

    console.log(`[GEHC_DISCOVERY] ${rmsGe.length} RM(s) encontradas no portal GE.`);

    const vinculados  = [];
    const semMatch    = [];
    const jaVinculados = [];

    for (const simec of equipamentosSimec) {
      if (simec.gehcAssetId) {
        jaVinculados.push({ simecId: simec.id, tag: simec.tag, gehcAssetId: simec.gehcAssetId });
        continue;
      }

      // Tenta fazer match com cada RM do portal GE
      let melhorMatch = null;
      let melhorDist  = Infinity;

      for (const ge of rmsGe) {
        // Tenta match com serial e com modelo
        const porSerial = matchSerial(simec.tag, ge.serial);
        const porModelo = matchSerial(simec.tag, ge.assetId);

        const resultado = porSerial.match ? porSerial : (porModelo.match ? porModelo : null);

        if (resultado?.match && resultado.distancia < melhorDist) {
          melhorMatch = { ge, resultado };
          melhorDist  = resultado.distancia;
        }
      }

      if (melhorMatch) {
        await prisma.equipamento.update({
          where: { tenantId_id: { tenantId, id: simec.id } },
          data:  {
            gehcAssetId:  melhorMatch.ge.assetId,
            gehcSystemId: melhorMatch.ge.systemId ?? null,
          },
        });

        vinculados.push({
          simecId:     simec.id,
          tag:         simec.tag,
          gehcAssetId: melhorMatch.ge.assetId,
          confianca:   melhorMatch.resultado.confianca,
          distancia:   melhorMatch.resultado.distancia,
          tagGe:       melhorMatch.ge.serial,
        });

        console.log(`[GEHC_DISCOVERY] ✓ Vinculado: SIMEC "${simec.tag}" ↔ GE "${melhorMatch.ge.serial}" (confiança: ${melhorMatch.resultado.confianca}, dist: ${melhorMatch.resultado.distancia})`);
      } else {
        semMatch.push({ simecId: simec.id, tag: simec.tag, modelo: simec.modelo });
        console.log(`[GEHC_DISCOVERY] ✗ Sem match: SIMEC "${simec.tag}" (${simec.modelo})`);
      }
    }

    return { vinculados, semMatch, jaVinculados };
  } finally {
    await browser.close();
  }
}
