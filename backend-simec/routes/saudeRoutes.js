// /api/superadmin/saude — snapshot JSON consumido pelo painel SIMEC.
// Protegido por proteger + admin (assumindo que superadmin tem role admin).
// Não exige scrape de Prometheus, é só uma view convencional do estado atual.

import express from 'express';
import { proteger } from '../middleware/authMiddleware.js';
import {
  snapshotSaude,
  setQueueDepth,
} from '../services/metrics/metricsService.js';
import { coletarQueueCounts } from '../services/queueService.js';

const router = express.Router();

router.get('/', proteger, async (req, res) => {
  try {
    if (!isSuperAdmin(req.usuario)) {
      return res.status(403).json({ message: 'Apenas superadmin.' });
    }

    // Atualiza counts da fila on-demand antes de gerar o snapshot.
    const counts = await coletarQueueCounts();
    if (counts) setQueueDepth('alertas-fila', counts);

    const snapshot = await snapshotSaude();
    return res.json(snapshot);
  } catch (error) {
    console.error('[SAUDE_ROUTE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao gerar snapshot.' });
  }
});

function isSuperAdmin(usuario) {
  if (!usuario) return false;
  return (
    usuario.role === 'superadmin' ||
    usuario.isSuperAdmin === true ||
    usuario.tipo === 'superadmin'
  );
}

export default router;
