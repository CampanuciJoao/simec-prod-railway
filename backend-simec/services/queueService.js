import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { executarCicloInteligente } from './intelligenceOrchestratorService.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log('======================================================');
console.log(`📦 Conectando ao Redis: ${redisUrl.substring(0, 15)}...`);
console.log('======================================================');

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

connection.on('error', (err) => {
  console.error('❌ Erro de conexão com o Redis:', err.message);
});

export const alertasQueue = new Queue('alertas-fila', { connection });

const worker = new Worker(
  'alertas-fila',
  async (job) => {
    if (job.name === 'ciclo-inteligente-simec') {
      console.log('[QUEUE] Executando ciclo inteligente do SIMEC...');
      await executarCicloInteligente();
    }
  },
  {
    connection,
    limiter: { max: 1, duration: 5000 }
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job concluído: ${job?.name || 'desconhecido'}`);
});

worker.on('failed', (job, err) => {
  console.error(`[QUEUE] Erro no job ${job?.name || 'desconhecido'}:`, err.message);
});