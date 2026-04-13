// Ficheiro: routes/userRoutes.js
// Versão: Multi-tenant ready
// Descrição: CRUD de usuários com isolamento por tenant

import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prismaService.js';
import { admin } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

// Todas as rotas aqui exigem usuário autenticado + admin.
// No seu server.js, o app.use(proteger) já acontece antes de /api/users.
// Aqui mantemos o admin para restringir acesso.
router.use(admin);

// ROTA: GET /api/users - Listar todos os usuários do tenant atual
router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        tenantId: req.usuario.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        username: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(usuarios);
  } catch (error) {
    console.error('[USER_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar usuários.',
      error: error.message,
    });
  }
});

// ROTA: POST /api/users - Criar um novo usuário no mesmo tenant do admin logado
router.post('/', async (req, res) => {
  const { username, senha, nome, role = 'user' } = req.body;

  if (!username || !senha || !nome) {
    return res.status(400).json({
      message: 'Nome de usuário, senha e nome completo são obrigatórios.',
    });
  }

  try {
    const usernameNormalizado = username.toLowerCase().trim();

    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        tenantId: req.usuario.tenantId,
        username: usernameNormalizado,
      },
      select: { id: true },
    });

    if (usuarioExistente) {
      return res.status(409).json({
        message: 'Este nome de usuário já está em uso neste tenant.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);

    const novoUsuario = await prisma.usuario.create({
      data: {
        tenantId: req.usuario.tenantId,
        username: usernameNormalizado,
        senha: senhaCriptografada,
        nome,
        role,
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Usuário',
      entidadeId: novoUsuario.id,
      detalhes: `Usuário "${novoUsuario.nome}" (login: ${novoUsuario.username}, role: ${novoUsuario.role}) foi criado.`,
    });

    const { senha: _senha, ...usuarioCriado } = novoUsuario;

    return res.status(201).json(usuarioCriado);
  } catch (error) {
    console.error('[USER_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este nome de usuário já está em uso.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor.',
      error: error.message,
    });
  }
});

// ROTA: PUT /api/users/:id - Atualiza um usuário do mesmo tenant
router.put('/:id', async (req, res) => {
  const { id: userIdToUpdate } = req.params;
  const { nome, role, senha: novaSenha } = req.body;

  if (!nome || !role) {
    return res.status(400).json({
      message: 'Nome e Função (role) são obrigatórios.',
    });
  }

  try {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: userIdToUpdate,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!usuarioExistente) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    const dadosParaAtualizar = {
      nome,
      role,
    };

    if (novaSenha) {
      if (novaSenha.length < 6) {
        return res.status(400).json({
          message: 'A nova senha deve ter no mínimo 6 caracteres.',
        });
      }

      const salt = await bcrypt.genSalt(10);
      dadosParaAtualizar.senha = await bcrypt.hash(novaSenha, salt);
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: userIdToUpdate },
      data: dadosParaAtualizar,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Usuário',
      entidadeId: userIdToUpdate,
      detalhes:
        `Dados do usuário "${usuarioAtualizado.nome}" foram atualizados.` +
        (novaSenha ? ' A senha também foi alterada.' : ''),
    });

    const { senha: _senha, ...usuarioSemSenha } = usuarioAtualizado;

    return res.json(usuarioSemSenha);
  } catch (error) {
    console.error('[USER_UPDATE_ERROR]', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor ao atualizar usuário.',
      error: error.message,
    });
  }
});

// ROTA: DELETE /api/users/:id - Excluir um usuário do mesmo tenant
router.delete('/:id', async (req, res) => {
  const { id: userIdToDelete } = req.params;

  if (req.usuario.id === userIdToDelete) {
    return res.status(403).json({
      message: 'Ação não permitida. Você não pode excluir sua própria conta.',
    });
  }

  try {
    const usuarioParaExcluir = await prisma.usuario.findFirst({
      where: {
        id: userIdToDelete,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!usuarioParaExcluir) {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    await prisma.usuario.delete({
      where: { id: userIdToDelete },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Usuário',
      entidadeId: userIdToDelete,
      detalhes: `O usuário "${usuarioParaExcluir.nome}" (login: ${usuarioParaExcluir.username}) foi excluído.`,
    });

    return res.status(200).json({
      message: 'Usuário excluído com sucesso.',
    });
  } catch (error) {
    console.error('[USER_DELETE_ERROR]', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Usuário não encontrado.',
      });
    }

    return res.status(500).json({
      message: 'Erro interno do servidor.',
      error: error.message,
    });
  }
});

export default router;