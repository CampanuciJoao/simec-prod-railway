import express from 'express';
import { z } from 'zod';
import { admin, proteger } from '../middleware/authMiddleware.js';
import {
  atualizarPacsConnection,
  criarPacsConnection,
  listarPacsConnections,
  listarPacsFeaturesPorEquipamento,
  listarPacsRuns,
  obterPacsHealth,
  obterPredicaoPacsPorEquipamento,
} from '../services/pacs/pacsService.js';
import {
  enfileirarColetaPacsDoTenant,
  enfileirarTesteConexaoPacs,
} from '../services/queueService.js';

const router = express.Router();

const syncSchema = z.object({
  connectionId: z.string().optional().nullable(),
});

router.use(proteger);

router.get('/connections', admin, async (req, res) => {
  try {
    const data = await listarPacsConnections(req.usuario.tenantId);
    return res.json(data);
  } catch (error) {
    console.error('[PACS_CONNECTIONS_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar conexoes PACS.' });
  }
});

router.post('/connections', admin, async (req, res) => {
  try {
    const data = await criarPacsConnection({
      tenantId: req.usuario.tenantId,
      payload: req.body,
      autor: req.usuario,
    });
    return res.status(201).json(data);
  } catch (error) {
    console.error('[PACS_CONNECTION_CREATE_ERROR]', error);
    return res.status(error.status || 400).json({ message: error.message });
  }
});

router.put('/connections/:id', admin, async (req, res) => {
  try {
    const data = await atualizarPacsConnection({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
      payload: req.body,
      autor: req.usuario,
    });
    return res.json(data);
  } catch (error) {
    console.error('[PACS_CONNECTION_UPDATE_ERROR]', error);
    return res.status(error.status || 400).json({ message: error.message });
  }
});

router.post('/connections/:id/test', admin, async (req, res) => {
  try {
    const job = await enfileirarTesteConexaoPacs({
      tenantId: req.usuario.tenantId,
      connectionId: req.params.id,
      userId: req.usuario.id,
    });

    return res.status(202).json({
      message: 'Teste de conexao enfileirado.',
      jobId: job.id,
    });
  } catch (error) {
    console.error('[PACS_CONNECTION_TEST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao enfileirar teste de conexao.' });
  }
});

router.get('/health', admin, async (req, res) => {
  try {
    const data = await obterPacsHealth(req.usuario.tenantId);
    return res.json(data);
  } catch (error) {
    console.error('[PACS_HEALTH_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar saude do PACS.' });
  }
});

router.get('/runs', admin, async (req, res) => {
  try {
    const data = await listarPacsRuns(req.usuario.tenantId);
    return res.json(data);
  } catch (error) {
    console.error('[PACS_RUNS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar runs do PACS.' });
  }
});

router.post('/sync', admin, async (req, res) => {
  try {
    const parsed = syncSchema.parse(req.body || {});
    const job = await enfileirarColetaPacsDoTenant(
      req.usuario.tenantId,
      'manual_sync',
      parsed.connectionId || null
    );

    return res.status(202).json({
      message: 'Coleta PACS enfileirada.',
      jobId: job.id,
    });
  } catch (error) {
    console.error('[PACS_SYNC_ERROR]', error);
    return res.status(400).json({ message: error.message || 'Erro ao solicitar sync.' });
  }
});

router.get('/equipamentos/:id/features', async (req, res) => {
  try {
    const data = await listarPacsFeaturesPorEquipamento(
      req.usuario.tenantId,
      req.params.id
    );
    return res.json(data);
  } catch (error) {
    console.error('[PACS_FEATURES_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar features PACS.' });
  }
});

router.get('/equipamentos/:id/prediction', async (req, res) => {
  try {
    const data = await obterPredicaoPacsPorEquipamento(
      req.usuario.tenantId,
      req.params.id
    );
    return res.json(data);
  } catch (error) {
    console.error('[PACS_PREDICTION_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao carregar predição PACS.' });
  }
});

export default router;
