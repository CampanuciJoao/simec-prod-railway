import prisma from '../prismaService.js';

function buildAlertaWhere({ tenantId, userId, filtros = {} }) {
  const where = { tenantId };

  if (filtros.status === 'NaoVisto') {
    where.NOT = { lidoPorUsuarios: { some: { tenantId, usuarioId: userId, visto: true } } };
  } else if (filtros.status === 'Visto') {
    where.lidoPorUsuarios = { some: { tenantId, usuarioId: userId, visto: true } };
  }

  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.prioridade) where.prioridade = filtros.prioridade;

  if (filtros.search) {
    where.OR = [
      { titulo: { contains: filtros.search, mode: 'insensitive' } },
      { subtitulo: { contains: filtros.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

const ALERTA_LIDO_SELECT = {
  lidoPorUsuarios: {
    select: { visto: true, dataVisto: true },
  },
};

export async function listarAlertasPaginado({ tenantId, userId, page, pageSize, filtros = {} }) {
  const skip = (page - 1) * pageSize;
  const where = buildAlertaWhere({ tenantId, userId, filtros });

  const [data, total] = await prisma.$transaction([
    prisma.alerta.findMany({
      where,
      include: {
        lidoPorUsuarios: {
          where: { tenantId, usuarioId: userId },
          select: { visto: true, dataVisto: true },
        },
      },
      orderBy: { data: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.alerta.count({ where }),
  ]);

  return { data, total };
}

export async function contarMetricasAlertas({ tenantId, userId }) {
  const [total, vistos, criticos, recomendacoes] = await Promise.all([
    prisma.alerta.count({ where: { tenantId } }),
    prisma.alertaLidoPorUsuario.count({ where: { tenantId, usuarioId: userId, visto: true } }),
    prisma.alerta.count({ where: { tenantId, prioridade: 'Alta' } }),
    prisma.alerta.count({ where: { tenantId, tipo: 'Recomendação' } }),
  ]);

  return { total, naoVistos: Math.max(0, total - vistos), vistos, criticos, recomendacoes };
}

// kept for backward-compat (dashboard usa)
export async function contarAlertasNaoVistosDoUsuario({ tenantId, userId }) {
  const [total, vistos] = await Promise.all([
    prisma.alerta.count({ where: { tenantId } }),
    prisma.alertaLidoPorUsuario.count({ where: { tenantId, usuarioId: userId, visto: true } }),
  ]);
  return Math.max(0, total - vistos);
}

export function buscarAlertaPorId({ tenantId, alertaId }) {
  return prisma.alerta.findFirst({ where: { id: alertaId, tenantId } });
}

export function buscarUsuarioDoTenant({ tenantId, userId }) {
  return prisma.usuario.findFirst({
    where: { id: userId, tenantId },
    select: { id: true },
  });
}

export function buscarLeituraAlerta({ tenantId, alertaId, userId }) {
  return prisma.alertaLidoPorUsuario.findFirst({
    where: { tenantId, alertaId, usuarioId: userId },
  });
}

export function atualizarLeituraAlerta({ alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.update({
    where: { alertaId_usuarioId: { alertaId, usuarioId: userId } },
    data: { visto, dataVisto: visto ? new Date() : null },
  });
}

export function criarLeituraAlerta({ tenantId, alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.create({
    data: {
      tenant: { connect: { id: tenantId } },
      alerta: { connect: { tenantId_id: { tenantId, id: alertaId } } },
      usuario: { connect: { tenantId_id: { tenantId, id: userId } } },
      visto,
      dataVisto: visto ? new Date() : null,
    },
  });
}

export function buscarAlertaFormatado({ tenantId, alertaId, userId }) {
  return prisma.alerta.findFirst({
    where: { id: alertaId, tenantId },
    include: {
      lidoPorUsuarios: {
        where: { tenantId, usuarioId: userId },
        select: { visto: true, dataVisto: true },
      },
    },
  });
}
