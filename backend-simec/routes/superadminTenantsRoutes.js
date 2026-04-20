import express from 'express';

import { proteger, superadmin } from '../middleware/authMiddleware.js';
import {
  alterarStatusTenantService,
  bootstrapAdminTenantService,
  criarTenantService,
  detalharTenantService,
  listarTenantsService,
  atualizarTenantService,
} from '../services/tenants/tenantService.js';

const router = express.Router();

router.use(proteger);
router.use(superadmin);

router.get('/tenants', async (req, res) => {
  try {
    const tenants = await listarTenantsService();
    return res.json({ items: tenants });
  } catch (error) {
    console.error('[SUPERADMIN_TENANTS_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar tenants.' });
  }
});

router.get('/tenants/:id', async (req, res) => {
  try {
    const resultado = await detalharTenantService(req.params.id);
    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_TENANT_DETAIL_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao detalhar tenant.' });
  }
});

router.post('/tenants', async (req, res) => {
  try {
    const resultado = await criarTenantService({
      payload: req.body,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_TENANT_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao criar tenant.' });
  }
});

router.put('/tenants/:id', async (req, res) => {
  try {
    const resultado = await atualizarTenantService({
      id: req.params.id,
      payload: req.body,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_TENANT_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar tenant.' });
  }
});

router.post('/tenants/:id/status', async (req, res) => {
  try {
    const resultado = await alterarStatusTenantService({
      id: req.params.id,
      ativo: req.body?.ativo,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_TENANT_STATUS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao alterar status do tenant.' });
  }
});

router.post('/tenants/:id/bootstrap-admin', async (req, res) => {
  try {
    const resultado = await bootstrapAdminTenantService({
      id: req.params.id,
      payload: req.body,
      autor: req.usuario,
    });

    return res.status(resultado.status).json(
      resultado.ok ? resultado.data : { message: resultado.message }
    );
  } catch (error) {
    console.error('[SUPERADMIN_TENANT_BOOTSTRAP_ERROR]', error);
    return res
      .status(500)
      .json({ message: 'Erro ao criar administrador do tenant.' });
  }
});

export default router;
