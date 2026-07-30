import prisma from '../prismaService.js';

const tenantSelect = {
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
};

const usuarioSelect = {
  id: true,
  tenantId: true,
  username: true,
  email: true,
  nome: true,
  senha: true,
  role: true,
  tenant: {
    select: tenantSelect,
  },
};

export function buscarUsuariosPorUsername(username, tenantSlug = null) {
  return prisma.usuario.findMany({
    where: {
      username,
      ...(tenantSlug
        ? {
            tenant: {
              slug: tenantSlug,
            },
          }
        : {}),
    },
    select: usuarioSelect,
    take: 2,
  });
}

// Busca exclusiva no Tenant System por username OU email. Usada no login
// de plano de controle (sem precisar de slug). Retorna até 2 para
// permitir detectar conflito (não deve acontecer em circunstâncias normais).
export function buscarSuperadminSystem({ username, email }) {
  const or = [];
  if (username) or.push({ username: String(username).toLowerCase().trim() });
  if (email) or.push({ email: String(email).toLowerCase().trim() });
  if (or.length === 0) return Promise.resolve([]);

  return prisma.usuario.findMany({
    where: {
      role: 'superadmin',
      tenant: { kind: 'SYSTEM' },
      OR: or,
    },
    select: usuarioSelect,
    take: 2,
  });
}

export function buscarUsuarioPorEmailOuUsername({
  tenantSlug,
  username,
  email,
}) {
  const or = [];

  if (username) {
    or.push({ username: String(username).toLowerCase().trim() });
  }

  if (email) {
    or.push({ email: String(email).toLowerCase().trim() });
  }

  if (or.length === 0) {
    return null;
  }

  return prisma.usuario.findFirst({
    where: {
      tenant: {
        slug: tenantSlug,
      },
      OR: or,
    },
    select: usuarioSelect,
  });
}

export function buscarUsuarioPorId({ tenantId, usuarioId }) {
  return prisma.usuario.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: usuarioId,
      },
    },
    select: usuarioSelect,
  });
}

export function criarSessaoAutenticacao(data) {
  return prisma.authSession.create({ data });
}

export function buscarSessaoPorRefreshHash(refreshTokenHash) {
  return prisma.authSession.findUnique({
    where: { refreshTokenHash },
    include: {
      tenant: {
        select: tenantSelect,
      },
      usuario: {
        select: {
          id: true,
          tenantId: true,
          username: true,
          email: true,
          nome: true,
          role: true,
        },
      },
    },
  });
}

// Rotaciona a sessao no refresh: novo hash + novo expiresAt.
// Implementa sliding session — sessao ativa nunca expira; so' expira
// se ficar N dias sem refresh (usuario inativo por 14 dias).
export function rotacionarSessao({ id, refreshTokenHash, expiresAt }) {
  return prisma.authSession.update({
    where: { id },
    data: { refreshTokenHash, expiresAt },
  });
}

export function revogarSessaoPorId(id) {
  return prisma.authSession.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export function revogarSessoesDoUsuario({ tenantId, usuarioId }) {
  return prisma.authSession.updateMany({
    where: {
      tenantId,
      usuarioId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function criarPasswordResetToken(data) {
  return prisma.passwordResetToken.create({ data });
}

export function invalidarTokensResetDoUsuario({ tenantId, usuarioId }) {
  return prisma.passwordResetToken.updateMany({
    where: {
      tenantId,
      usuarioId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });
}

export function buscarPasswordResetTokenPorHash(tokenHash) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      tenant: {
        select: tenantSelect,
      },
      usuario: {
        select: usuarioSelect,
      },
    },
  });
}

export function marcarPasswordResetTokenComoUsado(id) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: {
      usedAt: new Date(),
    },
  });
}

export function atualizarSenhaUsuario({ tenantId, usuarioId, senhaHash }) {
  return prisma.usuario.update({
    where: {
      tenantId_id: {
        tenantId,
        id: usuarioId,
      },
    },
    data: {
      senha: senhaHash,
    },
  });
}

export function buscarTenantPorSlug(slug) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: tenantSelect,
  });
}
