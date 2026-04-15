const express = require('express');
const prisma = require('../lib/prisma'); // ajuste para seu caminho real
const proteger = require('../middlewares/proteger'); // ajuste para seu middleware real

const {
  addClient,
  sendEvent,
} = require('../services/realtime/alertasRealtimeHub');

const router = express.Router();

async function contarNaoVistos({ tenantId, userId }) {
  // AJUSTE ESTA REGRA conforme sua implementação real de alertas/lidos.
  // Esta versão assume:
  // - alerta pertence ao tenant
  // - se não houver registro em alertas_lidos_por_usuario => não visto
  // - se houver registro com visto=false => não visto
  const total = await prisma.alerta.count({
    where: {
      tenantId,
      OR: [
        {
          lidoPorUsuarios: {
            none: {
              usuarioId: userId,
            },
          },
        },
        {
          lidoPorUsuarios: {
            some: {
              usuarioId: userId,
              visto: false,
            },
          },
        },
      ],
    },
  });

  return total;
}

router.get('/stream', proteger, async (req, res) => {
  const tenantId = req.usuario?.tenantId || req.user?.tenantId;
  const userId = req.usuario?.id || req.user?.id;

  if (!tenantId || !userId) {
    return res.status(401).json({ message: 'Usuário não autenticado.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const removeClient = addClient({ tenantId, userId, res });

  const naoVistos = await contarNaoVistos({ tenantId, userId });

  sendEvent(res, 'message', {
    type: 'snapshot',
    naoVistos,
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
    res.end();
  });
});

module.exports = router;