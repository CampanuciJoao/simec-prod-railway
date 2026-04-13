// Ficheiro: routes/auditoriaRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import prisma from '../services/prismaService.js';
import { admin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/auditoria
 * @desc    Lista logs de auditoria com filtros e paginação do lado do servidor.
 * @access  Admin
 */
router.get('/', admin, async (req, res) => {
  const {
    autorId,
    acao,
    entidade,
    entidadeId,
    dataInicio,
    dataFim,
    page = 1,
    limit = 50,
  } = req.query;

  const tenantId = req.usuario.tenantId;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause = {
      tenantId,
    };

    if (autorId) whereClause.autorId = autorId;
    if (acao) whereClause.acao = acao;
    if (entidade) whereClause.entidade = entidade;
    if (entidadeId) whereClause.entidadeId = entidadeId;

    if (dataInicio || dataFim) {
      whereClause.timestamp = {};

      if (dataInicio) {
        whereClause.timestamp.gte = new Date(dataInicio);
      }

      if (dataFim) {
        const fimDoDia = new Date(dataFim);
        fimDoDia.setHours(23, 59, 59, 999);
        whereClause.timestamp.lte = fimDoDia;
      }
    }

    const [logs, totalLogs] = await prisma.$transaction([
      prisma.logAuditoria.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        include: {
          autor: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      }),
      prisma.logAuditoria.count({
        where: whereClause,
      }),
    ]);

    return res.json({
      logs,
      pagination: {
        total: totalLogs,
        page: pageNum,
        limit: limitNum,
        hasNextPage: skip + logs.length < totalLogs,
      },
    });
  } catch (error) {
    console.error('[AUDITORIA_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor ao buscar logs.',
    });
  }
});

/**
 * @route   GET /api/auditoria/filtros
 * @desc    Obtém listas de valores únicos para popular os menus de filtro no frontend.
 * @access  Admin
 */
router.get('/filtros', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;

  try {
    const [usuarios, acoesDistintas, entidadesDistintas] = await Promise.all([
      prisma.usuario.findMany({
        where: {
          tenantId,
        },
        select: {
          id: true,
          nome: true,
        },
        orderBy: {
          nome: 'asc',
        },
      }),

      prisma.logAuditoria.findMany({
        where: {
          tenantId,
        },
        select: {
          acao: true,
        },
        distinct: ['acao'],
      }),

      prisma.logAuditoria.findMany({
        where: {
          tenantId,
        },
        select: {
          entidade: true,
        },
        distinct: ['entidade'],
      }),
    ]);

    const acoes = acoesDistintas
      .map((item) => item.acao)
      .filter(Boolean)
      .sort();

    const entidades = entidadesDistintas
      .map((item) => item.entidade)
      .filter(Boolean)
      .sort();

    return res.json({
      usuarios,
      acoes,
      entidades,
    });
  } catch (error) {
    console.error('[AUDITORIA_FILTROS_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar dados para filtros.',
    });
  }
});

export default router;