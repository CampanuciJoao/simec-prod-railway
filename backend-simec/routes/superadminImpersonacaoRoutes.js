// Endpoints para abrir/encerrar sessões de impersonação.
// Protegidos por proteger + requireSystemTenant — só superadmin do Tenant
// System acessa.

import express from 'express';
import { proteger, requireSystemTenant } from '../middleware/authMiddleware.js';
import {
  iniciarImpersonacao,
  encerrarImpersonacao,
} from '../services/auth/impersonacaoService.js';

const router = express.Router();

router.post('/:tenantId', proteger, requireSystemTenant, async (req, res) => {
  try {
    const resultado = await iniciarImpersonacao({
      superadmin: req.usuario,
      tenantAlvoId: req.params.tenantId,
      motivo: req.body?.motivo,
    });
    return res.status(resultado.status).json(resultado.ok ? resultado.data : { message: resultado.message });
  } catch (error) {
    console.error('[IMPERSONACAO_INICIAR_ERROR]', error);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

router.delete('/', proteger, requireSystemTenant, async (req, res) => {
  try {
    const resultado = await encerrarImpersonacao({
      superadmin: req.usuario,
      impersonacaoId: req.usuario?.impersonacao?.id || null,
    });
    return res.status(resultado.status).json(resultado.ok ? resultado.data : { message: resultado.message });
  } catch (error) {
    console.error('[IMPERSONACAO_ENCERRAR_ERROR]', error);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

export default router;
