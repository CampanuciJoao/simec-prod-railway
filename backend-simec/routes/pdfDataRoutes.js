// Ficheiro: routes/pdfDataRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);

/**
 * GET /api/pdf-data/manutencao/:id
 * Retorna os dados completos de uma OS para gerar PDF no frontend
 */
router.get('/manutencao/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.usuario.tenantId;

    if (!id) {
      return res.status(400).json({
        message: 'O id da manutenção é obrigatório.',
      });
    }

    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        equipamento: {
          include: {
            unidade: true,
          },
        },
        notasAndamento: {
          where: {
            tenantId,
          },
          include: {
            autor: {
              select: { nome: true },
            },
          },
          orderBy: { data: 'asc' },
        },
      },
    });

    if (!manutencao) {
      return res.status(404).json({
        message: 'Manutenção não encontrada.',
      });
    }

    return res.json(manutencao);
  } catch (error) {
    console.error('[PDF_DATA_OS_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar dados da OS.',
    });
  }
});

/**
 * POST /api/pdf-data/relatorio
 * Retorna os dados de um relatório para gerar PDF no frontend
 */
router.post('/relatorio', async (req, res) => {
  try {
    const { ids } = req.body;
    const tenantId = req.usuario.tenantId;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        message: 'É necessário informar uma lista de IDs para gerar o relatório.',
      });
    }

    const idsValidos = ids.filter(Boolean);

    if (idsValidos.length === 0) {
      return res.status(400).json({
        message: 'Nenhum ID válido foi informado para gerar o relatório.',
      });
    }

    const manutencoes = await prisma.manutencao.findMany({
      where: {
        tenantId,
        id: { in: idsValidos },
      },
      select: {
        id: true,
        numeroOS: true,
        tipo: true,
        status: true,
        dataHoraAgendamentoInicio: true,
        dataHoraAgendamentoFim: true,
        dataConclusao: true,
        tecnicoResponsavel: true,
        descricaoProblemaServico: true,
        numeroChamado: true,
        equipamento: {
          select: {
            modelo: true,
            tag: true,
            unidade: {
              select: {
                nomeSistema: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataConclusao: 'desc',
      },
    });

    return res.json({
      tipoRelatorio: 'manutencoesRealizadas',
      total: manutencoes.length,
      ids: idsValidos,
      dados: manutencoes,
    });
  } catch (error) {
    console.error('[PDF_DATA_RELATORIO_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar dados do relatório.',
    });
  }
});

export default router;