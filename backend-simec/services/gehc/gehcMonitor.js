import prisma from '../prismaService.js';
import { processarAlertasGehc } from './gehcAlertRepository.js';
import { descobrirEquipamentosGehc } from './gehcDiscovery.js';
import { obterTokensGehc } from './gehcAuthService.js';
import { dispararNotificacoesTelegram } from '../telegram/telegramAlertService.js';
import {
  fetchEquipmentHealth,
  fetchAssetConnectivity,
  fetchUptimeData,
  fetchUtilizationData,
} from './gehcGraphqlClient.js';

const GEHC_BASE_URL = 'https://www.gehealthcare.com.br';

function temDadosSuficientes(snapshot) {
  if (!snapshot) return false;
  // Conectividade sozinha já é dado válido (registra offline no histórico)
  if (snapshot.equipmentOnline !== null && snapshot.equipmentOnline !== undefined) return true;
  return [
    snapshot.heliumLevelPct,
    snapshot.heliumPressurePsi,
    snapshot.compressorStatus,
    snapshot.coolantTempC,
    snapshot.coolantFlowGpm,
    snapshot.cryocoolerStatus,
    snapshot.magnetOnline,
  ].some((value) => value !== null && value !== undefined);
}

export async function monitorarSaudeGehc({ tenantId, rodarDiscovery = false, accessToken = null, idToken = null } = {}) {
  // Obtém tokens via auth service se não foram passados explicitamente
  if ((!accessToken || !idToken) && tenantId) {
    try {
      const tokens = await obterTokensGehc(tenantId);
      accessToken = tokens.accessToken;
      idToken     = tokens.idToken;
    } catch (err) {
      console.warn(`[GEHC_MONITOR] Não foi possível obter tokens (${err.message}) — usando Playwright como fallback.`);
    }
  }

  // Discovery automático: vincula equipamentos GE ainda sem gehcAssetId
  if (rodarDiscovery && tenantId) {
    console.log('[GEHC_MONITOR] Rodando discovery para vincular novos equipamentos GE...');
    const disc = await descobrirEquipamentosGehc(tenantId);
    console.log(`[GEHC_MONITOR] Discovery: ${disc.vinculados.length} vinculado(s), ${disc.semMatch.length} sem match.`);
    if (disc.semMatch.length > 0) {
      console.warn('[GEHC_MONITOR] Equipamentos sem match no portal GE:', disc.semMatch.map(e => e.tag).join(', '));
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
      tipo: true,
      gehcAssetId: true,
      gehcSystemId: true,
    },
  });

  if (equipamentos.length === 0) {
    console.log('[GEHC_MONITOR] Nenhum equipamento com gehcAssetId cadastrado.');
    return;
  }

  console.log(`[GEHC_MONITOR] Iniciando monitoramento paralelo de ${equipamentos.length} equipamento(s) GE.`);

  const resultados = await Promise.allSettled(equipamentos.map(async (eq) => {
    const nome = eq.apelido || eq.modelo || eq.id;

    try {
      if (!accessToken || !idToken) {
        console.warn(`[GEHC_MONITOR] ${nome}: sem tokens de autenticação — execute POST /api/gehc/auth para autenticar.`);
        return { tenantId: eq.tenantId, mudouContagem: false };
      }
      if (!eq.gehcSystemId) {
        console.warn(`[GEHC_MONITOR] ${nome}: sem gehcSystemId — execute o discovery novamente para obter o systemId.`);
        return { tenantId: eq.tenantId, mudouContagem: false };
      }

      console.log(`[GEHC_MONITOR] Capturando saúde: ${nome} (${eq.gehcAssetId})`);

      const [healthData, connectivityData] = await Promise.allSettled([
        fetchEquipmentHealth({ systemId: eq.gehcSystemId, accessToken, idToken, tenantId: eq.tenantId }),
        fetchAssetConnectivity({ systemId: eq.gehcSystemId, accessToken, idToken, tenantId: eq.tenantId }),
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

      const snapshot = {
        ...(healthData ?? {}),
        equipmentOnline: connectivityData?.equipmentOnline ?? null,
      };
      delete snapshot._raw;

      if (!temDadosSuficientes(snapshot)) {
        console.warn(`[GEHC_MONITOR] ${nome}: sem dados de saúde nem conectividade — snapshot ignorado.`);
        return { tenantId: eq.tenantId, mudouContagem: false };
      }

      // Enriquece com uptime/utilização (não bloqueia o snapshot se falhar)
      const [uptimeData, utilizacaoData] = await Promise.allSettled([
        fetchUptimeData({ assetId: eq.gehcAssetId, accessToken, idToken, tenantId: eq.tenantId }),
        fetchUtilizationData({ assetId: eq.gehcAssetId, accessToken, idToken, tenantId: eq.tenantId }),
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

      await prisma.gehcSaudeSnapshot.create({
        data: {
          tenantId:      eq.tenantId,
          equipamentoId: eq.id,
          ...snapshot,
          rawJson: JSON.stringify({ ...snapshot, uptime: uptimeData, utilizacao: utilizacaoData }),
        },
      });

      const tipoNorm = (eq.tipo ?? '').toLowerCase();
      const eRessonancia = tipoNorm.includes('ressonância') || tipoNorm.includes('ressonancia') || tipoNorm.includes('rm');

      const { criados, mudouContagem } = await processarAlertasGehc({
        tenantId:        eq.tenantId,
        equipamentoId:   eq.id,
        equipamentoNome: nome,
        snapshot,
        eRessonancia,
      });

      const uptimePct    = uptimeData?.contractUptimeAggregate ?? '?';
      const pacientesDia = utilizacaoData?.patientsAggregate?.averagePerDay ?? '?';
      console.log(`[GEHC_MONITOR] ${nome}: snapshot salvo, ${criados} alerta(s) novo(s). Online=${snapshot.equipmentOnline} | Hélio=${snapshot.heliumLevelPct}% | Uptime=${uptimePct}% | Pacientes/dia=${pacientesDia}`);

      return { tenantId: eq.tenantId, mudouContagem };
    } catch (err) {
      console.error(`[GEHC_MONITOR] Erro ao monitorar ${nome}:`, err.message);
      return { tenantId: eq.tenantId, mudouContagem: false };
    }
  }));

  // Dispara Telegram uma única vez por tenant que teve mudanças de alerta
  const tenantsComMudancas = new Set(
    resultados
      .filter(r => r.status === 'fulfilled' && r.value?.mudouContagem)
      .map(r => r.value.tenantId)
  );
  if (tenantsComMudancas.size > 0) {
    await dispararNotificacoesTelegram([...tenantsComMudancas]);
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
