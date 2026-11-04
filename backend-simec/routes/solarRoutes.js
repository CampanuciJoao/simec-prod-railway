// Rotas da integracao Solar generica. Tenant-scoped.
//
// Admin:
//   GET    /api/solar/providers            lista adapters disponiveis (metadata do form)
//   GET    /api/solar/plants               lista plantas do tenant
//   POST   /api/solar/plants               cria/atualiza planta (upsert por id)
//   DELETE /api/solar/plants/:id           soft delete (ativo=false)
//   POST   /api/solar/plants/:id/inverters adiciona inverter na planta
//   PUT    /api/solar/inverters/:id        edita inverter (inclui trocar credencial)
//   DELETE /api/solar/inverters/:id        remove inverter
//   POST   /api/solar/validar-credencial   testa credencial sem salvar
//
// Operador/Admin (leitura):
//   GET /api/solar/plants/:id/status                snapshot mais recente agregado
//   GET /api/solar/plants/:id/historico?inicio&fim  timeseries pro grafico
//   GET /api/solar/plants/:id/quedas                lista de quedas de energia

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { encryptCredential } from '../services/solar/solarCrypto.js';
import { getAdapter, listAdapters } from '../services/solar/adapters/index.js';

const router = express.Router();
router.use(proteger);

// ─── Providers disponiveis (metadata do form na UI) ─────────────────────────
router.get('/providers', (_req, res) => {
  res.json(listAdapters());
});

