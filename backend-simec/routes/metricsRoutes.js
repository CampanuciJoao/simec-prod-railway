// Endpoint /metrics (formato Prometheus) — texto puro.
// SEM autenticação para permitir scrape do Prometheus/Grafana.
// Em produção, restrinja via firewall, proxy ou IP allow-list no Railway
// se o serviço estiver exposto publicamente.

import express from 'express';
import { registry } from '../services/metrics/metricsService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    console.error('[METRICS_ENDPOINT_ERROR]', error);
    res.status(500).send('# Erro ao gerar métricas\n');
  }
});

export default router;
