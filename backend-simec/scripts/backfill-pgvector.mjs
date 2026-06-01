#!/usr/bin/env node
// Backfill da coluna embedding_vec a partir do JSON embedding existente.
// Idempotente: roda quantas vezes precisar; processa so quem ainda esta
// NULL. Seguro pra rodar com a aplicacao em producao (UPDATE eh atomico
// por linha, sem lock global).
//
// Uso:
//   DATABASE_URL=... node scripts/backfill-pgvector.mjs
//
// Opcional:
//   BATCH_SIZE=500  (default — quantos por iteracao)
//   MAX_ITER=200    (default — sair apos N iteracoes mesmo com pendentes;
//                    safety net pra evitar loop infinito se algo nao
//                    avancar)
//
// Logs:
//   - cada iteracao: quantos processados / quantos falhas / quanto sobra
//   - sai com codigo 0 quando termina (0 pendentes) ou hit MAX_ITER

import { backfillBatchPgvector } from '../services/ai/pgvectorSearch.js';
import { obterStatusBackfill } from '../services/ai/pgvectorSearch.js';
import prisma from '../services/prismaService.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
const MAX_ITER = parseInt(process.env.MAX_ITER || '200', 10);

async function main() {
  const inicio = Date.now();
  console.log(`[BACKFILL] Inicio. batch=${BATCH_SIZE} max_iter=${MAX_ITER}`);

  const statusInicial = await obterStatusBackfill();
  console.log(`[BACKFILL] Status inicial: ${JSON.stringify(statusInicial)}`);

  if (statusInicial.pendentes === 0) {
    console.log('[BACKFILL] Nada a fazer.');
    await prisma.$disconnect();
    return;
  }

  let totalProcessados = 0;
  let totalFalhas = 0;
  let iteracao = 0;

  while (iteracao < MAX_ITER) {
    iteracao += 1;
    const r = await backfillBatchPgvector({ limite: BATCH_SIZE });
    totalProcessados += r.processados;
    totalFalhas += r.falhas;

    if (r.processados === 0 && r.falhas === 0) {
      console.log(`[BACKFILL] Iteracao ${iteracao} sem nada — encerrando.`);
      break;
    }

    const restante = await obterStatusBackfill();
    console.log(
      `[BACKFILL] iter=${iteracao} proc=${r.processados} falhas=${r.falhas} pendentes=${restante.pendentes} (${restante.progressoPct}%)`
    );

    if (restante.pendentes === 0) {
      console.log('[BACKFILL] 100% concluido.');
      break;
    }
  }

  const statusFinal = await obterStatusBackfill();
  const duracaoSec = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`[BACKFILL] Fim. processados=${totalProcessados} falhas=${totalFalhas} duracao=${duracaoSec}s`);
  console.log(`[BACKFILL] Status final: ${JSON.stringify(statusFinal)}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[BACKFILL] Erro fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
