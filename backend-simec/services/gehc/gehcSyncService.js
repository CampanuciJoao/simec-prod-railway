import prisma from '../prismaService.js';
import { obterTokensGehc } from './gehcAuthService.js';
import {
  fetchAllAssets,
  fetchAssetCoverage,
  fetchServiceHistory,
  fetchUptimeData,
  fetchUtilizationData,
} from './gehcGraphqlClient.js';

// ─── Sync de contrato/cobertura ───────────────────────────────────────────────

async function sincronizarContrato(tenantId, equipamentoId, assetId, tokens) {
  const coverage = await fetchAssetCoverage({ assetId, tenantId, ...tokens });
  if (!coverage) return null;

  const contrato = coverage.coverage?.contractDetails ?? {};
  const garantia = coverage.coverage?.warranty ?? {};

  const data = {
    contractName:       contrato.contractName       ?? null,
    contractStatus:     contrato.contractStatusCode ?? null,
    contractStart:      contrato.contractStartDate  ? new Date(contrato.contractStartDate)      : null,
    contractExpiration: contrato.contractExpirationDate ? new Date(contrato.contractExpirationDate) : null,
    warrantyStatus:     garantia.warrantyStatusCode ?? null,
    warrantyExpiration: garantia.warrantyExpirationDate ? new Date(garantia.warrantyExpirationDate) : null,
    entitlements:       JSON.stringify(contrato.contractEntitlements ?? []),
    assetCoverageType:  coverage.assetCoverageType  ?? null,
    rawJson:            JSON.stringify(coverage),
    sincronizadoEm:     new Date(),
    updatedAt:          new Date(),
  };

  await prisma.gehcContrato.upsert({
    where:  { tenantId_equipamentoId: { tenantId, equipamentoId } },
    create: { id: crypto.randomUUID(), tenantId, equipamentoId, ...data },
    update: data,
  });

  return data;
}

// ─── Sync de histórico de OS ──────────────────────────────────────────────────

async function sincronizarOrdensServico(tenantId, equipamentoId, assetId, tokens) {
  const items = await fetchServiceHistory({ assetId, tenantId, ...tokens, maxRows: 100 });
  if (!items?.length) return 0;

  let novas = 0;
  let backfills = 0;

  // Mapeia raw activities (resposta GE GraphQL) para forma compacta usada
  // pelo LLM como contexto. Strip campos que nao servem pro raciocinio
  // (timeSheets etc) — preserva so o que e narrativa tecnica.
  function compactarActivities(activities) {
    if (!Array.isArray(activities)) return null;
    const compactas = activities
      .filter((a) => a?.correctiveAction || a?.engineer)
      .map((a) => ({
        id:            a.id || null,
        type:          a.activityType   || null,
        status:        a.activityStatus || null,
        startedAt:     a.startedDateTime || a.startedWorkingDateTime || null,
        engineer:      a.engineer
          ? `${a.engineer.engineerFirstName || ''} ${a.engineer.engineerLastName || ''}`.trim()
          : null,
        action:        a.correctiveAction || null,
      }));
    return compactas.length ? compactas : null;
  }

  for (const os of items) {
    const serviceId = os.id ?? os.serviceTrackingNumber;
    if (!serviceId) continue;

    const activitiesJson = compactarActivities(os.activitiesV2);

    // A query GraphQL ordena activities por startedDateTime DESC, entao
    // [0] eh a MAIS RECENTE (e [-1] eh a mais antiga, bug anterior).
    // A mais recente costuma ser a do field engineer com o diagnostico
    // real — exatamente o que queremos no resumo.
    const atividadeRecente = os.activitiesV2?.[0] || null;
    const engenheiro = atividadeRecente?.engineer
      ? `${atividadeRecente.engineer.engineerFirstName ?? ''} ${atividadeRecente.engineer.engineerLastName ?? ''}`.trim()
      : null;

    const existe = await prisma.gehcOrdemServico.findUnique({ where: { gehcServiceId: String(serviceId) } });

    if (existe) {
      // Backfill: se a OS ja existe mas activitiesJson esta null (pre-feature),
      // ou se engenheiro/action eram da activity errada (antiga vs nova),
      // atualizar APENAS os campos do timeline — preserva resto intocado.
      if (existe.activitiesJson === null && activitiesJson) {
        await prisma.gehcOrdemServico.update({
          where: { gehcServiceId: String(serviceId) },
          data: {
            activitiesJson,
            engineerName:     engenheiro || existe.engineerName,
            correctiveAction: atividadeRecente?.correctiveAction || existe.correctiveAction,
          },
        });
        backfills++;
      }
      continue;
    }

    await prisma.gehcOrdemServico.create({
      data: {
        id:                 crypto.randomUUID(),
        tenantId,
        equipamentoId,
        gehcServiceId:      String(serviceId),
        problemDescription: os.problemDescription ?? null,
        trackingNumber:     os.serviceTrackingNumber ?? null,
        serviceTypeCode:    os.serviceTypeCode    ?? null,
        serviceStateCode:   os.serviceStateCode   ?? null,
        requestedAt:        os.requestedDateTime  ? new Date(os.requestedDateTime) : null,
        scheduledDate:      os.scheduledDate      ? new Date(os.scheduledDate)     : null,
        engineerName:       engenheiro,
        correctiveAction:   atividadeRecente?.correctiveAction ?? null,
        activitiesJson,
        rawJson:            JSON.stringify(os),
      },
    });
    novas++;
  }

  if (backfills > 0) {
    console.log(`[GEHC_SYNC] Backfill: ${backfills} OS(s) ganharam activitiesJson agora.`);
  }
  return novas;
}

