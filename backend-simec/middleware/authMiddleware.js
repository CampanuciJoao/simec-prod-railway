import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';

// 60-second TTL cache — eliminates one DB round-trip per authenticated request
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map(); // key: userId → { data, expiresAt }

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userCache.delete(userId);
    return null;
  }
  return entry.data;
}

function setCachedUser(userId, data) {
  userCache.set(userId, { data, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

export function invalidateUserCache(userId) {
  userCache.delete(userId);
}

export const proteger = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Nao autorizado. Nenhum token foi fornecido.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Nao autorizado. Nenhum token foi fornecido.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH_MIDDLEWARE_ERROR] JWT_SECRET nao configurado.');
      return res.status(500).json({
        message: 'Erro de configuracao do servidor.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: 'Nao autorizado. Token invalido.',
      });
    }

    let usuarioAtual = getCachedUser(decoded.id);

    if (!usuarioAtual) {
      usuarioAtual = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        include: {
          tenant: {
            select: {
              id: true,
              nome: true,
              slug: true,
              timezone: true,
              locale: true,
              ativo: true,
              contatoNome: true,
              contatoEmail: true,
              contatoTelefone: true,
            },
          },
        },
      });

      if (usuarioAtual) setCachedUser(decoded.id, usuarioAtual);
    }

    if (!usuarioAtual) {
      return res.status(401).json({
        message: 'Nao autorizado. O usuario deste token nao existe mais.',
      });
    }

    if (!usuarioAtual.tenantId || !usuarioAtual.tenant) {
      return res.status(403).json({
        message: 'Usuario sem tenant vinculado. Verifique a configuracao do sistema.',
      });
    }

    if (!usuarioAtual.tenant.ativo) {
      return res.status(403).json({
        message: 'A empresa vinculada a este usuario esta inativa.',
      });
    }

    req.usuario = {
      id: usuarioAtual.id,
      nome: usuarioAtual.nome,
      role: usuarioAtual.role,
      email: usuarioAtual.email,
      tenantId: usuarioAtual.tenantId,
      tenant: usuarioAtual.tenant,
    };

    return next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE_ERROR]', error.message);

    return res.status(401).json({
      message: 'Nao autorizado. O token falhou ou expirou.',
    });
  }
};

export const admin = (req, res, next) => {
  if (req.usuario && ['admin', 'superadmin'].includes(req.usuario.role)) {
    return next();
  }

  return res.status(403).json({
    message: 'Acesso negado. Requer privilegios de administrador.',
  });
};

export const superadmin = (req, res, next) => {
  if (req.usuario && req.usuario.role === 'superadmin') {
    return next();
  }

  return res.status(403).json({
    message: 'Acesso negado. Requer privilegios de superadmin.',
  });
};
