import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processarAlertasEEnviarNotificacoes } from './alertasService.js';

// Conecta ao seu banco Redis (o endereço que o Railway te deu)
const connection = new IORedis(process.env.REDIS_URL, { 
    maxRetriesPerRequest: null 
});

// Cria a fila
export const alertasQueue = new Queue('alertas-fila', { connection });

// Cria o trabalhador (o assistente que executa as tarefas)
const worker = new Worker('alertas-fila', async (job) => {
    console.log(`[QUEUE] Executando envio de e-mails em segundo plano...`);
    await processarAlertasEEnviarNotificacoes();
}, { 
    connection,
    limiter: { max: 1, duration: 5000 } // Limite: envia 1 e-mail a cada 5 segundos (evita bloqueio do Gmail)
});

worker.on('failed', (job, err) => console.error(`[QUEUE] Erro no job:`, err));