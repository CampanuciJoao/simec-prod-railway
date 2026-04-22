import { Worker, QueueEvents, Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processarAlertasEEnviarNotificacoes } from './services/alertas/alertasOrchestrator.js';
import { processarAlertasManutencaoDoTenant } from './services/alertas/manutencao/index.js';
import { gerarAlertasRecomendacaoDoTenant } from './services/alertas/recomendacao/alertasRecomendacaoService.js';
import prisma from './services/prismaService.js';
import {
  processarColetaPacsTenant,
  processarPurgePacsTenant,
  processarTesteConexaoPacs,
} from './services/pacs/pacsService.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const inspectionConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const alertasQueue = new Queue('alertas-fila', {
  connection: inspectionConnection,
});

const pacsQueue = new Queue('pacs-fila', {
  connection: inspectionConnection,
});

const alertasQueueEvents = new QueueEvents('alertas-fila', {
  connection,
});

const pacsQueueEvents = new QueueEvents('pacs-fila', {
  connection,
});

async function logQueueState(prefix, queue) {
  try {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );
    console.log(`[${prefix}]`, counts);
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}

const alertasWorker = new Worker(
  'alertas-fila',
  async (job) => {
    if (job?.name === 'reprocessar-alertas-tenant' && job?.data?.tenantId) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: job.data.tenantId,
          ativo: true,
        },
        select: {
          id: true,
          timezone: true,
        },
      });

      if (!tenant) {
        return {
          ok: false,
          skipped: true,
          reason: 'tenant_inativo_ou_inexistente',
        };
      }

      const [manutencoes, recomendacoes] = await Promise.all([
        processarAlertasManutencaoDoTenant(tenant.id),
        gerarAlertasRecomendacaoDoTenant(tenant.id, tenant.timezone),
      ]);

      return {
        ok: true,
        total: Number(manutencoes?.total || 0) + Number(recomendacoes?.total || 0),
        manutencoes: Number(manutencoes?.total || 0),
        seguros: 0,
        contratos: 0,
        recomendacoes: Number(recomendacoes?.total || 0),
      };
    }

    return processarAlertasEEnviarNotificacoes();
  },
  {
    connection,
    concurrency: 1,
    autorun: true,
    limiter: { max: 1, duration: 5000 },
  }
);

const pacsWorker = new Worker(
  'pacs-fila',
  async (job) => {
    if (job.name.startsWith('pacs-purgar-tenant') || job.name === 'pacs-purgar-tenant') {
      return processarPurgePacsTenant({
        tenantId: job.data.tenantId,
      });
    }

    if (job.name === 'pacs-testar-conexao') {
      return processarTesteConexaoPacs({
        tenantId: job.data.tenantId,
        connectionId: job.data.connectionId,
        userId: job.data.userId,
      });
    }

    return processarColetaPacsTenant({
      tenantId: job.data.tenantId,
      connectionId: job.data.connectionId || null,
    });
  },
  {
    connection,
    concurrency: 1,
    autorun: true,
    limiter: { max: 1, duration: 1000 },
  }
);

alertasWorker.on('ready', async () => {
  await logQueueState('ALERTAS_WORKER_READY', alertasQueue);
});

pacsWorker.on('ready', async () => {
  await logQueueState('PACS_WORKER_READY', pacsQueue);
});

alertasWorker.on('failed', (job, err) => {
  console.error(`Erro no worker de alertas | job=${job?.name} | erro=${err.message}`);
});

pacsWorker.on('failed', (job, err) => {
  console.error(`Erro no worker de PACS | job=${job?.name} | erro=${err.message}`);
});

alertasQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`alertas failed | jobId=${jobId} | motivo=${failedReason}`);
});

pacsQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`pacs failed | jobId=${jobId} | motivo=${failedReason}`);
});

async function shutdown(signal) {
  console.log(`[WORKER] Recebido ${signal}. Encerrando com seguranca...`);

  try {
    await alertasWorker.close();
    await pacsWorker.close();
    await alertasQueueEvents.close();
    await pacsQueueEvents.close();
    await alertasQueue.close();
    await pacsQueue.close();
    await connection.quit();
    await inspectionConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Erro ao encerrar:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
