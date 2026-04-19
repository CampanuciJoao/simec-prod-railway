import express from 'express';

import { proteger } from '../middleware/authMiddleware.js';
import { obterDashboardService } from '../services/dashboard/dashboardService.js';

const router = express.Router();

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const resultado = await obterDashboardService({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
    });

    return res.status(200).json(resultado.data);
  } catch (error) {
    console.error('[DASHBOARD_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao processar dashboard.',
    });
  }
});

export default router;