// ─── Sync de utilização e uptime mensais ──────────────────────────────────────

async function sincronizarUtilizacao(tenantId, equipamentoId, assetId, tokens) {
  const [uptime, utilizacao] = await Promise.allSettled([
    fetchUptimeData({ assetId, tenantId, ...tokens }),
    fetchUtilizationData({ assetId, tenantId, ...tokens, diasRetroativos: 365 }),
  ]).then(r => r.map(res => res.status === 'fulfilled' ? res.value : null));

  const mesesUptime = uptime?.uptimeMonthlyAggregates ?? [];
  const mesesPacientes = utilizacao?.patientsAggregate?.monthlyAggregates ?? [];
  const mesesExames    = utilizacao?.examsAggregate?.monthlyAggregates    ?? [];
  const mesesDuracao   = utilizacao?.examsDurationAggregate?.monthlyAggregates ?? [];

  // Agrupa tudo por mês
  const porMes = {};

  for (const m of mesesUptime) {
    const key = m.aggregateDate?.slice(0, 7); // 'YYYY-MM'
    if (!key) continue;
    porMes[key] ??= {};
    porMes[key].uptimeContrato = m.contractUptime ?? null;
    porMes[key].uptimeClock    = m.clockUptime    ?? null;
  }
  for (const m of mesesPacientes) {
    const key = m.aggregateDate?.slice(0, 7);
    if (!key) continue;
    porMes[key] ??= {};
    porMes[key].pacientesTotal = m.patientsCount ?? null;
  }
  for (const m of mesesExames) {
    const key = m.aggregateDate?.slice(0, 7);
    if (!key) continue;
    porMes[key] ??= {};
    porMes[key].examesTotal = m.examsCount ?? null;
  }
  for (const m of mesesDuracao) {
    const key = m.aggregateDate?.slice(0, 7);
    if (!key) continue;
    porMes[key] ??= {};
    // duração total / exames do mês → média em minutos
    const examesDoMes = porMes[key].examesTotal ?? 1;
    porMes[key].duracaoMediaMin = m.examsDurationTotal
      ? Math.round((m.examsDurationTotal / examesDoMes) * 100) / 100
      : null;
  }

  let upserts = 0;
  for (const [mesStr, dados] of Object.entries(porMes)) {
    const mesReferencia = new Date(`${mesStr}-01T00:00:00.000Z`);
    await prisma.gehcUtilizacaoMensal.upsert({
      where:  { tenantId_equipamentoId_mesReferencia: { tenantId, equipamentoId, mesReferencia } },
      create: { id: crypto.randomUUID(), tenantId, equipamentoId, mesReferencia, ...dados, sincronizadoEm: new Date() },
      update: { ...dados, sincronizadoEm: new Date() },
    });
    upserts++;
  }

  return { meses: upserts, uptimeAgregado: uptime?.contractUptimeAggregate ?? null };
}

