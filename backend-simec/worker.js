import { Worker, QueueEvents, Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processarAlertasEEnviarNotificacoes } from './services/alertas/alertasOrchestrator.js';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const inspectionConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

console.log('======================================================');
console.log('🚀 WORKER DO SIMEC INICIADO');
console.log(`📦 Redis: ${redisUrl.substring(0, 35)}...`);
console.log('======================================================');

const alertasQueue = new Queue('alertas-fila', {
  connection: inspectionConnection,
});

const queueEvents = new QueueEvents('alertas-fila', {
  connection,
});

async function logQueueState(prefix = 'WORKER_QUEUE_STATE') {
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
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}

const worker = new Worker(
  'alertas-fila',
  async (job) => {
    const inicio = Date.now();

    console.log(
      `[${new Date().toLocaleTimeString('pt-BR')}] ⚙️ Executando ciclo de alertas... jobName=${job?.name || 'N/A'} | jobId=${job?.id || 'N/A'}`
    );

    const resultado = await processarAlertasEEnviarNotificacoes();

    const duracaoMs = Date.now() - inicio;

    console.log(
      `[WORKER] Ciclo concluído em ${duracaoMs}ms | ok=${resultado.ok} | manutencoes=${resultado.manutencoes} | seguros=${resultado.seguros} | contratos=${resultado.contratos || 0} | recomendacoes=${resultado.recomendacoes}`
    );

    return resultado;
  },
  {
    connection,
    concurrency: 1,
    autorun: true,
    limiter: { max: 1, duration: 5000 },
  }
);

worker.on('ready', async () => {
  console.log('✅ Worker pronto para consumir a fila de alertas.');
  await logQueueState('WORKER_READY_STATE');
});

worker.on('active', (job) => {
  console.log(
    `🟢 Job ativo | nome=${job?.name || 'N/A'} | id=${job?.id || 'N/A'}`
  );
});

worker.on('completed', (job, result) => {
  console.log(
    `✅ Job concluído | nome=${job?.name || 'N/A'} | id=${job?.id || 'N/A'} | ok=${result?.ok ?? 'N/A'}`
  );
});

worker.on('failed', (job, err) => {
  console.error(
    `❌ Erro no worker | jobName=${job?.name || 'N/A'} | jobId=${job?.id || 'N/A'} | erro=${err.message}`
  );
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err.message);
});

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`📥 Job entrou em waiting | jobId=${jobId}`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`⚡ Job entrou em active | jobId=${jobId} | prev=${prev}`);
});

queueEvents.on('completed', ({ jobId }) => {
  console.log(`🏁 Job completed event | jobId=${jobId}`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`🧨 Job failed event | jobId=${jobId} | motivo=${failedReason}`);
});

queueEvents.on('delayed', ({ jobId, delay }) => {
  console.log(`⏳ Job delayed | jobId=${jobId} | delay=${delay}`);
});

connection.on('connect', () => {
  console.log('✅ Redis worker conectado com sucesso.');
});

connection.on('error', (err) => {
  console.error('❌ Redis worker erro:', err.message);
});

async function shutdown(signal) {
  console.log(`\n[WORKER] Recebido ${signal}. Encerrando com segurança...`);

  try {
    await worker.close();
    await queueEvents.close();
    await alertasQueue.close();
    await connection.quit();
    await inspectionConnection.quit();
    console.log('[WORKER] Encerrado com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Erro ao encerrar:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));