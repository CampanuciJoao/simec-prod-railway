// Ficheiro: routes/alertasRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);

// ==============================
// GET ALERTAS
// ==============================
router.get('/', async (req, res) => {
  const userId = req.usuario.id;
  const tenantId = req.usuario.tenantId;

  try {
    const alertas = await prisma.alerta.findMany({
      where: {
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
      orderBy: {
        data: 'desc',
      },
    });

    const formatados = alertas.map((alerta) => ({
      ...alerta,
      status:
        alerta.lidoPorUsuarios.length > 0 && alerta.lidoPorUsuarios[0].visto
          ? 'Visto'
          : 'NaoVisto',
    }));

    return res.json(formatados);
  } catch (error) {
    console.error('[ALERTA_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar alertas.',
    });
  }
});

// ==============================
// PUT STATUS
// ==============================
router.put('/:id/status', async (req, res) => {
  const { id: alertaId } = req.params;
  const { status } = req.body;

  const userId = req.usuario.id;
  const tenantId = req.usuario.tenantId;

  if (!status || !['Visto', 'NaoVisto'].includes(status)) {
    return res.status(400).json({
      message: "Status inválido. Use 'Visto' ou 'NaoVisto'.",
    });
  }

  const visto = status === 'Visto';

  try {
    // valida se o alerta pertence ao tenant
    const alerta = await prisma.alerta.findFirst({
      where: {
        id: alertaId,
        tenantId,
      },
    });

    if (!alerta) {
      return res.status(404).json({
        message: 'Alerta não encontrado.',
      });
    }

    // valida se o usuário existe dentro do tenant
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        message: 'Usuário inválido para este tenant.',
      });
    }

    // como o @@id é [alertaId, usuarioId], buscamos primeiro
    const leituraExistente = await prisma.alertaLidoPorUsuario.findFirst({
      where: {
        tenantId,
        alertaId,
        usuarioId: userId,
      },
    });

    if (leituraExistente) {
      await prisma.alertaLidoPorUsuario.update({
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
    } else {
      await prisma.alertaLidoPorUsuario.create({
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

    const alertaAtualizado = await prisma.alerta.findFirst({
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

    const formatado = {
      ...alertaAtualizado,
      status:
        alertaAtualizado.lidoPorUsuarios.length > 0 &&
        alertaAtualizado.lidoPorUsuarios[0].visto
          ? 'Visto'
          : 'NaoVisto',
    };

    return res.json(formatado);
  } catch (error) {
    console.error('[ALERTA_UPDATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao atualizar alerta.',
    });
  }
});

export default router;