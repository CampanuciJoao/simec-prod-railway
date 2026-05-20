// Service de métricas Prometheus para observabilidade do SIMEC.
// Coleta:
//  - HTTP requests (count + latência)
//  - Filas BullMQ (depth, duração, falhas)
//  - LLM (tokens, taxa de fallback)
//  - GEHC (status de auth por tenant)
//
// Endpoint /metrics expõe o registry em formato Prometheus.
// Endpoint /api/superadmin/saude expõe um snapshot JSON pro painel
// do SIMEC consumir sem precisar parsear o texto Prometheus.

import client from 'prom-client';

const PREFIX = 'simec_';

// Registry isolado — não usa o default global. Permite instâncias
// múltiplas no futuro (ex.: worker.js com seu próprio registry).
export const registry = new client.Registry();

client.collectDefaultMetrics({
  register: registry,
  prefix: PREFIX,
});

// ─── HTTP ───────────────────────────────────────────────────────────────────
export const httpRequestsTotal = new client.Counter({
  name: `${PREFIX}http_requests_total`,
  help: 'Total de requisições HTTP recebidas.',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: `${PREFIX}http_request_duration_seconds`,
  help: 'Latência de requisições HTTP em segundos.',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// ─── Filas BullMQ ───────────────────────────────────────────────────────────
export const queueDepth = new client.Gauge({
  name: `${PREFIX}queue_depth`,
  help: 'Profundidade da fila BullMQ por estado (waiting, active, delayed, failed).',
  labelNames: ['queue', 'state'],
  registers: [registry],
});

export const jobDurationSeconds = new client.Histogram({
  name: `${PREFIX}job_duration_seconds`,
  help: 'Duração de jobs BullMQ em segundos.',
  labelNames: ['queue', 'name'],
  buckets: [0.5, 1, 5, 15, 30, 60, 120, 300, 600, 1800],
  registers: [registry],
});

export const jobFailuresTotal = new client.Counter({
  name: `${PREFIX}job_failures_total`,
  help: 'Total de falhas de jobs BullMQ.',
  labelNames: ['queue', 'name', 'reason'],
  registers: [registry],
});

// ─── LLM ────────────────────────────────────────────────────────────────────
export const llmTokensTotal = new client.Counter({
  name: `${PREFIX}llm_tokens_total`,
  help: 'Total de tokens consumidos pelo LLM.',
  labelNames: ['provider', 'model', 'feature', 'kind'], // kind: prompt|completion
  registers: [registry],
});

export const llmCallsTotal = new client.Counter({
  name: `${PREFIX}llm_calls_total`,
  help: 'Total de chamadas ao LLM.',
  labelNames: ['provider', 'feature', 'status'], // status: ok|fallback|error
  registers: [registry],
});

export const llmCallDurationSeconds = new client.Histogram({
  name: `${PREFIX}llm_call_duration_seconds`,
  help: 'Duração de chamadas LLM.',
  labelNames: ['provider', 'feature'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [registry],
});

// ─── GEHC ───────────────────────────────────────────────────────────────────
export const gehcAuthStatus = new client.Gauge({
  name: `${PREFIX}gehc_auth_status`,
  help: 'Status de autenticação GEHC por tenant (1=ok, 0=falha, -1=desconhecido).',
  labelNames: ['tenant'],
  registers: [registry],
});

export const gehcDocumentDownloadsTotal = new client.Counter({
  name: `${PREFIX}gehc_document_downloads_total`,
  help: 'Total de PDFs GEHC baixados.',
  labelNames: ['tenant', 'source', 'result'], // source: 101|102, result: ok|fail
  registers: [registry],
});

// ─── Helpers públicos ───────────────────────────────────────────────────────
export function observeLlmCall({
  provider,
  model,
  feature,
  status,
  durationSeconds,
  promptTokens = 0,
  completionTokens = 0,
}) {
  llmCallsTotal.inc({ provider, feature, status });
  if (typeof durationSeconds === 'number') {
    llmCallDurationSeconds.observe({ provider, feature }, durationSeconds);
  }
  if (promptTokens > 0) {
    llmTokensTotal.inc({ provider, model, feature, kind: 'prompt' }, promptTokens);
  }
  if (completionTokens > 0) {
    llmTokensTotal.inc({ provider, model, feature, kind: 'completion' }, completionTokens);
  }
}

export function observeGehcAuth(tenantId, ok) {
  gehcAuthStatus.set({ tenant: tenantId }, ok ? 1 : 0);
}

export function observeGehcDownload({ tenantId, source, ok }) {
  gehcDocumentDownloadsTotal.inc({
    tenant: tenantId || 'unknown',
    source: String(source || 'unknown'),
    result: ok ? 'ok' : 'fail',
  });
}

export function observeJobDuration(queue, name, durationSeconds) {
  jobDurationSeconds.observe({ queue, name }, durationSeconds);
}

export function observeJobFailure(queue, name, reason) {
  jobFailuresTotal.inc({
    queue,
    name,
    reason: String(reason || 'unknown').slice(0, 64),
  });
}

export function setQueueDepth(queue, counts) {
  // counts: { waiting, active, delayed, failed, completed }
  for (const [state, value] of Object.entries(counts || {})) {
    queueDepth.set({ queue, state }, Number(value) || 0);
  }
}

// ─── Snapshot pro painel admin (JSON) ───────────────────────────────────────
// Lê valores correntes do registry e devolve estrutura amigável pro frontend.
// Não substitui o /metrics — é só uma view conveniente.
export async function snapshotSaude() {
  const metrics = await registry.getMetricsAsJSON();
  const byName = Object.fromEntries(metrics.map((m) => [m.name, m]));

  const httpTotal = sumCounter(byName[`${PREFIX}http_requests_total`]);
  const llmCalls = sumCounter(byName[`${PREFIX}llm_calls_total`]);
  const llmTokens = sumCounter(byName[`${PREFIX}llm_tokens_total`]);

  const queues = groupGauge(byName[`${PREFIX}queue_depth`], 'queue', 'state');
  const gehcAuth = groupGauge(byName[`${PREFIX}gehc_auth_status`], 'tenant');
  const llmCallsByStatus = groupCounter(byName[`${PREFIX}llm_calls_total`], 'status');
  const llmTokensByProvider = groupCounter(
    byName[`${PREFIX}llm_tokens_total`],
    'provider'
  );

  return {
    geradoEm: new Date().toISOString(),
    http: {
      totalRequests: httpTotal,
      // Latência p95 não é trivial extrair sem agregação real; ficamos
      // só com counters por enquanto. Para p95 o consumidor canônico é
      // o /metrics + Grafana.
    },
    filas: queues,
    llm: {
      totalCalls: llmCalls,
      totalTokens: llmTokens,
      callsByStatus: llmCallsByStatus,
      tokensByProvider: llmTokensByProvider,
    },
    gehc: {
      authPorTenant: gehcAuth,
      downloadsTotal: sumCounter(byName[`${PREFIX}gehc_document_downloads_total`]),
    },
  };
}

function sumCounter(metric) {
  if (!metric?.values) return 0;
  return metric.values.reduce((acc, v) => acc + (Number(v.value) || 0), 0);
}

function groupCounter(metric, byLabel) {
  if (!metric?.values) return {};
  return metric.values.reduce((acc, v) => {
    const key = v.labels?.[byLabel] || 'unknown';
    acc[key] = (acc[key] || 0) + (Number(v.value) || 0);
    return acc;
  }, {});
}

function groupGauge(metric, primary, secondary = null) {
  if (!metric?.values) return secondary ? {} : {};
  if (!secondary) {
    return metric.values.reduce((acc, v) => {
      const key = v.labels?.[primary] || 'unknown';
      acc[key] = Number(v.value) || 0;
      return acc;
    }, {});
  }
  return metric.values.reduce((acc, v) => {
    const p = v.labels?.[primary] || 'unknown';
    const s = v.labels?.[secondary] || 'unknown';
    acc[p] = acc[p] || {};
    acc[p][s] = Number(v.value) || 0;
    return acc;
  }, {});
}
