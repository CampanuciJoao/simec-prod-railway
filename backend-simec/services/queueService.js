import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
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

/**
 * Inicializa jobs recorrentes
 */
export async function iniciarJobsDeAlertas() {
  try {
    console.log('🧠 Inicializando jobs de alertas...');

    // Remove job antigo recorrente, se existir
    const repeatables = await alertasQueue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.name === 'processar-alertas-recorrente') {
        await alertasQueue.removeRepeatableByKey(job.key);
      }
    }

    // Recria job recorrente estável
    await alertasQueue.add(
      'processar-alertas-recorrente',
      {},
      {
        jobId: 'processar-alertas-recorrente',
        repeat: {
          every: 60000, // 1 minuto
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    // Dispara um ciclo imediato no boot
    await alertasQueue.add(
      'processar-alertas-imediato',
      {},
      {
        jobId: `processar-alertas-imediato-${Date.now()}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

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