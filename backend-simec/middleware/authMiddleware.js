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
              kind: true,
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

    // Sessão de impersonação (opcional). Se o JWT carrega impersonacaoId,
    // validamos contra o DB antes de aceitar o actAsTenantId. Sessão
    // encerrada/expirada/revogada -> ignora claim silenciosamente e segue
    // como superadmin sem contexto de tenant.
    let impersonacao = null;
    if (decoded.impersonacaoId && decoded.actAsTenantId) {
      try {
        const registro = await prisma.impersonacao.findUnique({
          where: { id: decoded.impersonacaoId },
          include: {
            actedAsTenant: {
              select: { id: true, nome: true, slug: true, kind: true, ativo: true },
            },
          },
        });
        if (
          registro &&
          registro.status === 'ativa' &&
          registro.superadminId === usuarioAtual.id &&
          registro.actedAsTenantId === decoded.actAsTenantId &&
          registro.actedAsTenant?.ativo
        ) {
          impersonacao = {
            id: registro.id,
            actAsTenantId: registro.actedAsTenantId,
            actAsTenant: registro.actedAsTenant,
            motivo: registro.motivo,
            iniciadaEm: registro.iniciadaEm,
          };
        }
      } catch (err) {
        // Falha silenciosa: a request segue como se não houvesse impersonação.
        console.warn('[AUTH_MIDDLEWARE_IMPERSONACAO]', err.message);
      }
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
      impersonacao,
    };

    // tenantContext é o tenant em cujo ESCOPO a requisição deve operar.
    // Default = tenant do usuário. Sob impersonação ativa, = tenant alvo.
    // TODOS os handlers de domínio devem usar req.tenantContext em vez de
    // req.usuario.tenantId (ver requireTenantContext abaixo para a guarda).
    req.tenantContext = impersonacao?.actAsTenantId || usuarioAtual.tenantId;

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

// Plano de controle: superadmin DO Tenant System. Bloqueia mesmo
// superadmins legados que ainda estejam em CUSTOMER (não deveriam existir
// após Fase 0, mas garantia defensiva).
export const requireSystemTenant = (req, res, next) => {
  const u = req.usuario;
  if (u && u.role === 'superadmin' && u.tenant?.kind === 'SYSTEM') {
    return next();
  }
  return res.status(403).json({
    message: 'Acesso restrito ao plano de controle (Tenant System).',
  });
};

// Guard para endpoints de domínio (escopo de cliente). Bloqueia superadmin
// do Tenant System que esteja SEM impersonação ativa — esse tipo de
// usuário não pode operar dados de cliente sem antes "atuar como".
// Usuários CUSTOMER comuns passam direto.
export const requireTenantContext = (req, res, next) => {
  const u = req.usuario;

  // Sem usuário (não deveria chegar aqui se proteger rodou antes).
  if (!u) {
    return res.status(401).json({ message: 'Nao autorizado.' });
  }

  // Superadmin do Tenant System sem impersonação não tem contexto válido
  // de tenant operacional. Frontend deve obrigar selecionar tenant antes
  // de acessar rotas de domínio.
  if (u.tenant?.kind === 'SYSTEM' && !u.impersonacao) {
    return res.status(412).json({
      message: 'Selecione um tenant para atuar antes de acessar dados operacionais.',
      code: 'TENANT_CONTEXT_REQUIRED',
    });
  }

  return next();
};
