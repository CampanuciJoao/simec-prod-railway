// Ficheiro: middleware/authMiddleware.js
// Versão: Multi-tenant ready
// Descrição: Middleware de autenticação com suporte a tenant.

import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';

/**
 * Middleware para proteger rotas.
 * Valida o token JWT, confirma se o usuário ainda existe
 * e carrega também o contexto do tenant.
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuarioAtual = await prisma.usuario.findUnique({
      where: { id: decoded.id },
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