// ─── Listar plantas (com inverters + baterias + snapshot mais recente) ──────
router.get('/plants', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const plants = await prisma.solarPlant.findMany({
      where: { tenantId },
      include: {
        unidade: { select: { id: true, nomeSistema: true } },
        inverters: {
          select: {
            id: true, provider: true, nome: true, inverterSn: true,
            modeloInversor: true, capacidadeKw: true, apiBase: true, ativo: true,
          },
        },
        baterias: {
          select: { id: true, sn: true, provider: true, capacidadeKwh: true, ativo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upsert planta (campos admin, sem inverters — esses tem rota propria) ───
router.post('/plants', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const {
    id, unidadeId, nome, localFisico, capacidadeKwp, tarifaKwh,
    temBateria, autonomiaHoras,
  } = req.body || {};

  if (!unidadeId || !nome) {
    return res.status(400).json({ error: 'Campos obrigatorios: unidadeId, nome' });
  }

  try {
    const unidade = await prisma.unidade.findFirst({
      where: { tenantId, id: unidadeId },
      select: { id: true },
    });
    if (!unidade) return res.status(404).json({ error: 'Unidade nao encontrada' });

    const dados = {
      tenantId, unidadeId, nome,
      localFisico: localFisico || null,
      capacidadeKwp: capacidadeKwp != null ? Number(capacidadeKwp) : null,
      tarifaKwh: tarifaKwh != null ? Number(tarifaKwh) : null,
      temBateria: !!temBateria,
      autonomiaHoras: autonomiaHoras != null ? Number(autonomiaHoras) : null,
      ativo: true,
    };

    const plant = id
      ? await prisma.solarPlant.update({ where: { id }, data: dados })
      : await prisma.solarPlant.create({ data: dados });

    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/plants/:id', admin, async (req, res) => {
  try {
    await prisma.solarPlant.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Adicionar inverter na planta ───────────────────────────────────────────
router.post('/plants/:plantId/inverters', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { plantId } = req.params;
  const { provider, nome, inverterSn, modeloInversor, capacidadeKw, credential, apiBase } = req.body || {};

  if (!provider || !inverterSn || !credential) {
    return res.status(400).json({ error: 'Campos obrigatorios: provider, inverterSn, credential' });
  }

  try {
    const plant = await prisma.solarPlant.findFirst({
      where: { id: plantId, tenantId },
      select: { id: true },
    });
    if (!plant) return res.status(404).json({ error: 'Planta nao encontrada' });

    const adapter = getAdapter(provider); // valida provider conhecido
    const finalApiBase = apiBase || adapter.defaultApiBase;

    const inverter = await prisma.solarInverter.create({
      data: {
        tenantId,
        plantId,
        provider,
        nome: nome || null,
        inverterSn,
        modeloInversor: modeloInversor || null,
        capacidadeKw: capacidadeKw != null ? Number(capacidadeKw) : null,
        credentialCrypt: encryptCredential(credential),
        apiBase: finalApiBase,
        ativo: true,
      },
      select: { id: true, provider: true, inverterSn: true, apiBase: true, ativo: true },
    });
    res.json(inverter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Editar inverter (opcionalmente troca credencial) ───────────────────────
router.put('/inverters/:id', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { nome, inverterSn, modeloInversor, capacidadeKw, credential, apiBase, ativo } = req.body || {};
  try {
    const existente = await prisma.solarInverter.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, provider: true, apiBase: true },
    });
    if (!existente) return res.status(404).json({ error: 'Inverter nao encontrado' });

    const patch = {};
    if (nome !== undefined) patch.nome = nome || null;
    if (inverterSn !== undefined) patch.inverterSn = inverterSn;
    if (modeloInversor !== undefined) patch.modeloInversor = modeloInversor || null;
    if (capacidadeKw !== undefined) patch.capacidadeKw = capacidadeKw != null ? Number(capacidadeKw) : null;
    if (apiBase !== undefined) patch.apiBase = apiBase || existente.apiBase;
    if (credential) patch.credentialCrypt = encryptCredential(credential);
    if (ativo !== undefined) patch.ativo = !!ativo;

    const inverter = await prisma.solarInverter.update({
      where: { id: req.params.id },
      data: patch,
      select: { id: true, provider: true, inverterSn: true, apiBase: true, ativo: true },
    });
    res.json(inverter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/inverters/:id', admin, async (req, res) => {
  try {
    await prisma.solarInverter.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gerenciar baterias ─────────────────────────────────────────────────────
router.post('/plants/:plantId/baterias', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const { plantId } = req.params;
  const { sn, capacidadeKwh, provider } = req.body || {};
  if (!sn || !provider) {
    return res.status(400).json({ error: 'Campos obrigatorios: sn, provider' });
  }
  try {
    const b = await prisma.solarBattery.create({
      data: {
        tenantId, plantId, sn, provider,
        capacidadeKwh: capacidadeKwh != null ? Number(capacidadeKwh) : null,
        ativo: true,
      },
      select: { id: true, sn: true, provider: true, capacidadeKwh: true, ativo: true },
    });
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/baterias/:id', admin, async (req, res) => {
  try {
    await prisma.solarBattery.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Validar credencial (teste sem salvar) ──────────────────────────────────
router.post('/validar-credencial', admin, async (req, res) => {
  const { provider, credential, apiBase } = req.body || {};
  if (!provider || !credential) {
    return res.status(400).json({ error: 'Campos obrigatorios: provider, credential' });
  }
  try {
    const adapter = getAdapter(provider);
    const r = await adapter.validarCredencial(credential, apiBase || adapter.defaultApiBase);
    if (!r.ok) return res.status(400).json({ error: r.erro || 'Credencial invalida' });
    res.json({ ok: true, devices: r.devices || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Status atual da planta (snapshot mais recente agregado) ────────────────
router.get('/plants/:id/status', async (req, res) => {
  const tenantId = req.tenantContext;
  try {
    const plant = await prisma.solarPlant.findFirst({
      where: { tenantId, id: req.params.id },
      include: {
        unidade: { select: { id: true, nomeSistema: true } },
        inverters: {
          select: { id: true, provider: true, nome: true, inverterSn: true, modeloInversor: true, capacidadeKw: true, ativo: true },
        },
        baterias: { select: { id: true, sn: true, provider: true } },
      },
    });
    if (!plant) return res.status(404).json({ error: 'Planta nao encontrada' });

    // Pega snapshot mais recente por inverter
    const ultimosPorInverter = await Promise.all(
      plant.inverters.filter((i) => i.ativo).map(async (inv) => {
        const s = await prisma.solarSnapshot.findFirst({
          where: { tenantId, inverterId: inv.id },
          orderBy: { capturedAt: 'desc' },
        });
        return { inverterId: inv.id, provider: inv.provider, snapshot: s };
      })
    );

    const quedaAtiva = await prisma.solarOutage.findFirst({
      where: { tenantId, plantId: plant.id, fimEm: null },
      orderBy: { inicioEm: 'desc' },
    });

    res.json({ plant, snapshotsPorInverter: ultimosPorInverter, quedaAtiva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Historico (timeseries agregada por planta — soma dos inverters) ────────
router.get('/plants/:id/historico', async (req, res) => {
  const tenantId = req.tenantContext;
  const { inicio, fim } = req.query;
  const dataInicio = inicio ? new Date(inicio) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dataFim    = fim    ? new Date(fim + 'T23:59:59.999Z') : new Date();

  try {
    const snapshots = await prisma.solarSnapshot.findMany({
      where: {
        tenantId, plantId: req.params.id,
        capturedAt: { gte: dataInicio, lte: dataFim },
      },
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedAt: true, inverterId: true, soc: true,
        batChargePower: true, batDischargePower: true, epsPower: true,
        gridConsumptionPower: true, feedinPower: true,
        powerKw: true, generationKwhDay: true, runningState: true,
      },
    });
    res.json({ inicio: dataInicio, fim: dataFim, snapshots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Quedas da planta ───────────────────────────────────────────────────────
router.get('/plants/:id/quedas', async (req, res) => {
  const tenantId = req.tenantContext;
  const limite = Math.min(Number(req.query.limite) || 50, 200);
  try {
    const quedas = await prisma.solarOutage.findMany({
      where: { tenantId, plantId: req.params.id },
      orderBy: { inicioEm: 'desc' },
      take: limite,
    });
    res.json(quedas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
