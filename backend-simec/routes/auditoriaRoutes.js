// Ficheiro: routes/auditoriaRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);
router.use(admin);

/**
 * @route   GET /api/auditoria
 * @desc    Lista logs de auditoria com filtros e paginação do lado do servidor.
 * @access  Admin
 */
router.get('/', async (req, res) => {
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

  const pageNum = Number.parseInt(page, 10);
  const limitNum = Number.parseInt(limit, 10);

  const pageSafe = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  const limitSafe =
    Number.isNaN(limitNum) || limitNum < 1
      ? 50
      : Math.min(limitNum, 200);

  const skip = (pageSafe - 1) * limitSafe;

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
        const inicio = new Date(dataInicio);
        if (Number.isNaN(inicio.getTime())) {
          return res.status(400).json({
            message: 'dataInicio inválida.',
          });
        }
        whereClause.timestamp.gte = inicio;
      }

      if (dataFim) {
        const fim = new Date(dataFim);
        if (Number.isNaN(fim.getTime())) {
          return res.status(400).json({
            message: 'dataFim inválida.',
          });
        }

        fim.setHours(23, 59, 59, 999);
        whereClause.timestamp.lte = fim;
      }
    }

    const [logs, totalLogs] = await prisma.$transaction([
      prisma.logAuditoria.findMany({
        where: whereClause,
        skip,
        take: limitSafe,
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
        page: pageSafe,
        limit: limitSafe,
        totalPages: Math.ceil(totalLogs / limitSafe),
        hasNextPage: skip + logs.length < totalLogs,
        hasPreviousPage: pageSafe > 1,
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
router.get('/filtros', async (req, res) => {
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