// Diagnóstico do atraso do cron gehc-monitorar-saude.
// 1. Distribuição de snapshots por hora hoje + ontem (vê se cron ficou parado)
// 2. Estado dos jobs BullMQ na fila alertas-fila (waiting/delayed/failed)
// 3. Próxima execução agendada do repeatable

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const prisma = new PrismaClient();

async function inspecionarFila() {
  if (!process.env.REDIS_URL) {
    console.log('\n[BullMQ] REDIS_URL não setado no shell — pulando inspeção da fila.');
    return;
  }
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('alertas-fila', { connection });

  const counts = await queue.getJobCounts(
    'waiting', 'active', 'delayed', 'completed', 'failed', 'paused'
  );
  console.log('\n[BullMQ counts atual]');
  console.log(JSON.stringify(counts, null, 2));

  const repeatables = await queue.getRepeatableJobs();
  const gehc = repeatables.find((r) => r.name === 'gehc-monitorar-saude');
  console.log('\n[gehc-monitorar-saude repeatable]');
  console.log(JSON.stringify(gehc, null, 2));

  const failed = await queue.getJobs(['failed'], 0, 20);
  console.log('\n[ultimos jobs FAILED]');
  failed.forEach((j) => {
    console.log(`  - id=${j.id} name=${j.name} failedReason=${j.failedReason?.slice(0, 200)} timestamp=${new Date(j.timestamp).toISOString()}`);
  });

  const delayed = await queue.getJobs(['delayed'], 0, 20);
  console.log('\n[ultimos jobs DELAYED]');
  delayed.forEach((j) => {
    console.log(`  - id=${j.id} name=${j.name} delay=${j.delay} ts=${new Date(j.timestamp).toISOString()} runAt=${new Date(j.timestamp + (j.delay || 0)).toISOString()}`);
  });

  await queue.close();
  await connection.quit();
}

async function main() {
  console.log('[snapshots por hora - 21/05]');
  const hoje = await prisma.$queryRawUnsafe(`
    SELECT DATE_TRUNC('hour', captured_at) AS hora, COUNT(*)::int AS total
    FROM gehc_saude_snapshots
    WHERE captured_at >= DATE '2026-05-21'
    GROUP BY hora
    ORDER BY hora
  `);
  console.log(JSON.stringify(hoje, null, 2));

  console.log('\n[snapshots por hora - 20/05]');
  const ontem = await prisma.$queryRawUnsafe(`
    SELECT DATE_TRUNC('hour', captured_at) AS hora, COUNT(*)::int AS total
    FROM gehc_saude_snapshots
    WHERE captured_at >= DATE '2026-05-20' AND captured_at < DATE '2026-05-21'
    GROUP BY hora
    ORDER BY hora
  `);
  console.log(JSON.stringify(ontem, null, 2));

  console.log('\n[ultimas 10 capturas - quando foi a mais recente]');
  const ult = await prisma.$queryRawUnsafe(`
    SELECT captured_at, COUNT(*)::int AS qtd
    FROM gehc_saude_snapshots
    GROUP BY captured_at
    ORDER BY captured_at DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(ult, null, 2));

  await inspecionarFila();
}

main().catch(console.error).finally(() => prisma.$disconnect());
