// Endpoints de busca e ações cross-tenant sobre usuários, restritos ao
// plano de controle.

import express from 'express';
import {
  proteger,
  requireSystemTenant,
} from '../middleware/authMiddleware.js';
import {
  listarUsuariosCrossTenant,
  gerarResetSenhaUsuarioService,
  listarTenantsParaFiltroService,
} from '../services/superadmin/usuariosService.js';

const router = express.Router();

router.use(proteger);
router.use(requireSystemTenant);

router.get('/', async (req, res) => {
  try {
    const data = await listarUsuariosCrossTenant({
      search: req.query?.search,
      tenantId: req.query?.tenantId,
      role: req.query?.role,
      page: req.query?.page,
      pageSize: req.query?.pageSize,
    });
    return res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_USUARIOS_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
});

router.get('/_tenants', async (_req, res) => {
  try {
    const data = await listarTenantsParaFiltroService();
    return res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_USUARIOS_TENANTS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar tenants.' });
  }
});

router.post('/:id/reset-senha', async (req, res) => {
  try {
    const resultado = await gerarResetSenhaUsuarioService({
      usuarioId: req.params.id,
      autor: req.usuario,
    });
    return res
      .status(resultado.status)
      .json(resultado.ok ? resultado.data : { message: resultado.message });
  } catch (error) {
    console.error('[SUPERADMIN_USUARIO_RESET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao gerar reset de senha.' });
  }
});

export default router;
