import express from 'express';
import bcrypt from 'bcryptjs';

import prisma from '../services/prismaService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

router.use(proteger);
router.use(admin);

router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const usuarios = await prisma.usuario.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nome: 'asc' },
    });

    return res.json(usuarios);
  } catch (error) {
    console.error('[USER_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar usuarios.',
    });
  }
});

router.post('/', async (req, res) => {
  const { username, email, senha, nome, role = 'user' } = req.body;

  if (!username || !email || !senha || !nome) {
    return res.status(400).json({
      message: 'Nome de usuario, e-mail, senha e nome completo sao obrigatorios.',
    });
  }

  if (senha.length < 6) {
    return res.status(400).json({
      message: 'A senha deve ter no minimo 6 caracteres.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;
    const usernameNormalizado = String(username).toLowerCase().trim();
    const emailNormalizado = String(email).toLowerCase().trim();

    const existente = await prisma.usuario.findFirst({
      where: {
        tenantId,
        OR: [
          { username: usernameNormalizado },
          { email: emailNormalizado },
        ],
      },
      select: { id: true },
    });

    if (existente) {
      return res.status(409).json({
        message: 'Ja existe um usuario com este nome de usuario ou e-mail neste tenant.',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        username: usernameNormalizado,
        email: emailNormalizado,
        senha: senhaHash,
        nome: String(nome).trim(),
        role,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIACAO',
      entidade: 'Usuario',
      entidadeId: novoUsuario.id,
      detalhes: `Usuario "${novoUsuario.nome}" criado.`,
    });

    const { senha: _senha, ...usuarioSemSenha } = novoUsuario;
    return res.status(201).json(usuarioSemSenha);
  } catch (error) {
    console.error('[USER_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este nome de usuario ou e-mail ja esta em uso.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, role, senha, email } = req.body;

  if (!nome || !role || !email) {
    return res.status(400).json({
      message: 'Nome, e-mail e funcao sao obrigatorios.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const usuario = await prisma.usuario.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario nao encontrado.',
      });
    }

    const emailNormalizado = String(email).toLowerCase().trim();
    const conflito = await prisma.usuario.findFirst({
      where: {
        tenantId,
        email: emailNormalizado,
        NOT: { id },
      },
      select: { id: true },
    });

    if (conflito) {
      return res.status(409).json({
        message: 'Este e-mail ja esta em uso neste tenant.',
      });
    }

    const dataUpdate = {
      nome: String(nome).trim(),
      email: emailNormalizado,
      role,
    };

    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({
          message: 'A senha deve ter no minimo 6 caracteres.',
        });
      }

      dataUpdate.senha = await bcrypt.hash(senha, 10);
    }

    const atualizado = await prisma.usuario.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: dataUpdate,
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDICAO',
      entidade: 'Usuario',
      entidadeId: id,
      detalhes: `Usuario "${atualizado.nome}" atualizado.`,
    });

    const { senha: _senha, ...usuarioSemSenha } = atualizado;
    return res.json(usuarioSemSenha);
  } catch (error) {
    console.error('[USER_UPDATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao atualizar usuario.',
    });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  if (req.usuario.id === id) {
    return res.status(403).json({
      message: 'Voce nao pode excluir sua propria conta.',
    });
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario nao encontrado.',
      });
    }

    await prisma.usuario.delete({
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
      acao: 'EXCLUSAO',
      entidade: 'Usuario',
      entidadeId: id,
      detalhes: `Usuario "${usuario.nome}" removido.`,
    });

    return res.json({
      message: 'Usuario excluido com sucesso.',
    });
  } catch (error) {
    console.error('[USER_DELETE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao excluir usuario.',
    });
  }
});

export default router;
