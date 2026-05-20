// Endpoints de auditoria do plano de controle.
//   GET /admin            — ações administrativas (log_admin)
//   GET /impersonacoes    — sessões de impersonação

import express from 'express';
import {
  proteger,
  requireSystemTenant,
} from '../middleware/authMiddleware.js';
import {
  listarLogAdminService,
  listarImpersonacoesService,
} from '../services/superadmin/auditoriaService.js';

const router = express.Router();

router.use(proteger);
router.use(requireSystemTenant);

router.get('/admin', async (req, res) => {
  try {
    const data = await listarLogAdminService({
      autorId: req.query?.autorId,
      alvoTipo: req.query?.alvoTipo,
      alvoId: req.query?.alvoId,
      acao: req.query?.acao,
      de: req.query?.de,
      ate: req.query?.ate,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    });
    return res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_AUDITORIA_ADMIN_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar log administrativo.' });
  }
});

router.get('/impersonacoes', async (req, res) => {
  try {
    const data = await listarImpersonacoesService({
      status: req.query?.status,
      superadminId: req.query?.superadminId,
      actedAsTenantId: req.query?.actedAsTenantId,
      de: req.query?.de,
      ate: req.query?.ate,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    });
    return res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_AUDITORIA_IMPERSONACOES_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar impersonações.' });
  }
});

export default router;
