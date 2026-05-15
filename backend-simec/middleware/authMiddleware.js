import jwt from 'jsonwebtoken';
import prisma from '../services/prismaService.js';
import { getSharedRedisClient, isSharedRedisUnavailable } from '../services/redis/sharedRedisClient.js';

const USER_CACHE_PREFIX = 'user_cache:';
const USER_CACHE_TTL_S = 60;

async function getCachedUser(userId) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) return null;
  try {
    const raw = await redis.get(`${USER_CACHE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedUser(userId, data) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) return;
  try {
    await redis.set(`${USER_CACHE_PREFIX}${userId}`, JSON.stringify(data), 'EX', USER_CACHE_TTL_S);
  } catch {
    // cache degradado não bloqueia autenticação
  }
}

export async function invalidateUserCache(userId) {
  const redis = getSharedRedisClient();
  if (!redis || isSharedRedisUnavailable()) return;
  try {
    await redis.del(`${USER_CACHE_PREFIX}${userId}`);
  } catch {
    // silencioso
  }
}

function extrairToken(req) {
  // Header padrão Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tk = authHeader.split(' ')[1];
    if (tk) return tk;
  }
  // Fallback para SSE/EventSource — a API EventSource do browser não
  // permite enviar header Authorization, então o front passa o token na
  // query string como ?t=<token>. Usado em /api/alertas/stream.
  const tk = req.query?.t;
  if (typeof tk === 'string' && tk.length > 0) return tk;
  return null;
}

export const proteger = async (req, res, next) => {
  try {
    const token = extrairToken(req);

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

    let usuarioAtual = await getCachedUser(decoded.id);

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

      if (usuarioAtual) await setCachedUser(decoded.id, usuarioAtual);
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
      timezone: usuarioAtual.timezone || null,
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
