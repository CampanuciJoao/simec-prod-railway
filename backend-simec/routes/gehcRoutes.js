import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { descobrirEquipamentosGehc, vincularEquipamentoManual, desvincularEquipamento } from '../services/gehc/gehcDiscovery.js';
import { monitorarSaudeGehc, obterUltimoSnapshotGehc } from '../services/gehc/gehcMonitor.js';
import { sincronizarDadosGehc } from '../services/gehc/gehcSyncService.js';
import {
  capturarTokensViaPlaywright,
  invalidarTokensGehc,
  salvarCredenciais,
  removerCredenciais,
  temCredenciaisConfiguradas,
} from '../services/gehc/gehcAuthService.js';
import { gerarPdfSaudeEquipamentoBuffer } from '../services/pdf/pdfDocumentService.js';
import { RM_FILTER } from '../services/equipamento/equipamentoModalidade.js';

const router = express.Router();

// Snapshot e considerado "valido" apenas se tem pelo menos uma metrica de
// saude RM (helio, cryo, compressor, etc). Conectividade pura
// (equipmentOnline) nao basta — para o usuario, "Online" sem nenhum dado
// de criogenia nao e informacao acionavel.
const whereSnapshotValido = {
  OR: [
    { heliumLevelPct: { not: null } },
    { heliumPressurePsi: { not: null } },
    { compressorStatus: { not: null } },
    { coolantTempC: { not: null } },
    { coolantFlowGpm: { not: null } },
    { cryocoolerStatus: { not: null } },
    { magnetOnline: { not: null } },
  ],
};

// Filtro para equipamentos GE de qualquer modalidade (TC, RM, RX, MN, etc).
// Telemetria especializada (helio/cryo) continua restrita a RM no Knowledge
// Layer; aqui o foco e contrato/uptime/PMs/OS, que se aplicam a todos.
const whereRmGe = {
  fabricante: { contains: 'GE', mode: 'insensitive' },
};

