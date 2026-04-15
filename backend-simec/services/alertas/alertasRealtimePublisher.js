const prisma = require('../lib/prisma');
const { broadcastToUser } = require('../realtime/alertasRealtimeHub');

async function contarNaoVistos({ tenantId, userId }) {
  return prisma.alerta.count({
    where: {
      tenantId,
      status: 'NaoVisto',
    },
  });
}

// 🔥 NOVO: publica para 1 usuário
async function publicarContagemAlertas({ tenantId, userId }) {
  const naoVistos = await contarNaoVistos({ tenantId, userId });

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

// 🔥 NOVO: publica para TODOS do tenant
async function publicarContagemAlertasParaTenant({ tenantId }) {
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId },
    select: { id: true },
  });

  for (const u of usuarios) {
    await publicarContagemAlertas({
      tenantId,
      userId: u.id,
    });
  }
}

module.exports = {
  publicarContagemAlertas,
  publicarContagemAlertasParaTenant,
};