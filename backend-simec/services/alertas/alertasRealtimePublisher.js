import prisma from '../prismaService.js';
import { broadcastToUser } from '../realtime/alertasRealtimeHub.js';

async function contarNaoVistos({ tenantId }) {
  return prisma.alerta.count({
    where: {
      tenantId,
      status: 'NaoVisto',
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
    const [usuarios, naoVistos] = await Promise.all([
      prisma.usuario.findMany({
        where: { tenantId },
        select: { id: true },
      }),
      contarNaoVistos({ tenantId }),
    ]);

    for (const usuario of usuarios) {
      publicarParaUsuario({
        tenantId,
        userId: usuario.id,
        naoVistos,
      });
    }

    console.log(
      `[REALTIME] Tenant ${tenantId} → ${naoVistos} não vistos (${usuarios.length} usuários)`
    );
  } catch (error) {
    console.error('[REALTIME_PUBLISH_ERROR]', error);
  }
}

export async function publicarContagemAlertas({ tenantId, userId }) {
  const naoVistos = await contarNaoVistos({ tenantId });

  publicarParaUsuario({
    tenantId,
    userId,
    naoVistos,
  });
}