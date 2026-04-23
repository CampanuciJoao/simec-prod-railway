import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { getRedisConnectionOptions } from './redis/redisConnectionOptions.js';

dotenv.config();

let connection = null;
let alertasQueue = null;

function getConnection() {
  if (connection) {
    return connection;
  }

  connection = new IORedis({
    ...getRedisConnectionOptions(),
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

  return connection;
}

function getAlertasQueue() {
  if (alertasQueue) {
    return alertasQueue;
  }

  alertasQueue = new Queue('alertas-fila', {
    connection: getConnection(),
  });

  return alertasQueue;
}

async function logQueueState(prefix = 'QUEUE_STATE') {
  try {
    const queue = getAlertasQueue();
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    console.log(`[${prefix}]`, counts);

    const repeatables = await queue.getRepeatableJobs();
    console.log(
      `[${prefix}] repeatables=${repeatables.length}`,
      repeatables.map((job) => ({
        name: job.name,
        key: job.key,
        every: job.every,
        next: job.next,
      }))
    );
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}

export async function iniciarJobsDeAlertas() {
  try {
    const queue = getAlertasQueue();
    await queue.waitUntilReady();

    const repeatables = await queue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.name === 'processar-alertas-recorrente') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
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

    await queue.add(
      'processar-alertas-imediato',
      {},
      {
        jobId: `processar-alertas-imediato-${Date.now()}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    await logQueueState('QUEUE_AFTER_INIT');
  } catch (error) {
    console.error('Erro ao iniciar jobs:', error);
    throw error;
  }
}

export async function encerrarQueueDeAlertas() {
  try {
    if (alertasQueue) {
      await alertasQueue.close();
      alertasQueue = null;
    }

    if (connection) {
      await connection.quit();
      connection = null;
    }
  } catch (error) {
    console.error('Erro ao encerrar queue:', error);
  }
}

export async function enfileirarReprocessamentoAlertasDoTenant(
  tenantId,
  motivo = 'manutencao_atualizada'
) {
  if (!tenantId) return null;

  return getAlertasQueue().add(
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
