import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { descobrirEquipamentosGehc } from '../services/gehc/gehcDiscovery.js';
import { monitorarSaudeGehc, obterUltimoSnapshotGehc } from '../services/gehc/gehcMonitor.js';
import { sincronizarDadosGehc } from '../services/gehc/gehcSyncService.js';
import { capturarTokensViaPlaywright, invalidarTokensGehc } from '../services/gehc/gehcAuthService.js';

const router = express.Router();
router.use(proteger);

// ─── GET /api/gehc/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    const [total, vinculados, semVinculo, totalSnapshots, alertasAtivos, ultimosSnapshots, temToken] =
      await Promise.all([
        prisma.equipamento.count({
          where: { tenantId, fabricante: { contains: 'GE', mode: 'insensitive' }, tipo: { contains: 'RM', mode: 'insensitive' } },
        }),
        prisma.equipamento.count({
          where: { tenantId, gehcAssetId: { not: null } },
        }),
        prisma.equipamento.findMany({
          where: { tenantId, fabricante: { contains: 'GE', mode: 'insensitive' }, tipo: { contains: 'RM', mode: 'insensitive' }, gehcAssetId: null },
          select: { id: true, tag: true, apelido: true, modelo: true },
        }),
        prisma.gehcSaudeSnapshot.count({ where: { tenantId } }),
        prisma.alerta.count({ where: { tenantId, tipo: 'GEHC_SAUDE', resolvidoEm: null } }),
        prisma.gehcSaudeSnapshot.findMany({
          where: { tenantId },
          orderBy: { capturedAt: 'desc' },
          take: 10,
          include: { equipamento: { select: { tag: true, apelido: true, modelo: true } } },
        }),
        prisma.gehcToken.findUnique({ where: { tenantId }, select: { capturedAt: true, expiresAt: true } }),
      ]);

    res.json({
      rmsGe: { total, vinculadas: vinculados, semVinculo: semVinculo.length },
      rmsSeVinculo: semVinculo,
      snapshots: { total: totalSnapshots },
      alertasAtivos,
      auth: temToken
        ? { configurado: true, capturedAt: temToken.capturedAt, expiresAt: temToken.expiresAt }
        : { configurado: false },
      ultimosSnapshots: ultimosSnapshots.map(s => ({
        equipamento:       s.equipamento?.apelido || s.equipamento?.tag,
        capturedAt:        s.capturedAt,
        heliumLevelPct:    s.heliumLevelPct,
        heliumPressurePsi: s.heliumPressurePsi,
        compressorStatus:  s.compressorStatus,
        coolantTempC:      s.coolantTempC,
        magnetOnline:      s.magnetOnline,
        equipmentOnline:   s.equipmentOnline,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/auth ──────────────────────────────────────────────────────
// Força login e captura de tokens (normalmente automático)
router.post('/auth', admin, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    return res.status(503).json({ error: 'GEHC_LOGIN e GEHC_PASSWORD não configurados.' });
  }
  try {
    await capturarTokensViaPlaywright(tenantId);
    res.json({ ok: true, mensagem: 'Tokens capturados e salvos com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gehc/auth ────────────────────────────────────────────────────
// Invalida tokens (força novo login na próxima operação)
router.delete('/auth', admin, async (req, res) => {
  await invalidarTokensGehc(req.user.tenantId);
  res.json({ ok: true });
});

// ─── POST /api/gehc/discovery ─────────────────────────────────────────────────
router.post('/discovery', admin, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    return res.status(503).json({ error: 'GEHC_LOGIN e GEHC_PASSWORD não configurados.' });
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
      detalhes: {
        vinculados:   resultado.vinculados,
        semMatch:     resultado.semMatch,
        jaVinculados: resultado.jaVinculados,
      },
    });
  } catch (err) {
    console.error('[GEHC_ROUTE] Erro no discovery:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/monitor ───────────────────────────────────────────────────
router.post('/monitor', admin, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas.' });
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
  const tenantId = req.user.tenantId;
  if (!process.env.GEHC_LOGIN || !process.env.GEHC_PASSWORD) {
    return res.status(503).json({ error: 'Credenciais GE não configuradas.' });
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

// ─── GET /api/gehc/equipamento/:equipamentoId/snapshots ───────────────────────
router.get('/equipamento/:equipamentoId/snapshots', async (req, res) => {
  const tenantId       = req.user.tenantId;
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
  const tenantId       = req.user.tenantId;
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
  const tenantId       = req.user.tenantId;
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
  const tenantId       = req.user.tenantId;
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
  const tenantId       = req.user.tenantId;
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

export default router;
