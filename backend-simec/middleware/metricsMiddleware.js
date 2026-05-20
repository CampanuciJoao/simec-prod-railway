// Middleware Express que instrumenta cada requisição HTTP:
// incrementa counter e observa histograma de latência.
//
// Cuidado com cardinalidade: usamos req.route?.path quando disponível
// (path com :id em vez de o id real). Se não houver rota casada, cai
// pra "unknown" para evitar explodir séries.

import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
} from '../services/metrics/metricsService.js';

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ns = Number(process.hrtime.bigint() - start);
    const durationSeconds = ns / 1e9;

    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.path?.startsWith('/api')
      ? 'unknown_api'
      : 'unknown';

    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}
