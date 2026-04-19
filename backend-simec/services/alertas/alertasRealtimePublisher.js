import prisma from '../prismaService.js';
import { broadcastToUser } from '../realtime/alertasRealtimeHub.js';

async function contarNaoVistos({ tenantId, userId }) {
  return prisma.alerta.count({
    where: {
      tenantId,
      OR: [
        {
          lidoPorUsuarios: {
            none: {
              tenantId,
              usuarioId: userId,
            },
          },
        },
        {
          lidoPorUsuarios: {
            some: {
              tenantId,
              usuarioId: userId,
              visto: false,
            },
          },
        },
      ],
    },
  });
}

function publicarParaUsuario({ tenantId, userId, naoVistos }) {
  broadcastToUser({
    tenantId,
    userId,
    event: 'message',
    data: {
      type: 'alertas_count',
      naoVistos,
    },
  });
}

export async function publicarContagemAlertasParaTenant({ tenantId }) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { tenantId },
      select: { id: true },
    });

    for (const usuario of usuarios) {
      const naoVistos = await contarNaoVistos({
        tenantId,
        userId: usuario.id,
      });

      publicarParaUsuario({
        tenantId,
        userId: usuario.id,
        naoVistos,
      });
    }
  } catch (error) {
    console.error('[REALTIME_PUBLISH_ERROR]', error);
  }
}

export async function publicarContagemAlertas({ tenantId, userId }) {
  const naoVistos = await contarNaoVistos({ tenantId, userId });

  publicarParaUsuario({
    tenantId,
    userId,
    naoVistos,
  });
}
