// Ficheiro: routes/emailsNotificacaoRoutes.js
// Versão: Multi-tenant ready
// Descrição: CRUD de e-mails de notificação com isolamento por tenant

import express from 'express';
import prisma from '../services/prismaService.js';
import { admin } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

// Todas as rotas exigem admin.
// No server.js a proteção geral já acontece antes, então aqui reforçamos a permissão.
router.use(admin);

// GET /api/emails-notificacao - Lista todos os e-mails do tenant atual
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

// POST /api/emails-notificacao - Adiciona um novo e-mail no tenant atual
router.post('/', async (req, res) => {
  const {
    email,
    nome,
    diasAntecedencia,
    recebeAlertasContrato,
    recebeAlertasManutencao,
    recebeAlertasSeguro,
  } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'O campo e-mail é obrigatório.',
    });
  }

  try {
    const emailNormalizado = String(email).trim().toLowerCase();

    const existente = await prisma.emailNotificacao.findFirst({
      where: {
        tenantId: req.usuario.tenantId,
        email: emailNormalizado,
      },
      select: {
        id: true,
      },
    });

    if (existente) {
      return res.status(409).json({
        message: 'Este e-mail já está cadastrado.',
      });
    }

    const novoEmail = await prisma.emailNotificacao.create({
      data: {
        tenantId: req.usuario.tenantId,
        email: emailNormalizado,
        nome,
        diasAntecedencia: parseInt(diasAntecedencia, 10) || 30,
        recebeAlertasContrato: !!recebeAlertasContrato,
        recebeAlertasManutencao: !!recebeAlertasManutencao,
        recebeAlertasSeguro: !!recebeAlertasSeguro,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'EmailNotificacao',
      entidadeId: novoEmail.id,
      detalhes: `E-mail "${novoEmail.email}" adicionado à lista de notificações.`,
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

// PUT /api/emails-notificacao/:id - Atualiza um e-mail do tenant atual
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    diasAntecedencia,
    recebeAlertasContrato,
    recebeAlertasManutencao,
    recebeAlertasSeguro,
  } = req.body;

  try {
    const emailExistente = await prisma.emailNotificacao.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!emailExistente) {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    const emailAtualizado = await prisma.emailNotificacao.update({
      where: { id },
      data: {
        nome,
        diasAntecedencia: parseInt(diasAntecedencia, 10) || 30,
        recebeAlertasContrato: !!recebeAlertasContrato,
        recebeAlertasManutencao: !!recebeAlertasManutencao,
        recebeAlertasSeguro: !!recebeAlertasSeguro,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'EmailNotificacao',
      entidadeId: id,
      detalhes: `Configurações do e-mail "${emailAtualizado.email}" foram atualizadas.`,
    });

    return res.json(emailAtualizado);
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_UPDATE_ERROR]', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao atualizar e-mail.',
    });
  }
});

// DELETE /api/emails-notificacao/:id - Remove um e-mail do tenant atual
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const emailExistente = await prisma.emailNotificacao.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!emailExistente) {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    const emailExcluido = await prisma.emailNotificacao.delete({
      where: { id },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'EmailNotificacao',
      entidadeId: emailExcluido.id,
      detalhes: `E-mail "${emailExcluido.email}" foi removido.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[EMAIL_NOTIFICACAO_DELETE_ERROR]', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'E-mail não encontrado.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao remover e-mail.',
    });
  }
});

export default router;