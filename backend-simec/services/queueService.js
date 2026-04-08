// Ficheiro: simec/backend-simec/services/queueService.js
// VERSÃO PROFISSIONAL COM REDIS DO RAILWAY

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processarAlertasEEnviarNotificacoes } from './alertasService.js';
import dotenv from 'dotenv'; // IMPORTANTE: Para ler as variáveis de ambiente

// Carrega as variáveis (como o REDIS_URL) do arquivo .env
dotenv.config();

// Pega a URL do Redis fornecida pelo Railway (ou usa o local se não achar)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log("======================================================");
console.log(`📦 Conectando ao Redis: ${redisUrl.substring(0, 15)}...`);
console.log("======================================================");

// Cria a conexão obrigatória para o BullMQ usando a URL correta
const connection = new IORedis(redisUrl, { 
    maxRetriesPerRequest: null 
});

// Tratamento de erro direto na conexão para evitar que o servidor caia
connection.on('error', (err) => {
    console.error('❌ Erro de conexão com o Redis:', err.message);
});

// Cria a fila (agora usando o nome 'alertas-fila' que você definiu)
export const alertasQueue = new Queue('alertas-fila', { connection });

// Cria o trabalhador (o assistente que executa as tarefas)
const worker = new Worker('alertas-fila', async (job) => {
    if (job.name === 'verificar-tarefas-diarias') {
        console.log(`[QUEUE] Executando verificação e envio de e-mails em segundo plano...`);
        await processarAlertasEEnviarNotificacoes();
    }
}, { 
    connection,
    // Limite: executa no máximo 1 tarefa a cada 5 segundos (evita bloqueio do Gmail e sobrecarga)
    limiter: { max: 1, duration: 5000 } 
});

// Avisos de sucesso e falha do Worker
worker.on('completed', (job) => {
    console.log(`✅ Fila processada em tempo real.`);
});

worker.on('failed', (job, err) => {
    console.error(`[QUEUE] Erro no job:`, err.message);
});