const prisma = require('../lib/prisma');
const { broadcastToUser } = require('../realtime/alertasRealtimeHub');

async function contarNaoVistos({ tenantId }) {
  return prisma.alerta.count({
    where: {
      tenantId,
      status: 'NaoVisto',
    },
  });
}

// 🔥 publica para 1 usuário (reutiliza count já calculado)
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

// 🔥 publica para TODOS (otimizado)
async function publicarContagemAlertasParaTenant({ tenantId }) {
  try {
    const [usuarios, naoVistos] = await Promise.all([
      prisma.usuario.findMany({
        where: { tenantId },
        select: { id: true },
      }),
      contarNaoVistos({ tenantId }),
    ]);

    for (const u of usuarios) {
      publicarParaUsuario({
        tenantId,
        userId: u.id,
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

// 🔥 mantém compatibilidade com update individual
async function publicarContagemAlertas({ tenantId, userId }) {
  const naoVistos = await contarNaoVistos({ tenantId });

  publicarParaUsuario({
    tenantId,
    userId,
    naoVistos,
  });
}

module.exports = {
  publicarContagemAlertas,
  publicarContagemAlertasParaTenant,
};