// ─── Sync completo de um equipamento ─────────────────────────────────────────

async function sincronizarEquipamento(eq, tokens) {
  const nome = eq.apelido || eq.modelo || eq.id;
  const resultado = { id: eq.id, nome, assetId: eq.gehcAssetId };

  try {
    resultado.contrato = await sincronizarContrato(eq.tenantId, eq.id, eq.gehcAssetId, tokens);
    console.log(`[GEHC_SYNC] ${nome}: contrato sincronizado.`);
  } catch (err) {
    console.error(`[GEHC_SYNC] ${nome}: erro no contrato — ${err.message}`);
    resultado.contratoErro = err.message;
  }

  try {
    resultado.novasOS = await sincronizarOrdensServico(eq.tenantId, eq.id, eq.gehcAssetId, tokens);
    console.log(`[GEHC_SYNC] ${nome}: ${resultado.novasOS} OS nova(s) importada(s).`);
  } catch (err) {
    console.error(`[GEHC_SYNC] ${nome}: erro nas OS — ${err.message}`);
    resultado.osErro = err.message;
  }

  try {
    resultado.utilizacao = await sincronizarUtilizacao(eq.tenantId, eq.id, eq.gehcAssetId, tokens);
    console.log(`[GEHC_SYNC] ${nome}: ${resultado.utilizacao.meses} meses de utilização sincronizados.`);
  } catch (err) {
    console.error(`[GEHC_SYNC] ${nome}: erro na utilização — ${err.message}`);
    resultado.utilizacaoErro = err.message;
  }

  return resultado;
}

// ─── Sync de todos os equipamentos vinculados do tenant ──────────────────────

// Pula equipamentos Vendidos ou Desativados — sem sync de OS/contrato/util.
const STATUS_INATIVOS = ['Vendido', 'Desativado'];

export async function sincronizarDadosGehc({ tenantId } = {}) {

  const filtroStatus = { status: { notIn: STATUS_INATIVOS } };
  const where = tenantId
    ? { tenantId, gehcAssetId: { not: null }, ...filtroStatus }
    : { gehcAssetId: { not: null }, ...filtroStatus };

  const equipamentos = await prisma.equipamento.findMany({
    where,
    select: { id: true, tenantId: true, apelido: true, modelo: true, gehcAssetId: true },
  });

  if (equipamentos.length === 0) {
    console.log('[GEHC_SYNC] Nenhum equipamento vinculado ao portal GE.');
    return { total: 0, resultados: [] };
  }

  console.log(`[GEHC_SYNC] Iniciando sync de ${equipamentos.length} equipamento(s).`);

  // Agrupa por tenant para reutilizar tokens
  const porTenant = equipamentos.reduce((acc, eq) => {
    (acc[eq.tenantId] ??= []).push(eq);
    return acc;
  }, {});

  const resultados = [];

  for (const [tid, eqs] of Object.entries(porTenant)) {
    let tokens;
    try {
      tokens = await obterTokensGehc(tid);
    } catch (err) {
      console.error(`[GEHC_SYNC] Não foi possível autenticar tenant ${tid}: ${err.message}`);
      resultados.push(...eqs.map(eq => ({ id: eq.id, erro: 'auth_failed' })));
      continue;
    }

    for (const eq of eqs) {
      const r = await sincronizarEquipamento(eq, tokens);
      resultados.push(r);
    }
  }

  console.log('[GEHC_SYNC] Sync concluído.');
  return { total: equipamentos.length, resultados };
}
