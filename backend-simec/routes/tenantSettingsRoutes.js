import express from 'express';

import { proteger, admin } from '../middleware/authMiddleware.js';
import {
  atualizarTenantSettingsService,
  obterTenantSettingsService,
} from '../services/tenants/tenantService.js';

const router = express.Router();

router.use(proteger);
router.use(admin);

router.get('/settings', async (req, res) => {
  try {
    const resultado = await obterTenantSettingsService(req.usuario.tenantId);
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[TENANT_SETTINGS_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar configuracoes.' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const resultado = await atualizarTenantSettingsService({
      tenantId: req.usuario.tenantId,
      payload: req.body,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[TENANT_SETTINGS_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar configuracoes.' });
  }
});

export default router;
