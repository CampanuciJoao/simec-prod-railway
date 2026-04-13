// Ficheiro: routes/userRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import bcrypt from 'bcryptjs';
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
    const tenantId = req.usuario.tenantId;

    const usuarios = await prisma.usuario.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        username: true,
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
      message: 'Erro ao buscar usuários.',
    });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', async (req, res) => {
  const { username, senha, nome, role = 'user' } = req.body;

  if (!username || !senha || !nome) {
    return res.status(400).json({
      message: 'Nome de usuário, senha e nome completo são obrigatórios.',
    });
  }

  if (senha.length < 6) {
    return res.status(400).json({
      message: 'A senha deve ter no mínimo 6 caracteres.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;
    const usernameNormalizado = String(username).toLowerCase().trim();

    const existente = await prisma.usuario.findFirst({
      where: {
        tenantId,
        username: usernameNormalizado,
      },
      select: { id: true },
    });

    if (existente) {
      return res.status(409).json({
        message: 'Este nome de usuário já está em uso neste tenant.',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        username: usernameNormalizado,
        senha: senhaHash,
        nome: String(nome).trim(),
        role,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Usuário',
      entidadeId: novoUsuario.id,
      detalhes: `Usuário "${novoUsuario.nome}" criado.`,
    });

    const { senha: _senha, ...usuarioSemSenha } = novoUsuario;

    return res.status(201).json(usuarioSemSenha);
  } catch (error) {
    console.error('[USER_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este nome de usuário já está em uso.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, role, senha } = req.body;

  if (!nome || !role) {
    return res.status(400).json({
      message: 'Nome e função são obrigatórios.',
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
        message: 'Usuário não encontrado.',
      });
    }

    const dataUpdate = {
      nome: String(nome).trim(),
      role,
    };

    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({
          message: 'A senha deve ter no mínimo 6 caracteres.',
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
      acao: 'EDIÇÃO',
      entidade: 'Usuário',
      entidadeId: id,
      detalhes: `Usuário "${atualizado.nome}" atualizado.`,
    });

    const { senha: _senha, ...usuarioSemSenha } = atualizado;

    return res.json(usuarioSemSenha);
  } catch (error) {
    console.error('[USER_UPDATE_ERROR]', error);

    return res.status(500).json({
      message: 'Erro ao atualizar usuário.',
    });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  if (req.usuario.id === id) {
    return res.status(403).json({
      message: 'Você não pode excluir sua própria conta.',
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
        message: 'Usuário não encontrado.',
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
      acao: 'EXCLUSÃO',
      entidade: 'Usuário',
      entidadeId: id,
      detalhes: `Usuário "${usuario.nome}" removido.`,
    });

    return res.json({
      message: 'Usuário excluído com sucesso.',
    });
  } catch (error) {
    console.error('[USER_DELETE_ERROR]', error);

    return res.status(500).json({
      message: 'Erro ao excluir usuário.',
    });
  }
});

export default router;