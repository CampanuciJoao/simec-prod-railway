// Painel de custo LLM — exclusivo do SuperAdmin do Tenant System.
// Endpoints:
//   GET /resumo      — KPIs gerais (chamadas, custo, tokens, fallback%)
//   GET /por-tenant  — custo agregado por tenant
//   GET /por-feature — custo agregado por feature (gehc_pdf_extract, agente_*, etc)
//   GET /serie-diaria — custo + chamadas por dia (grafico)
//
// Filtros via query: ?de=2026-04-01&ate=2026-05-28 (ambos opcionais —
// default ultimos 30 dias).

import express from 'express';
import {
  proteger,
  requireSystemTenant,
} from '../middleware/authMiddleware.js';
import {
  resumoGeralService,
  porTenantService,
  porFeatureService,
  serieDiariaService,
} from '../services/superadmin/llmCallLogService.js';

const router = express.Router();

router.use(proteger);
router.use(requireSystemTenant);

router.get('/resumo', async (req, res) => {
  try {
    const data = await resumoGeralService({
      de: req.query?.de,
      ate: req.query?.ate,
    });
    return res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_LLM_LOG_RESUMO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao obter resumo de custos LLM.' });
  }
});

router.get('/por-tenant', async (req, res) => {
  try {
    const data = await porTenantService({
      de: req.query?.de,
      ate: req.query?.ate,
    });
    return res.json({ items: data });
  } catch (error) {
    console.error('[SUPERADMIN_LLM_LOG_TENANT_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao obter custos por tenant.' });
  }
});

router.get('/por-feature', async (req, res) => {
  try {
    const data = await porFeatureService({
      de: req.query?.de,
      ate: req.query?.ate,
    });
    return res.json({ items: data });
  } catch (error) {
    console.error('[SUPERADMIN_LLM_LOG_FEATURE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao obter custos por feature.' });
  }
});

router.get('/serie-diaria', async (req, res) => {
  try {
    const data = await serieDiariaService({
      de: req.query?.de,
      ate: req.query?.ate,
    });
    return res.json({ items: data });
  } catch (error) {
    console.error('[SUPERADMIN_LLM_LOG_SERIE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao obter serie diaria.' });
  }
});

export default router;
