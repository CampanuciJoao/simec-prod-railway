import prisma from '../prismaService.js';
import { scrapeEquipamentoSaude } from './gehcScraper.js';
import { processarAlertasGehc } from './gehcAlertRepository.js';
import { descobrirEquipamentosGehc } from './gehcDiscovery.js';

const GEHC_BASE_URL = 'https://www.gehealthcare.com.br';

export async function monitorarSaudeGehc({ tenantId, rodarDiscovery = false } = {}) {
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    console.warn('[GEHC_MONITOR] GEHC_LOGIN/GEHC_PASSWORD não configurados — pulando monitoramento.');
    return;
  }

  // Discovery automático: vincula RMs GE ainda sem gehcAssetId
  if (rodarDiscovery && tenantId) {
    console.log('[GEHC_MONITOR] Rodando discovery para vincular novas RMs...');
    const disc = await descobrirEquipamentosGehc(tenantId);
    console.log(`[GEHC_MONITOR] Discovery: ${disc.vinculados.length} vinculado(s), ${disc.semMatch.length} sem match.`);
    if (disc.semMatch.length > 0) {
      console.warn('[GEHC_MONITOR] RMs sem match no portal GE:', disc.semMatch.map(e => e.tag).join(', '));
    }
  }

  const where = tenantId
    ? { tenantId, gehcAssetId: { not: null } }
    : { gehcAssetId: { not: null } };

  const equipamentos = await prisma.equipamento.findMany({
    where,
    select: {
      id: true,
      tenantId: true,
      apelido: true,
      modelo: true,
      gehcAssetId: true,
    },
  });

  if (equipamentos.length === 0) {
    console.log('[GEHC_MONITOR] Nenhum equipamento com gehcAssetId cadastrado.');
    return;
  }

  console.log(`[GEHC_MONITOR] Iniciando monitoramento de ${equipamentos.length} equipamento(s) GE.`);

  for (const eq of equipamentos) {
    const nome = eq.apelido || eq.modelo || eq.id;
    const url  = `${GEHC_BASE_URL}/account/equipment/${eq.gehcAssetId}`;

    try {
      console.log(`[GEHC_MONITOR] Capturando saúde: ${nome} (${eq.gehcAssetId})`);

      const snapshot = await scrapeEquipamentoSaude({
        gehcAssetUrl: url,
        gehcLogin:    GEHC_LOGIN,
        gehcPassword: GEHC_PASSWORD,
      });

      await prisma.gehcSaudeSnapshot.create({
        data: {
          tenantId:      eq.tenantId,
          equipamentoId: eq.id,
          ...snapshot,
        },
      });

      const { criados } = await processarAlertasGehc({
        tenantId:        eq.tenantId,
        equipamentoId:   eq.id,
        equipamentoNome: nome,
        snapshot,
      });

      console.log(`[GEHC_MONITOR] ${nome}: snapshot salvo, ${criados} alerta(s) novo(s).`);
      console.log(`[GEHC_MONITOR]   Hélio: ${snapshot.heliumLevelPct}% | Pressão: ${snapshot.heliumPressurePsi} PSI | Compressor: ${snapshot.compressorStatus} | Temp: ${snapshot.coolantTempC}°C | Fluxo: ${snapshot.coolantFlowGpm} GPM`);
    } catch (err) {
      console.error(`[GEHC_MONITOR] Erro ao monitorar ${nome}:`, err.message);
    }
  }

  console.log('[GEHC_MONITOR] Monitoramento concluído.');
}

export async function obterUltimoSnapshotGehc(tenantId, equipamentoId) {
  return prisma.gehcSaudeSnapshot.findFirst({
    where: { tenantId, equipamentoId },
    orderBy: { capturedAt: 'desc' },
  });
}

export async function obterHistoricoHelioGehc(tenantId, equipamentoId, dias = 30) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  return prisma.gehcSaudeSnapshot.findMany({
    where: {
      tenantId,
      equipamentoId,
      capturedAt: { gte: desde },
      heliumLevelPct: { not: null },
    },
    orderBy: { capturedAt: 'asc' },
    select: {
      capturedAt:       true,
      heliumLevelPct:   true,
      heliumPressurePsi: true,
      compressorStatus: true,
      coolantTempC:     true,
      coolantFlowGpm:   true,
    },
  });
}
