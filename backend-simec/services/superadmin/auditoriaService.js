// Consultas paginadas para o painel de auditoria do plano de controle:
//   1. log_admin — ações administrativas cross-tenant (criar tenant,
//      reset cross-tenant, mudanças em catálogo).
//   2. impersonacao — histórico de sessões ativas e encerradas.

import prisma from '../prismaService.js';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

function parsePeriod(period) {
  // period esperado: { de: ISO?, ate: ISO? }
  const where = {};
  if (period?.de) where.gte = new Date(period.de);
  if (period?.ate) where.lte = new Date(period.ate);
  return Object.keys(where).length ? where : undefined;
}

export async function listarLogAdminService({
  autorId,
  alvoTipo,
  alvoId,
  acao,
  de,
  ate,
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  const take = Math.min(Math.max(Number(pageSize) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where = {};
  if (autorId) where.autorId = autorId;
  if (alvoTipo) where.alvoTipo = alvoTipo;
  if (alvoId) where.alvoId = alvoId;
  if (acao) where.acao = acao;
  const periodoWhere = parsePeriod({ de, ate });
  if (periodoWhere) where.timestamp = periodoWhere;

  const [items, total] = await Promise.all([
    prisma.logAdmin.findMany({
      where,
      include: {
        autor: { select: { id: true, nome: true, username: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.logAdmin.count({ where }),
  ]);

  return { items, total, page: Math.max(Number(page) || 1, 1), pageSize: take };
}

export async function listarImpersonacoesService({
  status,
  superadminId,
  actedAsTenantId,
  de,
  ate,
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}) {
  const take = Math.min(Math.max(Number(pageSize) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where = {};
  if (status) where.status = status;
  if (superadminId) where.superadminId = superadminId;
  if (actedAsTenantId) where.actedAsTenantId = actedAsTenantId;
  const periodoWhere = parsePeriod({ de, ate });
  if (periodoWhere) where.iniciadaEm = periodoWhere;

  const [items, total] = await Promise.all([
    prisma.impersonacao.findMany({
      where,
      include: {
        superadmin: { select: { id: true, nome: true, username: true, email: true } },
        actedAsTenant: { select: { id: true, nome: true, slug: true } },
      },
      orderBy: { iniciadaEm: 'desc' },
      skip,
      take,
    }),
    prisma.impersonacao.count({ where }),
  ]);

  // Calcula duracaoSegundos no momento da consulta para sessões encerradas.
  const enriched = items.map((i) => ({
    ...i,
    duracaoSegundos: i.encerradaEm
      ? Math.round((new Date(i.encerradaEm).getTime() - new Date(i.iniciadaEm).getTime()) / 1000)
      : null,
  }));

  return { items: enriched, total, page: Math.max(Number(page) || 1, 1), pageSize: take };
}
