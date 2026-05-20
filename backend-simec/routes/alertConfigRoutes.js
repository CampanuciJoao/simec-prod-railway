import { Router } from 'express';

import { proteger, admin } from '../middleware/authMiddleware.js';
import {
  getConfig,
  setConfig,
  resetConfig,
  getDefaults,
  getModulosSuportados,
} from '../services/alertas/alertConfigService.js';
import { getModuleSchema } from '../validators/alertConfigValidator.js';

const router = Router();

/**
 * GET /api/alert-config/modules
 * Lista módulos suportados + schema dos campos. Útil para o front montar form.
 */
router.get('/modules', proteger, (req, res) => {
  const modulos = getModulosSuportados().map((module) => ({
    module,
    schema: getModuleSchema(module),
    defaults: getDefaults(module),
  }));
  return res.json({ modulos });
});

/**
 * GET /api/alert-config/:module
 * Retorna config efetiva (defaults + override do tenant) + metadados de auditoria.
 */
router.get('/:module', proteger, async (req, res) => {
  const { module } = req.params;
  try {
    const config = await getConfig(req.tenantContext, module);
    const defaults = getDefaults(module);
    if (!defaults) return res.status(404).json({ message: `Módulo "${module}" não suportado.` });
    const meta = config.__meta || null;
    const clean = { ...config };
    delete clean.__meta;
    return res.json({
      module,
      defaults,
      config: clean,
      meta, // { updatedAt, updatedBy } ou null se ainda usa só defaults
    });
  } catch (err) {
    console.error('[ALERT_CONFIG_ROUTE_ERROR] GET falhou:', err);
    return res.status(500).json({ message: 'Falha ao carregar configuração.' });
  }
});

/**
 * PUT /api/alert-config/:module
 * Body: { config: { chave: valor, ... } }  (parcial — chaves não enviadas mantêm o valor atual)
 * Apenas admin/superadmin.
 */
router.put('/:module', proteger, admin, async (req, res) => {
  const { module } = req.params;
  const partial = req.body?.config;
  if (!partial || typeof partial !== 'object') {
    return res.status(400).json({ message: 'Body inválido: esperava { config: { ... } }.' });
  }

  const result = await setConfig(req.tenantContext, module, partial, req.usuario.id);
  if (!result.ok) {
    return res.status(400).json({ message: 'Validação falhou.', errors: result.errors });
  }
  const meta = result.config.__meta || null;
  const clean = { ...result.config };
  delete clean.__meta;
  return res.json({ module, config: clean, meta });
});

/**
 * POST /api/alert-config/:module/reset
 * Remove o override do tenant — volta aos defaults do sistema. Admin/superadmin.
 */
router.post('/:module/reset', proteger, admin, async (req, res) => {
  const { module } = req.params;
  const result = await resetConfig(req.tenantContext, module, req.usuario.id);
  if (!result.ok) {
    return res.status(400).json({ message: 'Falha ao restaurar padrões.', errors: result.errors });
  }
  const meta = result.config.__meta || null;
  const clean = { ...result.config };
  delete clean.__meta;
  return res.json({ module, config: clean, meta });
});

export default router;