// ─── GET /api/gehc/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const [total, vinculados, semVinculo, vinculadosLista, totalSnapshots, alertasAtivos, snapshotsValidos, temToken] =
      await Promise.all([
        prisma.equipamento.count({
          where: { tenantId, ...whereRmGe },
        }),
        prisma.equipamento.count({
          where: { tenantId, gehcAssetId: { not: null } },
        }),
        prisma.equipamento.findMany({
          where: { tenantId, ...whereRmGe, gehcAssetId: null },
          select: { id: true, tag: true, apelido: true, modelo: true },
        }),
        prisma.equipamento.findMany({
          where: { tenantId, gehcAssetId: { not: null } },
          select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true },
          orderBy: [{ apelido: 'asc' }, { tag: 'asc' }],
        }),
        prisma.gehcSaudeSnapshot.count({ where: { tenantId } }),
        prisma.alerta.count({ where: { tenantId, tipo: 'GEHC_SAUDE' } }),
        prisma.gehcSaudeSnapshot.findMany({
          where: {
            tenantId,
            ...whereSnapshotValido,
            equipamento: {
              gehcAssetId: { not: null },
              ...whereRmGe,
              ...RM_FILTER,
            },
          },
          orderBy: { capturedAt: 'desc' },
          take: 200,
          include: { equipamento: { select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true } } },
        }),
        prisma.gehcToken.findUnique({ where: { tenantId }, select: { capturedAt: true, expiresAt: true, gehcLogin: true, accessToken: true } }),
      ]);

    const equipamentosSincronizadosIds = new Set();
    const ultimosSnapshots = [];

    for (const snapshot of snapshotsValidos) {
      const equipamentoId = snapshot.equipamento?.id;
      if (!equipamentoId || !snapshot.equipamento?.gehcAssetId) continue;

      equipamentosSincronizadosIds.add(equipamentoId);

      if (ultimosSnapshots.some((item) => item.equipamentoId === equipamentoId)) {
        continue;
      }

      ultimosSnapshots.push({
        equipamentoId,
        equipamento: snapshot.equipamento?.apelido || snapshot.equipamento?.modelo || snapshot.equipamento?.tag,
        capturedAt: snapshot.capturedAt,
        heliumLevelPct: snapshot.heliumLevelPct,
        heliumPressurePsi: snapshot.heliumPressurePsi,
        compressorStatus: snapshot.compressorStatus,
        coolantTempC: snapshot.coolantTempC,
        magnetOnline: snapshot.magnetOnline,
        equipmentOnline: snapshot.equipmentOnline,
      });

      if (ultimosSnapshots.length >= 10) break;
    }

    res.json({
      rmsGe: { total, vinculadas: vinculados, semVinculo: semVinculo.length },
      rmsSeVinculo: semVinculo,
      rmsVinculadas: vinculadosLista,
      snapshots: {
        total: totalSnapshots,
        equipamentosSincronizados: equipamentosSincronizadosIds.size,
      },
      alertasAtivos,
      credenciais: { configurado: !!(temToken?.gehcLogin || process.env.GEHC_LOGIN) },
      auth: temToken?.accessToken
        ? { configurado: true, capturedAt: temToken.capturedAt, expiresAt: temToken.expiresAt }
        : { configurado: false },
      ultimosSnapshots,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/credenciais ───────────────────────────────────────────────
router.post('/credenciais', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'login e password são obrigatórios.' });
  try {
    await salvarCredenciais(tenantId, login, password);
    res.json({ ok: true, mensagem: 'Credenciais salvas. Clique em "Vincular equipamentos" para autenticar.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gehc/credenciais ─────────────────────────────────────────────
router.delete('/credenciais', admin, async (req, res) => {
  try {
    await removerCredenciais(req.usuario.tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/onboard ───────────────────────────────────────────────────
// Onboarding completo da integração GE em uma única chamada:
//   1. Salva credenciais (login + senha)
//   2. Captura tokens via Playwright
//   3. Roda discovery (vincula RMs SIMEC ↔ portal GE)
//   4. Dispara primeira captura de saúde
//
// Cada passo retorna seu próprio status. Se um falhar, os anteriores não são
// revertidos (são idempotentes), mas o cliente saberá exatamente onde parou.
// Ver ADR-016 (automacao da integracao GE).
router.post('/onboard', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'login e password são obrigatórios.' });
  }

  const passos = {
    credenciais: { ok: false },
    auth: { ok: false },
    discovery: { ok: false },
    captura: { ok: false },
  };

  // Passo 1: salvar credenciais
  try {
    await salvarCredenciais(tenantId, login, password);
    passos.credenciais.ok = true;
  } catch (err) {
    passos.credenciais.error = err.message;
    return res.status(500).json({ ok: false, passos, falhouEm: 'credenciais' });
  }

  // Passo 2: autenticar via Playwright
  try {
    await capturarTokensViaPlaywright(tenantId);
    passos.auth.ok = true;
  } catch (err) {
    passos.auth.error = err.message;
    return res.status(500).json({ ok: false, passos, falhouEm: 'auth' });
  }

  // Passo 3: discovery
  try {
    const resultado = await descobrirEquipamentosGehc(tenantId);
    passos.discovery.ok = true;
    passos.discovery.vinculados = resultado.vinculados.length;
    passos.discovery.jaVinculados = resultado.jaVinculados.length;
    passos.discovery.semMatch = resultado.semMatch.length;
    passos.discovery.pendentesConfirmacao = resultado.pendentesConfirmacao.length;
    passos.discovery.totalPortalGe = resultado.totalPortalGe ?? null;
  } catch (err) {
    passos.discovery.error = err.message;
    return res.status(500).json({ ok: false, passos, falhouEm: 'discovery' });
  }

  // Passo 4: primeira captura de saúde (não-bloqueante)
  // Se isso falhar, o tenant ainda está em estado utilizável (próximo ciclo do
  // monitor automático vai capturar). Reportamos como warning, não erro fatal.
  try {
    await monitorarSaudeGehc({ tenantId });
    passos.captura.ok = true;
  } catch (err) {
    passos.captura.warning = err.message;
  }

  res.json({
    ok: true,
    mensagem: 'Onboarding GE concluído. Próximos snapshots automáticos a cada 30min.',
    passos,
  });
});

// ─── POST /api/gehc/auth ──────────────────────────────────────────────────────
router.post('/auth', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  if (!(await temCredenciaisConfiguradas(tenantId))) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas. Salve o login e senha primeiro.' });
  }
  try {
    await capturarTokensViaPlaywright(tenantId);
    res.json({ ok: true, mensagem: 'Tokens capturados e salvos com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gehc/auth ────────────────────────────────────────────────────
router.delete('/auth', admin, async (req, res) => {
  await invalidarTokensGehc(req.usuario.tenantId);
  res.json({ ok: true });
});

// ─── POST /api/gehc/discovery ─────────────────────────────────────────────────
router.post('/discovery', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  if (!(await temCredenciaisConfiguradas(tenantId))) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas. Salve o login e senha primeiro.' });
  }
  try {
    console.log(`[GEHC_ROUTE] Discovery iniciado para tenant ${tenantId}`);
    const resultado = await descobrirEquipamentosGehc(tenantId);
    res.json({
      ok: true,
      modo:         resultado.modo,
      vinculados:   resultado.vinculados.length,
      jaVinculados: resultado.jaVinculados.length,
      semMatch:     resultado.semMatch.length,
      totalPortalGe: resultado.totalPortalGe ?? null,
      pendentesConfirmacao: resultado.pendentesConfirmacao.length,
      detalhes: {
        vinculados:            resultado.vinculados,
        pendentesConfirmacao:  resultado.pendentesConfirmacao,
        semMatch:              resultado.semMatch,
        jaVinculados:          resultado.jaVinculados,
      },
    });
  } catch (err) {
    console.error('[GEHC_ROUTE] Erro no discovery:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/monitor ───────────────────────────────────────────────────
router.post('/monitor', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  if (!(await temCredenciaisConfiguradas(tenantId))) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas. Salve o login e senha primeiro.' });
  }
  try {
    await monitorarSaudeGehc({ tenantId });
    res.json({ ok: true, mensagem: 'Monitoramento concluído. Veja os snapshots em /api/gehc/status.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/sync ──────────────────────────────────────────────────────
// Sincroniza contratos, OS, utilização e uptime de todos os equipamentos vinculados
router.post('/sync', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  if (!(await temCredenciaisConfiguradas(tenantId))) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas. Salve o login e senha primeiro.' });
  }
  try {
    console.log(`[GEHC_ROUTE] Sync iniciado para tenant ${tenantId}`);
    const resultado = await sincronizarDadosGehc({ tenantId });
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[GEHC_ROUTE] Erro no sync:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/gehc/equipamento/:equipamentoId/vincular ────────────────────────
router.put('/equipamento/:equipamentoId/vincular', admin, async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const { gehcAssetId } = req.body;
  if (!gehcAssetId) return res.status(400).json({ error: 'gehcAssetId é obrigatório.' });
  try {
    const resultado = await vincularEquipamentoManual(tenantId, equipamentoId, gehcAssetId);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gehc/equipamento/:equipamentoId/vincular ─────────────────────
router.delete('/equipamento/:equipamentoId/vincular', admin, async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  try {
    await desvincularEquipamento(tenantId, equipamentoId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/snapshots ───────────────────────
router.get('/equipamento/:equipamentoId/snapshots', async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const dias = Number(req.query.dias) || 30;
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  try {
    const snapshots = await prisma.gehcSaudeSnapshot.findMany({
      where: { tenantId, equipamentoId, capturedAt: { gte: desde } },
      orderBy: { capturedAt: 'desc' },
      select: {
        capturedAt: true, heliumLevelPct: true, heliumPressurePsi: true,
        compressorStatus: true, coolantTempC: true, coolantFlowGpm: true,
        cryocoolerStatus: true, magnetOnline: true, equipmentOnline: true,
      },
    });
    res.json({ equipamentoId, dias, total: snapshots.length, snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/contrato ────────────────────────
router.get('/equipamento/:equipamentoId/contrato', async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  try {
    const contrato = await prisma.gehcContrato.findUnique({
      where: { tenantId_equipamentoId: { tenantId, equipamentoId } },
    });
    if (!contrato) return res.status(404).json({ error: 'Contrato não sincronizado ainda.' });
    res.json(contrato);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/os ──────────────────────────────
router.get('/equipamento/:equipamentoId/os', async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const limite = Math.min(Number(req.query.limite) || 50, 200);

  try {
    const ordens = await prisma.gehcOrdemServico.findMany({
      where: { tenantId, equipamentoId },
      orderBy: { requestedAt: 'desc' },
      take: limite,
      select: {
        gehcServiceId: true, problemDescription: true, trackingNumber: true,
        serviceTypeCode: true, serviceStateCode: true, requestedAt: true,
        scheduledDate: true, engineerName: true, correctiveAction: true,
        sincronizadoEm: true,
      },
    });
    res.json({ equipamentoId, total: ordens.length, ordens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/utilizacao ──────────────────────
router.get('/equipamento/:equipamentoId/utilizacao', async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const meses = Math.min(Number(req.query.meses) || 12, 36);
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);

  try {
    const dados = await prisma.gehcUtilizacaoMensal.findMany({
      where: { tenantId, equipamentoId, mesReferencia: { gte: desde } },
      orderBy: { mesReferencia: 'desc' },
      select: {
        mesReferencia: true, pacientesTotal: true, examesTotal: true,
        duracaoMediaMin: true, uptimeContrato: true, uptimeClock: true,
      },
    });
    res.json({ equipamentoId, meses, total: dados.length, dados });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/resumo ──────────────────────────
// Tudo de uma vez: snapshot atual + contrato + últimas OS + utilização recente
router.get('/equipamento/:equipamentoId/resumo', async (req, res) => {
  const tenantId       = req.usuario.tenantId;
  const { equipamentoId } = req.params;

  try {
    const [equipamento, ultimoSnapshot, contrato, ultimasOS, utilizacao] = await Promise.all([
      prisma.equipamento.findUnique({
        where: { tenantId_id: { tenantId, id: equipamentoId } },
        select: { tag: true, apelido: true, modelo: true, gehcAssetId: true, gehcSystemId: true },
      }),
      obterUltimoSnapshotGehc(tenantId, equipamentoId),
      prisma.gehcContrato.findUnique({
        where: { tenantId_equipamentoId: { tenantId, equipamentoId } },
        select: {
          contractName: true, contractStatus: true,
          contractStart: true, contractExpiration: true,
          warrantyStatus: true, warrantyExpiration: true,
          assetCoverageType: true, entitlements: true,
        },
      }),
      prisma.gehcOrdemServico.findMany({
        where: { tenantId, equipamentoId },
        orderBy: { requestedAt: 'desc' },
        take: 5,
        select: {
          gehcServiceId: true, problemDescription: true,
          serviceStateCode: true, requestedAt: true, engineerName: true,
        },
      }),
      prisma.gehcUtilizacaoMensal.findMany({
        where: { tenantId, equipamentoId },
        orderBy: { mesReferencia: 'desc' },
        take: 6,
        select: {
          mesReferencia: true, pacientesTotal: true, examesTotal: true,
          duracaoMediaMin: true, uptimeContrato: true,
        },
      }),
    ]);

    if (!equipamento) return res.status(404).json({ error: 'Equipamento não encontrado.' });

    res.json({ equipamento, saude: ultimoSnapshot, contrato, ultimasOS, utilizacao });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── GET /api/gehc/equipamento/:equipamentoId/historico/grafico ───────────────
// Dados agregados para graficos: helio (media diaria) e pressao (media 6h)
router.get('/equipamento/:equipamentoId/historico/grafico', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const { inicio, fim } = req.query;

  const dataInicio = inicio ? new Date(inicio) : new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  const dataFim    = fim    ? new Date(fim + 'T23:59:59.999Z') : new Date();

  try {
    const snapshots = await prisma.gehcSaudeSnapshot.findMany({
      where: { tenantId, equipamentoId, capturedAt: { gte: dataInicio, lte: dataFim } },
      orderBy: { capturedAt: 'asc' },
      select: { capturedAt: true, heliumLevelPct: true, heliumPressurePsi: true },
    });

    // Helio: media diaria
    const helioMap = new Map();
    for (const s of snapshots) {
      if (s.heliumLevelPct === null) continue;
      const day = s.capturedAt.toISOString().split('T')[0];
      if (!helioMap.has(day)) helioMap.set(day, []);
      helioMap.get(day).push(s.heliumLevelPct);
    }
    const helio = [...helioMap.entries()].map(([day, vals]) => ({
      bucket: day + 'T00:00:00.000Z',
      avg:    +( vals.reduce((a, b) => a + b, 0) / vals.length ).toFixed(2),
      min:    +( Math.min(...vals) ).toFixed(2),
      max:    +( Math.max(...vals) ).toFixed(2),
      n:      vals.length,
    }));

    // Pressao: media a cada 6h
    const pressaoMap = new Map();
    for (const s of snapshots) {
      if (s.heliumPressurePsi === null) continue;
      const ts     = s.capturedAt.getTime();
      const bucket = new Date(Math.floor(ts / (6 * 3600 * 1000)) * (6 * 3600 * 1000)).toISOString();
      if (!pressaoMap.has(bucket)) pressaoMap.set(bucket, []);
      pressaoMap.get(bucket).push(s.heliumPressurePsi);
    }
    const pressao = [...pressaoMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, vals]) => ({
        bucket,
        avg: +( vals.reduce((a, b) => a + b, 0) / vals.length ).toFixed(3),
        min: +( Math.min(...vals) ).toFixed(3),
        max: +( Math.max(...vals) ).toFixed(3),
        n:   vals.length,
      }));

    res.json({ helio, pressao });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/historico ───────────────────────
// Snapshots paginados para tabela de historico de saude
router.get('/equipamento/:equipamentoId/historico', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const { inicio, fim } = req.query;
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const limite = Math.min(Number(req.query.limite) || 50, 200);
  const skip   = (pagina - 1) * limite;

  const where = {
    tenantId,
    equipamentoId,
    ...(inicio || fim
      ? { capturedAt: { ...(inicio && { gte: new Date(inicio) }), ...(fim && { lte: new Date(fim + 'T23:59:59.999Z') }) } }
      : {}),
  };

  try {
    const [total, snapshots] = await Promise.all([
      prisma.gehcSaudeSnapshot.count({ where }),
      prisma.gehcSaudeSnapshot.findMany({
        where,
        orderBy: { capturedAt: 'desc' },
        skip,
        take: limite,
        select: {
          capturedAt: true, heliumLevelPct: true, heliumPressurePsi: true,
          compressorStatus: true, coolantTempC: true, coolantFlowGpm: true,
          cryocoolerStatus: true, magnetOnline: true, equipmentOnline: true,
        },
      }),
    ]);

    res.json({ equipamentoId, total, pagina, limite, totalPaginas: Math.ceil(total / limite), snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/historico/export ────────────────
// Exportacao CSV do historico de saude
router.get('/equipamento/:equipamentoId/historico/export', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const { inicio, fim } = req.query;

  const where = {
    tenantId,
    equipamentoId,
    ...(inicio || fim
      ? { capturedAt: { ...(inicio && { gte: new Date(inicio) }), ...(fim && { lte: new Date(fim + 'T23:59:59.999Z') }) } }
      : {}),
  };

  try {
    const snapshots = await prisma.gehcSaudeSnapshot.findMany({
      where,
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedAt: true, heliumLevelPct: true, heliumPressurePsi: true,
        compressorStatus: true, coolantTempC: true, coolantFlowGpm: true,
        cryocoolerStatus: true, magnetOnline: true, equipmentOnline: true,
      },
    });

    const header = 'capturedAt,heliumLevelPct,heliumPressurePsi,compressorStatus,coolantTempC,coolantFlowGpm,cryocoolerStatus,magnetOnline,equipmentOnline';
    const rows   = snapshots.map(s => [
      s.capturedAt?.toISOString() ?? '',
      s.heliumLevelPct    ?? '',
      s.heliumPressurePsi ?? '',
      s.compressorStatus  ?? '',
      s.coolantTempC      ?? '',
      s.coolantFlowGpm    ?? '',
      s.cryocoolerStatus  ?? '',
      s.magnetOnline      ?? '',
      s.equipmentOnline   ?? '',
    ].join(','));

    const csv      = [header, ...rows].join('\n');
    const filename = `saude_ativo_${equipamentoId}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/equipamento/:equipamentoId/historico/export-pdf ─────────────
router.get('/equipamento/:equipamentoId/historico/export-pdf', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const { inicio, fim } = req.query;

  const where = {
    tenantId,
    equipamentoId,
    ...(inicio || fim
      ? { capturedAt: { ...(inicio && { gte: new Date(inicio) }), ...(fim && { lte: new Date(fim + 'T23:59:59.999Z') }) } }
      : {}),
  };

  try {
    const [equipamento, snapshots] = await Promise.all([
      prisma.equipamento.findFirst({
        where: { id: equipamentoId, tenantId },
        select: {
          modelo: true,
          tag: true,
          apelido: true,
          unidade: { select: { nomeSistema: true } },
        },
      }),
      prisma.gehcSaudeSnapshot.findMany({
        where,
        orderBy: { capturedAt: 'asc' },
        select: {
          capturedAt: true, heliumLevelPct: true, heliumPressurePsi: true,
          compressorStatus: true, coolantTempC: true, coolantFlowGpm: true,
          equipmentOnline: true,
        },
      }),
    ]);

    const pdfBuffer = await gerarPdfSaudeEquipamentoBuffer({
      equipamento: {
        modelo:   equipamento?.modelo,
        tag:      equipamento?.tag,
        apelido:  equipamento?.apelido,
        unidade:  equipamento?.unidade?.nomeSistema,
      },
      inicio: inicio || null,
      fim:    fim    || null,
      snapshots,
    }, { locale: 'pt-BR', timeZone: 'America/Sao_Paulo' });

    const tag      = equipamento?.tag || equipamentoId;
    const filename = `saude_ativo_${tag}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[GEHC_PDF_SAUDE]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/alertas/suspensoes ────────────────────────────────────────
// Lista suspensões ativas (não expiradas) do tenant
router.get('/alertas/suspensoes', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const suspensoes = await prisma.gehcAlertaSuspensao.findMany({
      where: { tenantId, suspensoAte: { gt: new Date() } },
      orderBy: { suspensoAte: 'asc' },
    });

    // Enriquece com nome do equipamento
    const equipIds = [...new Set(suspensoes.map(s => s.equipamentoId).filter(Boolean))];
    const equipamentos = equipIds.length > 0
      ? await prisma.equipamento.findMany({
          where: { tenantId, id: { in: equipIds } },
          select: { id: true, apelido: true, modelo: true, tag: true },
        })
      : [];
    const equipMap = Object.fromEntries(equipamentos.map(e => [e.id, e]));

    res.json(suspensoes.map(s => ({
      ...s,
      equipamento: s.equipamentoId ? equipMap[s.equipamentoId] ?? null : null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/alertas/suspensoes ───────────────────────────────────────
// Cria uma suspensão temporária de alertas
router.post('/alertas/suspensoes', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId, tipoEvento, motivo, duracaoHoras } = req.body;

  if (!duracaoHoras || duracaoHoras <= 0) {
    return res.status(400).json({ error: 'duracaoHoras deve ser maior que zero.' });
  }

  const suspensoAte = new Date(Date.now() + duracaoHoras * 60 * 60 * 1000);

  try {
    const suspensao = await prisma.gehcAlertaSuspensao.create({
      data: {
        tenantId,
        equipamentoId: equipamentoId || null,
        tipoEvento:    tipoEvento    || null,
        motivo:        motivo        || null,
        suspensoAte,
        criadoPor: req.usuario.id,
      },
    });
    res.status(201).json(suspensao);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gehc/alertas/suspensoes/:id ──────────────────────────────────
// Remove uma suspensão antes do prazo
router.delete('/alertas/suspensoes/:id', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { id } = req.params;
  try {
    await prisma.gehcAlertaSuspensao.deleteMany({ where: { id, tenantId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/bi/utilizacao ─────────────────────────────────────────────
// BI de utilização GE: agrega exames e pacientes por unidade → equipamento → mês
router.get('/bi/utilizacao', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const meses = Math.min(Number(req.query.meses) || 12, 36);

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - meses);
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);

  try {
    const registros = await prisma.gehcUtilizacaoMensal.findMany({
      where: { tenantId, mesReferencia: { gte: inicio } },
      orderBy: { mesReferencia: 'asc' },
      include: {
        equipamento: {
          select: {
            id: true, apelido: true, modelo: true, tag: true,
            unidadeId: true,
            unidade: { select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true } },
          },
        },
      },
    });

    function diasNoMes(date) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    // Prioriza nomeSistema (nome curto que aparece nos selects do app);
    // cai para nomeFantasia se não houver. Adiciona cidade apenas quando
    // o nome base não a inclui — evita 'CERDIL Dourados — Dourados'.
    function nomeUnidade(u) {
      const base = u?.nomeSistema || u?.nomeFantasia || '—';
      if (!u?.cidade) return base;
      if (base.toLowerCase().includes(u.cidade.toLowerCase())) return base;
      return `${base} — ${u.cidade}`;
    }

    // Agrupa por unidade → equipamento
    const unidadeMap = new Map();

    for (const r of registros) {
      const eq = r.equipamento;
      if (!eq) continue;
      const unidade = eq.unidade;
      const uid = eq.unidadeId;

      if (!unidadeMap.has(uid)) {
        unidadeMap.set(uid, {
          unidadeId: uid,
          nome: nomeUnidade(unidade),
          equipamentos: new Map(),
        });
      }

      const uNode = unidadeMap.get(uid);
      if (!uNode.equipamentos.has(eq.id)) {
        uNode.equipamentos.set(eq.id, {
          equipamentoId: eq.id,
          nome: eq.apelido || eq.modelo || eq.tag,
          tag: eq.tag,
          meses: [],
        });
      }

      const dias = diasNoMes(r.mesReferencia);
      uNode.equipamentos.get(eq.id).meses.push({
        mes:           r.mesReferencia.toISOString().slice(0, 7),
        exames:        r.examesTotal        ?? null,
        pacientes:     r.pacientesTotal     ?? null,
        duracaoMedia:  r.duracaoMediaMin    ?? null,
        uptime:        r.uptimeContrato     ?? null,
        mediaExamesDia: r.examesTotal != null ? +(r.examesTotal / dias).toFixed(1) : null,
      });
    }

    // Calcula totais
    const unidades = [...unidadeMap.values()].map(u => {
      const equipamentos = [...u.equipamentos.values()].map(eq => {
        const totalExames    = eq.meses.reduce((a, m) => a + (m.exames    ?? 0), 0);
        const totalPacientes = eq.meses.reduce((a, m) => a + (m.pacientes ?? 0), 0);
        const uptimes = eq.meses.filter(m => m.uptime != null).map(m => m.uptime);
        return {
          ...eq,
          totalExames,
          totalPacientes,
          mediaExamesDia: eq.meses.length
            ? +(eq.meses.filter(m => m.mediaExamesDia != null).reduce((a, m) => a + m.mediaExamesDia, 0) / eq.meses.filter(m => m.mediaExamesDia != null).length).toFixed(1)
            : null,
          uptimeMedio: uptimes.length ? +(uptimes.reduce((a, v) => a + v, 0) / uptimes.length).toFixed(1) : null,
        };
      });

      const totalExames    = equipamentos.reduce((a, e) => a + e.totalExames,    0);
      const totalPacientes = equipamentos.reduce((a, e) => a + e.totalPacientes, 0);
      const uptimes = equipamentos.map(e => e.uptimeMedio).filter(v => v != null);

      return {
        unidadeId:    u.unidadeId,
        nome:         u.nome,
        totalExames,
        totalPacientes,
        uptimeMedio: uptimes.length ? +(uptimes.reduce((a, v) => a + v, 0) / uptimes.length).toFixed(1) : null,
        equipamentos,
      };
    });

    const totalExames    = unidades.reduce((a, u) => a + u.totalExames,    0);
    const totalPacientes = unidades.reduce((a, u) => a + u.totalPacientes, 0);
    const uptimesGlobal  = unidades.map(u => u.uptimeMedio).filter(v => v != null);

    res.json({
      periodo: { meses, inicio: inicio.toISOString().slice(0, 7) },
      totais: {
        exames:    totalExames,
        pacientes: totalPacientes,
        uptimeMedio: uptimesGlobal.length ? +(uptimesGlobal.reduce((a, v) => a + v, 0) / uptimesGlobal.length).toFixed(1) : null,
      },
      unidades,
    });
  } catch (err) {
    console.error('[GEHC_BI_UTILIZACAO]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

