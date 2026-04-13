import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processarAlertasEEnviarNotificacoes } from './services/alertas/alertasOrchestrator.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

console.log('======================================================');
console.log('🚀 WORKER DO SIMEC INICIADO');
console.log(`📦 Redis: ${redisUrl.substring(0, 25)}...`);
console.log('======================================================');

const worker = new Worker(
  'alertas-fila',
  async (job) => {
    console.log(
      `[${new Date().toLocaleTimeString('pt-BR')}] ⚙️ Executando ciclo de alertas...`
    );

    await processarAlertasEEnviarNotificacoes();
  },
  {
    connection,
    limiter: { max: 1, duration: 5000 }, // evita duplicidade
  }
);

worker.on('completed', () => {
  console.log('✅ Ciclo finalizado');
});

worker.on('failed', (job, err) => {
  console.error('❌ Erro no worker:', err.message);
});

connection.on('error', (err) => {
  console.error('❌ Redis worker erro:', err.message);
});