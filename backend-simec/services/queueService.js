import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { getRedisConnectionOptions } from './redis/redisConnectionOptions.js';

dotenv.config();

let connection = null;
let alertasQueue = null;
let queueUnavailable = false;
let queueUnavailableReason = null;
let queueErrorLogged = false;

function markQueueUnavailable(reason) {
  queueUnavailable = true;
  queueUnavailableReason = reason || 'redis_unavailable';
}

function getConnection() {
  if (queueUnavailable) {
    return null;
  }

  if (connection) {
    return connection;
  }

  connection = new IORedis({
    ...getRedisConnectionOptions(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  connection.on('connect', () => {
    console.log('Redis (queue) conectado com sucesso.');
  });

  connection.on('error', (err) => {
    if (!queueErrorLogged) {
      console.error('Erro Redis (queue):', err.message);
      queueErrorLogged = true;
    }

    if (err?.message?.includes('WRONGPASS')) {
      markQueueUnavailable('redis_wrongpass');
    }
  });

  return connection;
}

function getAlertasQueue() {
  if (queueUnavailable) {
    return null;
  }

  if (alertasQueue) {
    return alertasQueue;
  }

  const activeConnection = getConnection();
  if (!activeConnection) {
    return null;
  }

  alertasQueue = new Queue('alertas-fila', {
    connection: activeConnection,
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
    if (!queue) {
      console.warn(
        `[QUEUE_DISABLED] Jobs de alertas nao iniciados (${queueUnavailableReason || 'redis_indisponivel'}).`
      );
      return false;
    }

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
    return true;
  } catch (error) {
    markQueueUnavailable(error?.message || 'queue_init_failed');
    console.error('Erro ao iniciar jobs:', error.message || error);
    return false;
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

  const queue = getAlertasQueue();
  if (!queue) {
    return null;
  }

  return queue.add(
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
