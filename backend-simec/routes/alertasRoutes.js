import express from 'express';

import { proteger } from '../middleware/authMiddleware.js';
import {
  listarAlertasService,
  resumirAlertasService,
  atualizarStatusAlertaService,
} from '../services/alertas/alertasService.js';

const router = express.Router();

router.use(proteger);

router.get('/', async (req, res) => {
  try {
    const limitQuery = Number.parseInt(req.query?.limit, 10);
    const resultado = await listarAlertasService({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      limit:
        Number.isNaN(limitQuery) || limitQuery <= 0
          ? null
          : Math.min(limitQuery, 50),
    });

    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar alertas.',
    });
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const resultado = await resumirAlertasService({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
    });

    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_RESUMO_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar resumo de alertas.',
    });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const resultado = await atualizarStatusAlertaService({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      alertaId: req.params.id,
      status: req.body?.status,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    return res.json(resultado.data);
  } catch (error) {
    console.error('[ALERTA_UPDATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao atualizar alerta.',
    });
  }
});

export default router;
