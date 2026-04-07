// Ficheiro: simec/backend-simec/worker.js
import { Worker } from 'bullmq';
import { processarAlertasEEnviarNotificacoes } from './services/alertasService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log("======================================================");
console.log("🚀 COZINHEIRO (WORKER) DO SIMEC INICIADO");
console.log("📦 Monitorando a fila de manutenções...");
console.log("======================================================");

// O Worker fica vigiando a fila 'alertas-queue' (o mesmo nome que está no seu queueService)
const worker = new Worker('alertas-queue', async (job) => {
  if (job.name === 'verificar-tarefas-diarias') {
    console.log(`[${new Date().toLocaleTimeString()}] ⚙️ Processando verificação de manutenções...`);
    await processarAlertasEEnviarNotificacoes();
  }
}, {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
  }
});

worker.on('completed', (job) => {
  console.log(`✅ Ciclo finalizado com sucesso.`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Erro ao processar manutenção: ${err.message}`);
});