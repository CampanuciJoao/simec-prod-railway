// Painel de auditoria de licoes IA cross-tenant — SuperAdmin do
// Tenant System apenas. Endpoints:
//   GET  /resumo               — distribuicao status, ultima auditoria, top padroes
//   GET  /quarentena           — lista paginada de licoes em quarentena
//   POST /:licaoId/decisao     — APROVADA (volta a few-shot) ou REJEITADA (fica off)
//   POST /executar-auditoria   — dispara job sincrono on-demand (manual)

import express from 'express';
import {
  proteger,
  requireSystemTenant,
} from '../middleware/authMiddleware.js';
import {
  resumoAuditoriaService,
  listarQuarentenaService,
  decidirSobreLicaoService,
  rodarAuditoriaAgoraService,
} from '../services/superadmin/licaoAuditoriaService.js';

const router = express.Router();

router.use(proteger);
router.use(requireSystemTenant);

router.get('/resumo', async (req, res) => {
  try {
    const data = await resumoAuditoriaService();
    res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_LICAO_AUDIT_RESUMO]', error);
    res.status(500).json({ message: 'Erro ao obter resumo.' });
  }
});

router.get('/quarentena', async (req, res) => {
  try {
    const pagina = parseInt(req.query?.pagina || '1', 10);
    const tamanhoPagina = parseInt(req.query?.tamanhoPagina || '20', 10);
    const data = await listarQuarentenaService({ pagina, tamanhoPagina });
    res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_LICAO_AUDIT_QUARENTENA]', error);
    res.status(500).json({ message: 'Erro ao listar quarentena.' });
  }
});

router.post('/:licaoId/decisao', async (req, res) => {
  try {
    const { licaoId } = req.params;
    const { decisao } = req.body || {};
    const data = await decidirSobreLicaoService({
      licaoId,
      decisao,
      revisorId: req.usuario?.id || null,
    });
    res.json(data);
  } catch (error) {
    const status = ['decisao_invalida', 'licao_nao_encontrada', 'licao_nao_em_quarentena']
      .includes(error.message)
      ? 422
      : 500;
    if (status === 500) console.error('[SUPERADMIN_LICAO_AUDIT_DECISAO]', error);
    res.status(status).json({ message: error.message });
  }
});

router.post('/executar-auditoria', async (req, res) => {
  try {
    const limite = parseInt(req.body?.limite || '500', 10);
    const data = await rodarAuditoriaAgoraService({ limite });
    res.json(data);
  } catch (error) {
    console.error('[SUPERADMIN_LICAO_AUDIT_RUN]', error);
    res.status(500).json({ message: 'Erro ao executar auditoria.' });
  }
});

export default router;
