import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import prisma from './prismaService.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  console.log('Redis (queue) conectado com sucesso.');
});

connection.on('error', (err) => {
  console.error('Erro Redis (queue):', err.message);
});

export const alertasQueue = new Queue('alertas-fila', {
  connection,
});

export const pacsQueue = new Queue('pacs-fila', {
  connection,
});

async function logQueueState(prefix = 'QUEUE_STATE') {
  try {
    const [alertCounts, pacsCounts] = await Promise.all([
      alertasQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
      ),
      pacsQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
      ),
    ]);

    console.log(`[${prefix}] alertas`, alertCounts);
    console.log(`[${prefix}] pacs`, pacsCounts);
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}

export async function iniciarJobsDeAlertas() {
  try {
    await alertasQueue.waitUntilReady();

    const repeatables = await alertasQueue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.name === 'processar-alertas-recorrente') {
        await alertasQueue.removeRepeatableByKey(job.key);
      }
    }

    await alertasQueue.add(
      'processar-alertas-recorrente',
      {},
      {
        jobId: 'processar-alertas-recorrente',
        repeat: {
          every: 60000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    await alertasQueue.add(
      'processar-alertas-imediato',
      {},
      {
        jobId: `processar-alertas-imediato-${Date.now()}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    await logQueueState('ALERTAS_AFTER_INIT');
  } catch (error) {
    console.error('Erro ao iniciar jobs de alertas:', error);
    throw error;
  }
}

async function limparRepeatables(queue, prefix) {
  const repeatables = await queue.getRepeatableJobs();

  for (const job of repeatables) {
    if (job.name.startsWith(prefix)) {
      await queue.removeRepeatableByKey(job.key);
    }
  }
}

export async function iniciarJobsDoPacs() {
  try {
    await pacsQueue.waitUntilReady();
    await limparRepeatables(pacsQueue, 'pacs-');

    const tenants = await prisma.tenant.findMany({
      where: {
        ativo: true,
        pacsConnections: {
          some: {
            ativo: true,
          },
        },
      },
      select: {
        id: true,
      },
    });

    for (const tenant of tenants) {
      await pacsQueue.add(
        `pacs-coletar-tenant-${tenant.id}`,
        {
          tenantId: tenant.id,
        },
        {
          jobId: `pacs-coletar-tenant-${tenant.id}`,
          repeat: {
            every: 6 * 60 * 60 * 1000,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        }
      );

      await pacsQueue.add(
        `pacs-purgar-tenant-${tenant.id}`,
        {
          tenantId: tenant.id,
        },
        {
          jobId: `pacs-purgar-tenant-${tenant.id}`,
          repeat: {
            every: 24 * 60 * 60 * 1000,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        }
      );
    }

    await logQueueState('PACS_AFTER_INIT');
  } catch (error) {
    console.error('Erro ao iniciar jobs PACS:', error);
    throw error;
  }
}

export async function encerrarQueueDeAlertas() {
  try {
    await alertasQueue.close();
    await pacsQueue.close();
    await connection.quit();
  } catch (error) {
    console.error('Erro ao encerrar queue:', error);
  }
}

export async function enfileirarReprocessamentoAlertasDoTenant(
  tenantId,
  motivo = 'manutencao_atualizada'
) {
  if (!tenantId) return null;

  return alertasQueue.add(
    'reprocessar-alertas-tenant',
    {
      tenantId,
      motivo,
    },
    {
      jobId: `reprocessar-alertas-tenant-${tenantId}-${motivo}`,
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
}

export async function enfileirarColetaPacsDoTenant(
  tenantId,
  motivo = 'manual_sync',
  connectionId = null
) {
  if (!tenantId) return null;

  return pacsQueue.add(
    'pacs-coletar-tenant',
    {
      tenantId,
      motivo,
      connectionId,
    },
    {
      jobId: `pacs-coletar-tenant-${tenantId}-${connectionId || 'all'}-${Date.now()}`,
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
}

export async function enfileirarTesteConexaoPacs({
  tenantId,
  connectionId,
  userId,
}) {
  return pacsQueue.add(
    'pacs-testar-conexao',
    {
      tenantId,
      connectionId,
      userId,
    },
    {
      jobId: `pacs-testar-conexao-${tenantId}-${connectionId}-${Date.now()}`,
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
}
