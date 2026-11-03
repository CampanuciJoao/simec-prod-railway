// Rotas da integracao FoxESS. Todas tenant-scoped via req.tenantContext.
//
// Admin:
//   POST   /api/foxess/sites         cria/atualiza site por unidade
//   DELETE /api/foxess/sites/:id     desativa site (soft — ativo=false)
//   GET    /api/foxess/sites         lista sites do tenant
//
// Operador/Admin (leitura):
//   GET /api/foxess/sites/:id/status            snapshot mais recente
//   GET /api/foxess/sites/:id/historico?inicio&fim   timeseries agregada
//   GET /api/foxess/sites/:id/quedas             lista de quedas de energia
//   GET /api/foxess/unidade/:unidadeId/status    atalho pela unidade

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { encryptApiKey } from '../services/foxess/foxessCrypto.js';
import { listDevices } from '../services/foxess/foxessClient.js';

const router = express.Router();
router.use(proteger);

// ─── Admin: criar/atualizar site FoxESS ──────────────────────────────────────
router.post('/sites', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const {
    unidadeId,
    nome,
    apiKey,
    apiBase,
    inverterSn,
    bateriaSns,
    modeloInversor,
    capacidadeKwh,
    autonomiaHoras,
  } = req.body || {};

  if (!unidadeId || !nome || !apiKey || !inverterSn) {
    return res.status(400).json({
      error: 'Campos obrigatorios: unidadeId, nome, apiKey, inverterSn',
    });
  }

  try {
    const unidade = await prisma.unidade.findFirst({
      where: { tenantId, id: unidadeId },
      select: { id: true },
    });
    if (!unidade) {
      return res.status(404).json({ error: 'Unidade nao encontrada' });
    }

    const site = await prisma.foxessSite.upsert({
      where: { tenantId_unidadeId: { tenantId, unidadeId } },
      create: {
        tenantId,
        unidadeId,
        nome,
        apiKeyCrypt: encryptApiKey(apiKey),
        apiBase: apiBase || 'https://www.foxesscloud.com',
        inverterSn,
        bateriaSns: Array.isArray(bateriaSns) ? bateriaSns : [],
        modeloInversor: modeloInversor || null,
        capacidadeKwh: capacidadeKwh ?? null,
        autonomiaHoras: autonomiaHoras ?? null,
        ativo: true,
      },
      update: {
        nome,
        apiKeyCrypt: encryptApiKey(apiKey),
        apiBase: apiBase || 'https://www.foxesscloud.com',
        inverterSn,
        bateriaSns: Array.isArray(bateriaSns) ? bateriaSns : [],
        modeloInversor: modeloInversor || null,
        capacidadeKwh: capacidadeKwh ?? null,
        autonomiaHoras: autonomiaHoras ?? null,
        ativo: true,
      },
      select: { id: true, nome: true, unidadeId: true, inverterSn: true, bateriaSns: true, ativo: true },
    });

    res.json({ ok: true, site });
  } catch (err) {
    console.error('[FOXESS_ROUTE] POST /sites:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: listar sites ─────────────────────────────────────────────────────
router.get('/sites', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const sites = await prisma.foxessSite.findMany({
      where: { tenantId },
      select: {
        id: true, nome: true, unidadeId: true, inverterSn: true, bateriaSns: true,
        apiBase: true, modeloInversor: true, capacidadeKwh: true, autonomiaHoras: true,
        ativo: true, createdAt: true, updatedAt: true,
        unidade: { select: { nomeSistema: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: desativar site ───────────────────────────────────────────────────
router.delete('/sites/:id', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    await prisma.foxessSite.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: validar credencial (teste rapido sem salvar) ─────────────────────
router.post('/sites/validar', admin, async (req, res) => {
  const { apiKey, apiBase } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'apiKey obrigatorio' });

  try {
    const devices = await listDevices({
      apiBase: apiBase || 'https://www.foxesscloud.com',
      apiKey,
      currentPage: 1,
      pageSize: 50,
    });
    res.json({ ok: true, devices });
  } catch (err) {
    res.status(400).json({ error: `Credencial invalida ou API indisponivel: ${err.message}` });
  }
});

// ─── Status atual do site (snapshot mais recente) ────────────────────────────
router.get('/sites/:id/status', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const site = await prisma.foxessSite.findFirst({
      where: { tenantId, id: req.params.id },
      select: {
        id: true, nome: true, inverterSn: true, bateriaSns: true,
        modeloInversor: true, capacidadeKwh: true, autonomiaHoras: true,
        unidade: { select: { id: true, nomeSistema: true } },
      },
    });
    if (!site) return res.status(404).json({ error: 'Site nao encontrado' });

    const ultimoSnapshot = await prisma.foxessSnapshot.findFirst({
      where: { tenantId, siteId: site.id },
      orderBy: { capturedAt: 'desc' },
      select: {
        capturedAt: true, soc: true, batChargePower: true, batDischargePower: true,
        feedinPower: true, gridConsumptionPower: true, epsPower: true,
        runningState: true, currentFault: true, bateriasJson: true,
      },
    });

    const quedaAtiva = await prisma.foxessQueda.findFirst({
      where: { tenantId, siteId: site.id, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    res.json({ site, snapshot: ultimoSnapshot, quedaAtiva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Atalho pela unidade ─────────────────────────────────────────────────────
// Devolve { siteId } pro frontend chamar /sites/:id/status em sequencia.
// Mais simples que redirecionar internamente no Express.
router.get('/unidade/:unidadeId/site', async (req, res) => {
  const tenantId = req.tenantContext;
  const site = await prisma.foxessSite.findFirst({
    where: { tenantId, unidadeId: req.params.unidadeId, ativo: true },
    select: { id: true, nome: true, modeloInversor: true, capacidadeKwh: true, autonomiaHoras: true },
  });
  if (!site) return res.status(404).json({ error: 'Unidade sem FoxESS cadastrado' });
  res.json(site);
});

// ─── Historico (timeseries pra graficos) ────────────────────────────────────
router.get('/sites/:id/historico', async (req, res) => {
  const tenantId = req.tenantContext;
  const { inicio, fim } = req.query;

  const dataInicio = inicio ? new Date(inicio) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dataFim    = fim    ? new Date(fim + 'T23:59:59.999Z') : new Date();

  try {
    const snapshots = await prisma.foxessSnapshot.findMany({
      where: {
        tenantId, siteId: req.params.id,
        capturedAt: { gte: dataInicio, lte: dataFim },
      },
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedAt: true, soc: true, batChargePower: true, batDischargePower: true,
        gridConsumptionPower: true, epsPower: true, runningState: true,
      },
    });

    res.json({ inicio: dataInicio, fim: dataFim, snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lista de quedas (eventos de power outage) ───────────────────────────────
router.get('/sites/:id/quedas', async (req, res) => {
  const tenantId = req.tenantContext;
  const limite = Math.min(Number(req.query.limite) || 50, 200);

  try {
    const quedas = await prisma.foxessQueda.findMany({
      where: { tenantId, siteId: req.params.id },
      orderBy: { inicioEm: 'desc' },
      take: limite,
    });
    res.json(quedas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
