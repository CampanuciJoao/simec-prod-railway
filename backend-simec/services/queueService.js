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

    // 🔥 REMOVE jobs antigos (evita duplicação)
    await alertasQueue.obliterate({ force: true });

    await alertasQueue.add(
      'verificar-tarefas-diarias',
      {},
      {
        repeat: {
          every: 60000, // roda a cada 1 minuto
          immediately: true,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    console.log('⏱️ Job recorrente configurado (1 minuto)');
  } catch (error) {
    console.error('❌ Erro ao iniciar jobs:', error);
  }
}