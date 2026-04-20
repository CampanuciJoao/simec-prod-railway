import prisma from '../prismaService.js';

export function listarAlertasDoUsuario({ tenantId, userId, limit = null }) {
  return prisma.alerta.findMany({
    where: { tenantId },
    include: {
      lidoPorUsuarios: {
        where: {
          tenantId,
          usuarioId: userId,
        },
        select: {
          visto: true,
          dataVisto: true,
        },
      },
    },
    orderBy: {
      data: 'desc',
    },
    ...(limit ? { take: limit } : {}),
  });
}

export async function contarAlertasNaoVistosDoUsuario({ tenantId, userId }) {
  const totalAlertas = await prisma.alerta.count({
    where: { tenantId },
  });

  const totalVistos = await prisma.alertaLidoPorUsuario.count({
    where: {
      tenantId,
      usuarioId: userId,
      visto: true,
    },
  });

  return Math.max(0, totalAlertas - totalVistos);
}

export function buscarAlertaPorId({ tenantId, alertaId }) {
  return prisma.alerta.findFirst({
    where: {
      id: alertaId,
      tenantId,
    },
  });
}

export function buscarUsuarioDoTenant({ tenantId, userId }) {
  return prisma.usuario.findFirst({
    where: {
      id: userId,
      tenantId,
    },
    select: {
      id: true,
    },
  });
}

export function buscarLeituraAlerta({ tenantId, alertaId, userId }) {
  return prisma.alertaLidoPorUsuario.findFirst({
    where: {
      tenantId,
      alertaId,
      usuarioId: userId,
    },
  });
}

export function atualizarLeituraAlerta({ alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.update({
    where: {
      alertaId_usuarioId: {
        alertaId,
        usuarioId: userId,
      },
    },
    data: {
      visto,
      dataVisto: visto ? new Date() : null,
    },
  });
}

export function criarLeituraAlerta({ tenantId, alertaId, userId, visto }) {
  return prisma.alertaLidoPorUsuario.create({
    data: {
      tenant: {
        connect: { id: tenantId },
      },
      alerta: {
        connect: {
          tenantId_id: {
            tenantId,
            id: alertaId,
          },
        },
      },
      usuario: {
        connect: {
          tenantId_id: {
            tenantId,
            id: userId,
          },
        },
      },
      visto,
      dataVisto: visto ? new Date() : null,
    },
  });
}

export function buscarAlertaFormatado({ tenantId, alertaId, userId }) {
  return prisma.alerta.findFirst({
    where: {
      id: alertaId,
      tenantId,
    },
    include: {
      lidoPorUsuarios: {
        where: {
          tenantId,
          usuarioId: userId,
        },
        select: {
          visto: true,
          dataVisto: true,
        },
      },
    },
  });
}
