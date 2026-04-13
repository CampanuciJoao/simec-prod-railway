// Ficheiro: routes/ocorrenciasRoutes.js
// Versão: Multi-tenant ready

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();
router.use(proteger);

// Salvar nova ocorrência na Ficha Técnica
router.post('/', async (req, res) => {
  const { equipamentoId, titulo, descricao, tipo, tecnico } = req.body;

  if (!equipamentoId || !titulo || !tipo) {
    return res.status(400).json({
      message: 'equipamentoId, titulo e tipo são obrigatórios.',
    });
  }

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId: req.usuario.tenantId,
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
        tenantId: req.usuario.tenantId,
        equipamentoId,
        titulo,
        descricao,
        tipo,
        tecnico,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Ocorrência',
      entidadeId: nova.id,
      detalhes: `Ocorrência "${titulo}" criada para o equipamento ${equipamento.modelo} (${equipamento.tag}).`,
    });

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[OCORRENCIA_CREATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao registrar na ficha técnica.',
    });
  }
});

// Marcar ocorrência como resolvida
router.put('/:id/resolver', async (req, res) => {
  const { id } = req.params;
  const { solucao, tecnicoResolucao } = req.body;

  try {
    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
      select: {
        id: true,
        titulo: true,
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({
        message: 'Ocorrência não encontrada.',
      });
    }

    const atualizada = await prisma.ocorrencia.update({
      where: { id },
      data: {
        resolvido: true,
        solucao,
        tecnicoResolucao,
        dataResolucao: new Date(),
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
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

// Listar histórico da ficha técnica de um equipamento específico
router.get('/equipamento/:id', async (req, res) => {
  const equipamentoId = req.params.id;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId: req.usuario.tenantId,
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
        tenantId: req.usuario.tenantId,
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