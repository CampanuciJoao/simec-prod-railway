import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
});

connection.on('connect', () => {
  console.log('✅ Redis (queue) conectado com sucesso.');
});

connection.on('error', (err) => {
  console.error('❌ Erro Redis (queue):', err.message);
});

/**
 * Fila principal de alertas
 */
export const alertasQueue = new Queue('alertas-fila', {
  connection,
});

console.log('📦 Queue de alertas inicializada');

async function logQueueState(prefix = 'QUEUE_STATE') {
  try {
    const counts = await alertasQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    console.log(`[${prefix}]`, counts);

    const repeatables = await alertasQueue.getRepeatableJobs();
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

/**
 * Inicializa jobs recorrentes
 */
export async function iniciarJobsDeAlertas() {
  try {
    console.log('🧠 Inicializando jobs de alertas...');

    await alertasQueue.waitUntilReady();

    // Limpa job recorrente antigo com mesmo nome
    const repeatables = await alertasQueue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.name === 'processar-alertas-recorrente') {
        await alertasQueue.removeRepeatableByKey(job.key);
        console.log(`♻️ Repeatable antigo removido: ${job.key}`);
      }
    }

    // Recria o job recorrente
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

    // Job imediato no boot
    const job = await alertasQueue.add(
      'processar-alertas-imediato',
      {},
      {
        jobId: `processar-alertas-imediato-${Date.now()}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    console.log(
      `🚀 Job imediato criado | id=${job.id} | name=${job.name}`
    );

    await logQueueState('QUEUE_AFTER_INIT');

    console.log('⏱️ Job recorrente configurado (1 minuto) + execução imediata');
  } catch (error) {
    console.error('❌ Erro ao iniciar jobs:', error);
    throw error;
  }
}

/**
 * Encerramento opcional da fila/conexão
 */
export async function encerrarQueueDeAlertas() {
  try {
    await alertasQueue.close();
    await connection.quit();
    console.log('🛑 Queue de alertas encerrada com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao encerrar queue:', error);
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
