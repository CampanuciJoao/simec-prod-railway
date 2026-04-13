// Ficheiro: middleware/authMiddleware.js
// Versão: Multi-tenant hardened
// Descrição: Middleware de autenticação com suporte a tenant e validações reforçadas.

import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';

/**
 * Middleware para proteger rotas.
 * - Valida o token JWT
 * - Busca o usuário no banco
 * - Carrega o tenant vinculado
 * - Bloqueia tenants inativos
 * - Injeta o contexto autenticado em req.usuario e req.auth
 */
export const proteger = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Não autorizado. Nenhum token foi fornecido.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Não autorizado. Nenhum token foi fornecido.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH_MIDDLEWARE_ERROR] JWT_SECRET não configurado.');
      return res.status(500).json({
        message: 'Erro de configuração do servidor.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: 'Não autorizado. Token inválido.',
      });
    }

    const usuarioAtual = await prisma.usuario.findUnique({
      where: {
        id: decoded.id,
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
    });

    if (!usuarioAtual) {
      return res.status(401).json({
        message: 'Não autorizado. O usuário deste token não existe mais.',
      });
    }

    if (!usuarioAtual.tenantId || !usuarioAtual.tenant) {
      return res.status(403).json({
        message: 'Usuário sem tenant vinculado. Verifique a configuração do sistema.',
      });
    }

    if (!usuarioAtual.tenant.ativo) {
      return res.status(403).json({
        message: 'A empresa vinculada a este usuário está inativa.',
      });
    }

    req.usuario = {
      id: usuarioAtual.id,
      nome: usuarioAtual.nome,
      role: usuarioAtual.role,
      tenantId: usuarioAtual.tenantId,
      tenant: usuarioAtual.tenant,
    };

    req.auth = {
      userId: usuarioAtual.id,
      nome: usuarioAtual.nome,
      role: usuarioAtual.role,
      tenantId: usuarioAtual.tenantId,
      tenant: usuarioAtual.tenant,
    };

    return next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE_ERROR]', error.message);

    return res.status(401).json({
      message: 'Não autorizado. O token falhou ou expirou.',
    });
  }
};

/**
 * Middleware para restringir acesso a administradores.
 * Deve ser usado depois do middleware `proteger`.
 */
export const admin = (req, res, next) => {
  if (req.usuario && req.usuario.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    message: 'Acesso negado. Requer privilégios de administrador.',
  });
};