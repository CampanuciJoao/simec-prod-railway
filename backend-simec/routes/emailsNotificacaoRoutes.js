// Ficheiro: routes/emailsNotificacaoRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

router.use(proteger);
router.use(admin);

// ==============================
// GET LISTAR
// ==============================
router.get('/', async (req, res) => {
  try {
    const emails = await prisma.emailNotificacao.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return res.json(emails);
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar e-mails.',
    });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', async (req, res) => {
  const {
    email,
    nome,
    diasAntecedencia,
    recebeAlertasContrato,
    recebeAlertasManutencao,
    recebeAlertasSeguro,
  } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      message: 'O campo e-mail é obrigatório.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const emailNormalizado = email.trim().toLowerCase();

    const existente = await prisma.emailNotificacao.findFirst({
      where: {
        tenantId,
        email: emailNormalizado,
      },
      select: { id: true },
    });

    if (existente) {
      return res.status(409).json({
        message: 'Este e-mail já está cadastrado.',
      });
    }

    const novoEmail = await prisma.emailNotificacao.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        email: emailNormalizado,
        nome,
        diasAntecedencia: Number.parseInt(diasAntecedencia, 10) || 30,
        recebeAlertasContrato: !!recebeAlertasContrato,
        recebeAlertasManutencao: !!recebeAlertasManutencao,
        recebeAlertasSeguro: !!recebeAlertasSeguro,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'EmailNotificacao',
      entidadeId: novoEmail.id,
      detalhes: `E-mail "${novoEmail.email}" adicionado.`,
    });

    return res.status(201).json(novoEmail);
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este e-mail já está cadastrado.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao adicionar e-mail.',
    });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  const {
    nome,
    diasAntecedencia,
    recebeAlertasContrato,
    recebeAlertasManutencao,
    recebeAlertasSeguro,
  } = req.body;

  const tenantId = req.usuario.tenantId;

  try {
    const emailExistente = await prisma.emailNotificacao.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!emailExistente) {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    const emailAtualizado = await prisma.emailNotificacao.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        nome,
        diasAntecedencia: Number.parseInt(diasAntecedencia, 10) || 30,
        recebeAlertasContrato: !!recebeAlertasContrato,
        recebeAlertasManutencao: !!recebeAlertasManutencao,
        recebeAlertasSeguro: !!recebeAlertasSeguro,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'EmailNotificacao',
      entidadeId: id,
      detalhes: `E-mail "${emailAtualizado.email}" atualizado.`,
    });

    return res.json(emailAtualizado);
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_UPDATE_ERROR]', error);

    return res.status(500).json({
      message: 'Erro ao atualizar e-mail.',
    });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const emailExistente = await prisma.emailNotificacao.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!emailExistente) {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    await prisma.emailNotificacao.delete({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'EmailNotificacao',
      entidadeId: id,
      detalhes: `E-mail "${emailExistente.email}" removido.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_DELETE_ERROR]', error);

    return res.status(500).json({
      message: 'Erro ao remover e-mail.',
    });
  }
});

export default router;