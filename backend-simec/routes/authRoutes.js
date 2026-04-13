// Ficheiro: routes/authRoutes.js
// Versão: Multi-tenant ready
// Descrição: Autentica usuário, inclui tenantId no JWT e devolve contexto do tenant.

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';

const router = express.Router();

/**
 * ROTA: POST /api/auth/login
 * FINALIDADE: Autenticar um usuário e retornar um token JWT com contexto de tenant.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, senha } = req.body;

    if (!username || !senha) {
      return res.status(400).json({
        message: 'Nome de usuário e senha são obrigatórios.',
      });
    }

    const usernameNormalizado = username.toLowerCase().trim();

    console.log(
      `[AUTH] Tentativa de login para o usuário: '${usernameNormalizado}'`
    );

    // Multi-tenant:
    // Nesta fase de transição, ainda estamos buscando por username.
    // Quando você evoluir para login com tenant explícito (slug/subdomínio),
    // este trecho poderá filtrar também por tenant.
    const usuario = await prisma.usuario.findFirst({
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
            ativo: true,
          },
        },
      },
    });

    if (!usuario) {
      console.log(
        `[AUTH] Falha: Usuário '${usernameNormalizado}' não encontrado no banco de dados.`
      );
      return res.status(401).json({
        message: 'Credenciais inválidas.',
      });
    }

    if (!usuario.tenantId || !usuario.tenant) {
      console.log(
        `[AUTH] Falha: Usuário '${usernameNormalizado}' está sem tenant vinculado.`
      );
      return res.status(403).json({
        message: 'Usuário sem tenant vinculado. Verifique a configuração do sistema.',
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

    return res.json({
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