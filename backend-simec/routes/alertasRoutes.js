import express from 'express';

import { proteger } from '../middleware/authMiddleware.js';
import prisma from '../services/prismaService.js';
import {
  listarAlertasService,
  resumirAlertasService,
  atualizarStatusAlertaService,
} from '../services/alertas/alertasService.js';

const router = express.Router();
router.use(proteger);

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

router.get('/', async (req, res) => {
  try {
    const page     = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(100, parsePositiveInt(req.query.pageSize, 25));

    const filtros = {
      status:     req.query.status     || '',
      tipo:       req.query.tipo       || '',
      prioridade: req.query.prioridade || '',
      search:     req.query.search     || '',
    };

    const resultado = await listarAlertasService({
      tenantId: req.usuario.tenantId,
      userId:   req.usuario.id,
      page,
      pageSize,
      filtros,
    });

    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar alertas.' });
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const resultado = await resumirAlertasService({
      tenantId: req.usuario.tenantId,
      userId:   req.usuario.id,
    });
    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_RESUMO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar resumo de alertas.' });
  }
});

// ==============================
// GET /historico — log de auditoria (alertas arquivados)
// IBM Maximo: rastreabilidade completa de todos os alertas gerados
// ==============================
router.get('/historico', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 25));

    const where = { tenantId };

    if (req.query.tipo)       where.tipo       = req.query.tipo;
    if (req.query.prioridade) where.prioridade = req.query.prioridade;
    if (req.query.dataInicio) where.dataAlerta = { ...where.dataAlerta, gte: new Date(req.query.dataInicio) };
    if (req.query.dataFim)    where.dataAlerta = { ...where.dataAlerta, lte: new Date(req.query.dataFim) };

    if (req.query.search) {
      where.OR = [
        { titulo:    { contains: req.query.search, mode: 'insensitive' } },
        { subtitulo: { contains: req.query.search, mode: 'insensitive' } },
        { numeroOS:  { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.alertaHistorico.findMany({
        where,
        orderBy: { dataAlerta: 'desc' },
        skip:  (page - 1) * pageSize,
        take:  pageSize,
      }),
      prisma.alertaHistorico.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error('[ALERTA_HISTORICO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar histórico de alertas.' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const resultado = await atualizarStatusAlertaService({
      tenantId: req.usuario.tenantId,
      userId:   req.usuario.id,
      alertaId: req.params.id,
      status:   req.body?.status,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({ message: resultado.message });
    }
    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar alerta.' });
  }
});

export default router;
