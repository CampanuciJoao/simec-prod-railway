// Ficheiro: routes/ocorrenciasRoutes.js
// Versão: Multi-tenant hardened + compatível com schema relacional por tenant

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

router.use(proteger);

// ==============================
// POST CRIAR OCORRÊNCIA
// ==============================
router.post('/', async (req, res) => {
  const { equipamentoId, titulo, descricao, tipo, tecnico } = req.body;

  if (!equipamentoId || !titulo || !tipo) {
    return res.status(400).json({
      message: 'equipamentoId, titulo e tipo são obrigatórios.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
        modelo: true,
        tag: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const nova = await prisma.ocorrencia.create({
      data: {
        titulo: String(titulo).trim(),
        descricao: descricao ? String(descricao).trim() : null,
        tipo: String(tipo).trim(),
        tecnico: tecnico ? String(tecnico).trim() : null,

        tenant: {
          connect: {
            id: tenantId,
          },
        },

        equipamento: {
          connect: {
            tenantId_id: {
              tenantId,
              id: equipamentoId,
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Ocorrência',
      entidadeId: nova.id,
      detalhes: `Ocorrência "${nova.titulo}" criada para o equipamento ${equipamento.modelo} (${equipamento.tag}).`,
    });

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[OCORRENCIA_CREATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao registrar na ficha técnica.',
    });
  }
});

// ==============================
// PUT RESOLVER OCORRÊNCIA
// ==============================
router.put('/:id/resolver', async (req, res) => {
  const { id } = req.params;
  const { solucao, tecnicoResolucao } = req.body;

  if (!solucao) {
    return res.status(400).json({
      message: 'A solução é obrigatória para resolver a ocorrência.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        titulo: true,
        resolvido: true,
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({
        message: 'Ocorrência não encontrada.',
      });
    }

    if (ocorrencia.resolvido) {
      return res.status(400).json({
        message: 'Esta ocorrência já foi resolvida.',
      });
    }

    const atualizada = await prisma.ocorrencia.update({
      where: {
        id,
      },
      data: {
        resolvido: true,
        solucao: String(solucao).trim(),
        tecnicoResolucao: tecnicoResolucao
          ? String(tecnicoResolucao).trim()
          : null,
        dataResolucao: new Date(),
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Ocorrência',
      entidadeId: id,
      detalhes: `Ocorrência "${ocorrencia.titulo}" marcada como resolvida.`,
    });

    return res.json(atualizada);
  } catch (error) {
    console.error('[OCORRENCIA_RESOLVE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao registrar solução.',
    });
  }
});

// ==============================
// GET HISTÓRICO POR EQUIPAMENTO
// ==============================
router.get('/equipamento/:id', async (req, res) => {
  const equipamentoId = req.params.id;

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const lista = await prisma.ocorrencia.findMany({
      where: {
        tenantId,
        equipamentoId,
      },
      orderBy: {
        data: 'desc',
      },
    });

    return res.json(lista);
  } catch (error) {
    console.error('[OCORRENCIA_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar ficha técnica.',
    });
  }
});

export default router;