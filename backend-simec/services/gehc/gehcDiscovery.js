import prisma from '../prismaService.js';
import { obterTokensGehc } from './gehcAuthService.js';
import { fetchAllAssets } from './gehcGraphqlClient.js';

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

// ─── Discovery via GraphQL ────────────────────────────────────────────────────

async function listarRmsGe(tenantId) {
  let tokens;
  try {
    tokens = await obterTokensGehc(tenantId);
  } catch (err) {
    throw new Error(
      `Autenticação GE necessária. Execute POST /api/gehc/auth para capturar os tokens primeiro. (${err.message})`
    );
  }

  const assetsGe = await fetchAllAssets(tokens);
  const rmsGe = assetsGe.filter(a => {
    const texto = `${a.modality ?? ''} ${a.model ?? ''} ${a.productDescription ?? ''}`.toUpperCase();
    return texto.includes('MR') || texto.includes('RM') || texto.includes('RESSONANCIA') ||
           texto.includes('RESONANCE') || texto.includes('SIGNA') || texto.includes('DISCOVERY');
  });

  console.log(`[GEHC_DISCOVERY] GraphQL: ${rmsGe.length} RM(s) encontradas no portal GE.`);
  return { rmsGe, tokens };
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function melhorMatchGe(simec, rmsGe) {
  let melhor = null;
  let melhorDist = Infinity;

  for (const ge of rmsGe) {
    const porSerial  = matchSerial(simec.tag, ge.equipmentId ?? '');
    const porAssetId = matchSerial(simec.tag, ge.id ?? '');
    const resultado  = porSerial.match ? porSerial : (porAssetId.match ? porAssetId : null);

    if (resultado?.match && resultado.distancia < melhorDist) {
      melhor     = { ge, resultado };
      melhorDist = resultado.distancia;
    }
  }

  return melhor;
}

// ─── Função principal ─────────────────────────────────────────────────────────
// Matches exatos → vinculados automaticamente
// Matches fuzzy  → retornados como pendentesConfirmacao (vinculados, mas sinalizados para revisão)
// Sem match       → semMatch (não vinculados)

export async function descobrirEquipamentosGehc(tenantId) {
  const equipamentosSimec = await prisma.equipamento.findMany({
    where: {
      tenantId,
      fabricante: { contains: 'GE', mode: 'insensitive' },
      OR: [
        { tipo: { contains: 'Ressonan', mode: 'insensitive' } },
        { tipo: { contains: 'RM',       mode: 'insensitive' } },
      ],
    },
    select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true },
  });

  if (equipamentosSimec.length === 0) {
    return { vinculados: [], pendentesConfirmacao: [], semMatch: [], jaVinculados: [], modo: 'sem_equipamentos', totalPortalGe: 0 };
  }

  console.log(`[GEHC_DISCOVERY] ${equipamentosSimec.length} RM(s) GE encontradas no SIMEC.`);

  const { rmsGe } = await listarRmsGe(tenantId);

  const vinculados            = [];
  const pendentesConfirmacao  = [];
  const semMatch              = [];
  const jaVinculados          = [];

  for (const simec of equipamentosSimec) {
    if (simec.gehcAssetId) {
      jaVinculados.push({ simecId: simec.id, tag: simec.tag, gehcAssetId: simec.gehcAssetId });
      continue;
    }

    const match = melhorMatchGe(simec, rmsGe);

    if (match) {
      const gehcAssetId  = match.ge.id;
      const gehcSystemId = match.ge.systemId ?? null;

      await prisma.equipamento.update({
        where: { tenantId_id: { tenantId, id: simec.id } },
        data:  { gehcAssetId, gehcSystemId },
      });

      const item = {
        simecId:    simec.id,
        tag:        simec.tag,
        gehcAssetId,
        gehcSystemId,
        modelo:     match.ge.model ?? null,
        modalidade: match.ge.modality ?? null,
        confianca:  match.resultado.confianca,
        distancia:  match.resultado.distancia,
        serialGe:   match.ge.equipmentId ?? null,
      };

      if (match.resultado.confianca === 'exato') {
        vinculados.push(item);
        console.log(`[GEHC_DISCOVERY] ✓ Vinculado (exato): SIMEC "${simec.tag}" ↔ GE "${match.ge.equipmentId}"`);
      } else {
        pendentesConfirmacao.push(item);
        console.log(`[GEHC_DISCOVERY] ⚠ Vinculado (fuzzy, dist=${match.resultado.distancia}): SIMEC "${simec.tag}" ↔ GE "${match.ge.equipmentId}" — requer confirmação`);
      }
    } else {
      semMatch.push({ simecId: simec.id, tag: simec.tag, modelo: simec.modelo });
      console.log(`[GEHC_DISCOVERY] ✗ Sem match: SIMEC "${simec.tag}" (${simec.modelo})`);
    }
  }

  return { vinculados, pendentesConfirmacao, semMatch, jaVinculados, modo: 'graphql', totalPortalGe: rmsGe.length };
}

// ─── Vincular manualmente ─────────────────────────────────────────────────────

export async function vincularEquipamentoManual(tenantId, equipamentoId, gehcAssetId) {
  // Tenta buscar systemId via API se tiver tokens
  let gehcSystemId = null;
  try {
    const tokens = await obterTokensGehc(tenantId);
    const assets = await fetchAllAssets(tokens);
    const found  = assets.find(a => a.id === gehcAssetId || a.equipmentId === gehcAssetId);
    gehcSystemId = found?.systemId ?? null;
  } catch {
    // sem tokens ou API indisponível — vincula sem systemId
  }

  await prisma.equipamento.update({
    where: { tenantId_id: { tenantId, id: equipamentoId } },
    data:  { gehcAssetId, gehcSystemId },
  });

  return { gehcAssetId, gehcSystemId };
}

// ─── Desvincular ──────────────────────────────────────────────────────────────

export async function desvincularEquipamento(tenantId, equipamentoId) {
  await prisma.equipamento.update({
    where: { tenantId_id: { tenantId, id: equipamentoId } },
    data:  { gehcAssetId: null, gehcSystemId: null },
  });
}
