// Ficheiro: routes/authRoutes.js
// Versão: Multi-tenant hardened
// Descrição: Autentica usuário, inclui tenantId no JWT e devolve contexto do tenant.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica um usuário e retorna token JWT com contexto de tenant.
 *
 * OBS:
 * Nesta fase, o login ainda busca apenas por username.
 * Isso funciona enquanto usernames forem efetivamente únicos na prática.
 * No modelo multi-tenant ideal, o login deve incluir também o tenant
 * (slug, subdomínio ou outro identificador).
 */
router.post('/login', async (req, res) => {
  try {
    const { username, senha } = req.body;

    if (!username || !senha) {
      return res.status(400).json({
        message: 'Nome de usuário e senha são obrigatórios.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH_LOGIN_ERROR] JWT_SECRET não configurado.');
      return res.status(500).json({
        message: 'Erro de configuração do servidor.',
      });
    }

    const usernameNormalizado = String(username).toLowerCase().trim();

    console.log(
      `[AUTH] Tentativa de login para o usuário: '${usernameNormalizado}'`
    );

    const usuariosEncontrados = await prisma.usuario.findMany({
      where: {
        username: usernameNormalizado,
      },
      include: {
        tenant: {
          select: {
            id: true,
            nome: true,
            slug: true,
            timezone: true,
            locale: true,
            ativo: true,
          },
        },
      },
      take: 2,
    });

    if (!usuariosEncontrados.length) {
      console.log(
        `[AUTH] Falha: Usuário '${usernameNormalizado}' não encontrado no banco de dados.`
      );
      return res.status(401).json({
        message: 'Credenciais inválidas.',
      });
    }

    if (usuariosEncontrados.length > 1) {
      console.error(
        `[AUTH] Ambiguidade de login: username '${usernameNormalizado}' existe em múltiplos tenants.`
      );
      return res.status(409).json({
        message:
          'Existem múltiplos usuários com esse login em empresas diferentes. O login precisa ser ajustado para considerar a empresa.',
      });
    }

    const usuario = usuariosEncontrados[0];

    if (!usuario.tenantId || !usuario.tenant) {
      console.log(
        `[AUTH] Falha: Usuário '${usernameNormalizado}' está sem tenant vinculado.`
      );
      return res.status(403).json({
        message:
          'Usuário sem tenant vinculado. Verifique a configuração do sistema.',
      });
    }

    if (!usuario.tenant.ativo) {
      console.log(
        `[AUTH] Falha: Tenant '${usuario.tenant.slug}' está inativo.`
      );
      return res.status(403).json({
        message: 'A empresa vinculada a este usuário está inativa.',
      });
    }

    console.log('[AUTH] Usuário encontrado. Comparando senhas...');
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      console.log('[AUTH] Falha: A comparação de senhas falhou.');
      return res.status(401).json({
        message: 'Credenciais inválidas.',
      });
    }

    console.log('[AUTH] Sucesso: Senha correta. Gerando token JWT...');

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      role: usuario.role,
      tenantId: usuario.tenantId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });

    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        username: usuario.username,
        role: usuario.role,
        tenantId: usuario.tenantId,
      },
      tenant: {
        id: usuario.tenant.id,
        nome: usuario.tenant.nome,
        slug: usuario.tenant.slug,
        timezone: usuario.tenant.timezone,
        locale: usuario.tenant.locale,
      },
    });
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

export default router;