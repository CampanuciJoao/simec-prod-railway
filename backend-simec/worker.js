// Ficheiro: simec/backend-simec/worker.js

import { Worker } from 'bullmq';
import IORedis from 'ioredis'; // IMPORTANTE: Lê a URL completa do Redis
import { processarAlertasEEnviarNotificacoes } from './services/alertasService.js';
import dotenv from 'dotenv';

dotenv.config();

// 1. Capta a URL do Redis que o Railway forneceu nas variáveis de ambiente
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 2. Cria a conexão usando IORedis (Obrigatório para BullMQ com URL)
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

console.log("======================================================");
console.log("🚀 COZINHEIRO (WORKER) DO SIMEC INICIADO");
console.log(`📦 Conectado ao Redis em: ${redisUrl.substring(0, 20)}...`);
console.log("======================================================");

// 3. O Worker vigia a fila. 
// IMPORTANTE: O nome aqui ('alertas-fila') TEM QUE SER IGUAL ao que está no seu queueService.js
const worker = new Worker('alertas-fila', async (job) => {
  if (job.name === 'verificar-tarefas-diarias') {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ⚙️ Processando verificação de manutenções...`);
    await processarAlertasEEnviarNotificacoes();
  }
}, {
  connection // Passa a conexão correta do Railway que criamos na linha 11
});

worker.on('completed', (job) => {
  console.log(`✅ Ciclo finalizado com sucesso.`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Erro ao processar manutenção: ${err.message}`);
});