import express from 'express';
import jwt from 'jsonwebtoken';

import { proteger } from '../middleware/authMiddleware.js';
import { addClient } from '../services/realtime/alertasRealtimeHub.js';
import prisma from '../services/prismaService.js';
import {
  listarAlertasService,
  resumirAlertasService,
  atualizarStatusAlertaService,
  marcarTodosAlertasComoVistosService,
} from '../services/alertas/alertasService.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// SSE /stream — auth via query param porque EventSource não envia cabeçalhos.
// O token é validado identicamente ao middleware proteger; apenas o meio de
// transporte muda (query string em vez de Authorization header).
// ──────────────────────────────────────────────────────────────────────────────
router.get('/stream', async (req, res) => {
  const token = req.query.t;

  if (!token) {
    return res.status(401).end();
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  if (!decoded?.id || !decoded?.tenantId) {
    return res.status(401).end();
  }

  res.set({
    'Content-Type':    'text/event-stream',
    'Cache-Control':   'no-cache',
    Connection:        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const cleanup = addClient({
    tenantId: decoded.tenantId,
    userId:   decoded.id,
    res,
  });

  req.on('close', cleanup);
  req.on('error', cleanup);
});

// Todas as rotas abaixo exigem autenticação via Bearer token
router.use(proteger);

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

function parseValidDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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
      incluirHistorico: req.query.incluirHistorico === 'true',
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

// GET /historico — log de auditoria completo
router.get('/historico', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const page     = Math.max(1, parsePositiveInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, parsePositiveInt(req.query.pageSize, 25)));

    const dataInicio = parseValidDate(req.query.dataInicio);
    const dataFim    = parseValidDate(req.query.dataFim);

    if (req.query.dataInicio && !dataInicio) {
      return res.status(400).json({ message: 'dataInicio inválida.' });
    }
    if (req.query.dataFim && !dataFim) {
      return res.status(400).json({ message: 'dataFim inválida.' });
    }

    // Limita range a 365 dias para evitar queries excessivamente pesadas
    const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000;
    if (dataInicio && dataFim && dataFim - dataInicio > MAX_RANGE_MS) {
      return res.status(400).json({ message: 'Intervalo máximo permitido: 365 dias.' });
    }

    const where = { tenantId };

    if (req.query.tipo)       where.tipo       = req.query.tipo;
    if (req.query.prioridade) where.prioridade = req.query.prioridade;
    if (dataInicio)           where.dataAlerta = { ...where.dataAlerta, gte: dataInicio };
    if (dataFim)              where.dataAlerta = { ...where.dataAlerta, lte: dataFim };

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
        // Desempate por dataArquivado garante ordem estavel quando varios
        // alertas tem o mesmo dataAlerta (ex: pre-eventos da mesma manutencao).
        orderBy: [{ dataAlerta: 'desc' }, { dataArquivado: 'desc' }],
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

// Marca TODOS os alertas do tenant como vistos para o usuario logado.
router.post('/marcar-todos-vistos', async (req, res) => {
  try {
    const resultado = await marcarTodosAlertasComoVistosService({
      tenantId: req.usuario.tenantId,
      userId:   req.usuario.id,
    });
    if (!resultado.ok) {
      return res.status(resultado.status).json({ message: resultado.message });
    }
    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTAS_MARCAR_TODOS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao marcar alertas como vistos.' });
  }
});

// Feedback do usuário sobre uma recomendação inteligente.
// POST /:id/feedback { util: boolean, comentario?: string }
// Upsert: clicar de novo atualiza o registro do mesmo usuário no mesmo alerta.
router.post('/:id/feedback', async (req, res) => {
  try {
    const util = req.body?.util;
    const comentarioRaw = req.body?.comentario;
    if (typeof util !== 'boolean') {
      return res.status(400).json({ message: '"util" precisa ser boolean.' });
    }
    const comentario =
      typeof comentarioRaw === 'string' && comentarioRaw.trim().length > 0
        ? comentarioRaw.trim().slice(0, 2000)
        : null;

    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const alertaId = req.params.id;

    // Garante que o alerta existe no tenant (FK não bloqueia falar de tenant
    // alheio mas a checagem aqui devolve 404 amigável em vez de 500).
    const alerta = await prisma.alerta.findFirst({
      where: { tenantId, id: alertaId },
      select: { id: true },
    });
    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado.' });
    }

    const feedback = await prisma.alertaFeedback.upsert({
      where: {
        tenantId_alertaId_usuarioId: { tenantId, alertaId, usuarioId },
      },
      update: { util, comentario },
      create: { tenantId, alertaId, usuarioId, util, comentario },
    });

    return res.json({ ok: true, feedback });
  } catch (error) {
    console.error('[ALERTA_FEEDBACK_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao registrar feedback.' });
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
