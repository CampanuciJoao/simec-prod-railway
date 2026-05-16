// simec/backend-simec/services/prismaService.js
// VERSÃO ATUALIZADA - COM INICIALIZAÇÃO EXPLÍCITA DA URL

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv'; // Importa a biblioteca dotenv

// Garante que as variáveis de ambiente sejam carregadas o mais cedo possível
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

// LOG DE DEPURAÇÃO CRÍTICO: Verifica a URL no momento da criação do client
console.log('[PrismaService] Inicializando Prisma Client com a URL:', databaseUrl);
if (!databaseUrl) {
    console.error("ERRO CRÍTICO: A variável de ambiente DATABASE_URL não foi encontrada em prismaService.js. Verifique seu ficheiro .env e a inicialização do dotenv.");
}

// Limita o pool de conexões por instância do PrismaClient (server + worker
// rodam em containers separados no Railway e cada um abre seu pool). Sem
// isto, num_cpus*2+1 pode estourar o limite do Postgres do Railway quando
// pipelines IA + cron jobs concorrentes rodam ao mesmo tempo.
// PRISMA_CONNECTION_LIMIT controla via env, default 5 por instância.
function applyPoolLimits(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const limit = process.env.PRISMA_CONNECTION_LIMIT || '5';
    const timeout = process.env.PRISMA_POOL_TIMEOUT_S || '20';
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', String(limit));
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', String(timeout));
    }
    return u.toString();
  } catch {
    // URL invalida — devolve original e deixa o Prisma reclamar.
    return url;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: applyPoolLimits(databaseUrl),
    },
  },
});

export default prisma;