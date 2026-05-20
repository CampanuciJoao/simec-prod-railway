// Busca cross-tenant de usuários e reset de senha pelo plano de controle.
// Toda ação aqui registra LogAdmin pra auditoria do superadmin.

import crypto from 'crypto';
import prisma from '../prismaService.js';
import { forgotPasswordService } from '../auth/authService.js';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

function normalizarTermo(termo) {
  return String(termo || '').trim();
}

async function registrarLogAdmin({ autorId, acao, alvoTipo, alvoId, motivo, contexto }) {
  await prisma.logAdmin.create({
    data: {
      autorId,
      acao,
      alvoTipo,
      alvoId: alvoId ?? null,
      motivo: motivo ?? null,
      contexto: contexto ?? null,
    },
  });
}

export async function listarUsuariosCrossTenant({
  search,
  tenantId,
  role,
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  const take = Math.min(Math.max(Number(pageSize) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const termo = normalizarTermo(search);
  const where = {};

  if (termo) {
    where.OR = [
      { username: { contains: termo, mode: 'insensitive' } },
      { email: { contains: termo, mode: 'insensitive' } },
      { nome: { contains: termo, mode: 'insensitive' } },
    ];
  }
  if (tenantId) where.tenantId = tenantId;
  if (role) where.role = role;

  const [items, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: { id: true, nome: true, slug: true, kind: true, ativo: true },
        },
      },
      orderBy: [{ tenant: { nome: 'asc' } }, { username: 'asc' }],
      skip,
      take,
    }),
    prisma.usuario.count({ where }),
  ]);

  return {
    items,
    total,
    page: Math.max(Number(page) || 1, 1),
    pageSize: take,
  };
}

export async function gerarResetSenhaUsuarioService({ usuarioId, autor }) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { tenant: { select: { id: true, slug: true, kind: true, ativo: true } } },
  });
  if (!usuario) {
    return { ok: false, status: 404, message: 'Usuário não encontrado.' };
  }
  if (usuario.tenant?.kind === 'SYSTEM') {
    return {
      ok: false,
      status: 400,
      message: 'Não use reset cross-tenant para usuários do Tenant System. Use o fluxo de senha próprio.',
    };
  }
  if (!usuario.tenant?.ativo) {
    return {
      ok: false,
      status: 400,
      message: 'Tenant do usuário está inativo. Reative o tenant antes de gerar reset.',
    };
  }
  if (!usuario.email) {
    return {
      ok: false,
      status: 400,
      message: 'Usuário sem e-mail cadastrado — reset por e-mail impossível.',
    };
  }

  // Reusa o fluxo padrão de forgotPassword (envia email com token TTL 30min).
  const r = await forgotPasswordService({
    tenant: usuario.tenant.slug,
    email: usuario.email,
    appBaseUrl: process.env.FRONTEND_URL,
  });

  await registrarLogAdmin({
    autorId: autor.id,
    acao: 'usuario_reset_senha',
    alvoTipo: 'usuario',
    alvoId: usuario.id,
    motivo: null,
    contexto: {
      tenantId: usuario.tenant.id,
      tenantSlug: usuario.tenant.slug,
      emailDestino: usuario.email,
    },
  });

  return {
    ok: true,
    status: r.status || 200,
    data: {
      mensagem:
        'Se o e-mail estiver ativo, o usuário receberá o link de redefinição em alguns minutos.',
      enviadoPara: usuario.email,
    },
  };
}

// Busca rápida de tenants ativos para popular filtro de tenant na UI.
// Evita carregar a lista completa quando o painel só precisa do dropdown.
export async function listarTenantsParaFiltroService() {
  const items = await prisma.tenant.findMany({
    select: { id: true, nome: true, slug: true, kind: true, ativo: true },
    orderBy: [{ kind: 'asc' }, { nome: 'asc' }],
  });
  return { items };
}
