// Disparador manual de jobs dos pipelines da IA. Permite ao admin acelerar
// uma execucao sem esperar o cron (util para validacao, manutencao e debug).
// O cron continua rodando normalmente — isso e SOMA, nao SUBSTITUICAO.
//
// Cada pipeline tem 1 job correspondente no BullMQ. Mapeamento:
//   gehc_captura_pdf  -> gehc-capturar-pdfs
//   gehc_extracao_pdf -> gehc-extrair-pdfs
//   knowledge_layer   -> knowledge-layer-sync
//   ia_embeddings     -> ia-gerar-embeddings
//   ia_insights       -> ia-gerar-insights
//
// Pipeline 'global' nao dispara nada — e so kill switch.

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getRedisConnectionOptions } from '../redis/redisConnectionOptions.js';
import { PIPELINE_NAMES } from './aiPipelineState.js';

const PIPELINE_PARA_JOB = {
  [PIPELINE_NAMES.GEHC_CAPTURA_PDF]:  'gehc-capturar-pdfs',
  [PIPELINE_NAMES.GEHC_EXTRACAO_PDF]: 'gehc-extrair-pdfs',
  [PIPELINE_NAMES.KNOWLEDGE_LAYER]:   'knowledge-layer-sync',
  [PIPELINE_NAMES.IA_EMBEDDINGS]:     'ia-gerar-embeddings',
  [PIPELINE_NAMES.IA_INSIGHTS]:       'ia-gerar-insights',
};

let queue = null;

function getQueue() {
  if (queue) return queue;

  const connection = new IORedis({
    ...getRedisConnectionOptions(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  queue = new Queue('alertas-fila', { connection });
  return queue;
}

/**
 * Enfileira um job avulso (nao-recorrente) para o pipeline informado.
 * Retorna { ok: true, jobId } ou { ok: false, motivo }.
 */
export async function dispararPipeline(pipeline) {
  const jobName = PIPELINE_PARA_JOB[pipeline];
  if (!jobName) {
    return { ok: false, motivo: `pipeline_sem_job: ${pipeline}` };
  }

  try {
    const q = getQueue();
    const job = await q.add(
      jobName,
      { source: 'manual_admin', dispatchedAt: new Date().toISOString() },
      {
        jobId: `${jobName}-manual-${Date.now()}`,
        removeOnComplete: 5,
        removeOnFail: 5,
      }
    );
    return { ok: true, jobId: job.id, jobName };
  } catch (err) {
    return { ok: false, motivo: `enqueue_failed: ${err.message}` };
  }
}

export const PIPELINE_PARA_JOB_EXPORT = PIPELINE_PARA_JOB;
