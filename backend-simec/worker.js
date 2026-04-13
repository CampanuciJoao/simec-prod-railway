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
    const inicio = Date.now();

    console.log(
      `[${new Date().toLocaleTimeString('pt-BR')}] ⚙️ Executando ciclo de alertas... jobId=${job?.id || 'N/A'}`
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
    limiter: { max: 1, duration: 5000 },
  }
);

worker.on('completed', (job, result) => {
  console.log(
    `✅ Job concluído | id=${job?.id || 'N/A'} | ok=${result?.ok ?? 'N/A'}`
  );
});

worker.on('failed', (job, err) => {
  console.error(
    `❌ Erro no worker | jobId=${job?.id || 'N/A'} | erro=${err.message}`
  );
});

connection.on('error', (err) => {
  console.error('❌ Redis worker erro:', err.message);
});

async function shutdown(signal) {
  console.log(`\n[WORKER] Recebido ${signal}. Encerrando com segurança...`);

  try {
    await worker.close();
    await connection.quit();
    console.log('[WORKER] Encerrado com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Erro ao encerrar:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));