import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { getRedisConnectionOptions } from './redis/redisConnectionOptions.js';
import prisma from './prismaService.js';

dotenv.config();

let connection = null;
let alertasQueue = null;
let queueUnavailable = false;
let queueUnavailableReason = null;
let queueErrorLogged = false;

function markQueueUnavailable(reason) {
  queueUnavailable = true;
  queueUnavailableReason = reason || 'redis_unavailable';
}

function getConnection() {
  if (queueUnavailable) {
    return null;
  }

  if (connection) {
    return connection;
  }

  connection = new IORedis({
    ...getRedisConnectionOptions(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  connection.on('connect', () => {
    console.log('Redis (queue) conectado com sucesso.');
  });

  connection.on('error', (err) => {
    if (!queueErrorLogged) {
      console.error('Erro Redis (queue):', err.message);
      queueErrorLogged = true;
    }

    if (err?.message?.includes('WRONGPASS')) {
      markQueueUnavailable('redis_wrongpass');
    }
  });

  return connection;
}

function getAlertasQueue() {
  if (queueUnavailable) {
    return null;
  }

  if (alertasQueue) {
    return alertasQueue;
  }

  const activeConnection = getConnection();
  if (!activeConnection) {
    return null;
  }

  alertasQueue = new Queue('alertas-fila', {
    connection: activeConnection,
  });

  return alertasQueue;
}

async function logQueueState(prefix = 'QUEUE_STATE') {
  try {
    const queue = getAlertasQueue();
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    console.log(`[${prefix}]`, counts);

    const repeatables = await queue.getRepeatableJobs();
    console.log(
      `[${prefix}] repeatables=${repeatables.length}`,
      repeatables.map((job) => ({
        name: job.name,
        key: job.key,
        every: job.every,
        next: job.next,
      }))
    );
  } catch (error) {
    console.error(`[${prefix}] Erro ao inspecionar fila:`, error.message);
  }
}

export async function iniciarJobsDeAlertas() {
  try {
    const queue = getAlertasQueue();
    if (!queue) {
      console.warn(
        `[QUEUE_DISABLED] Jobs de alertas nao iniciados (${queueUnavailableReason || 'redis_indisponivel'}).`
      );
      return false;
    }

    await queue.waitUntilReady();

    const repeatables = await queue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.name === 'processar-alertas-recorrente' || job.name === 'telegram-drenar-pendencias') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'processar-alertas-recorrente',
      {},
      {
        jobId: 'processar-alertas-recorrente',
        repeat: {
          every: 60000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    // Drenagem dedicada do Telegram (a cada 1min). Garante que alertas
    // pendentes nao fiquem represados em tenants "sem mudanca" entre
    // rodadas do orchestrator.
    await queue.add(
      'telegram-drenar-pendencias',
      {},
      {
        jobId: 'telegram-drenar-pendencias',
        repeat: { every: 60000 },
        removeOnComplete: 20,
        removeOnFail: 20,
      }
    );

    await queue.add(
      'processar-alertas-imediato',
      {},
      {
        jobId: `processar-alertas-imediato-${Date.now()}`,
        removeOnComplete: 50,
        removeOnFail: 50,
      }
    );

    // Job diário de limpeza de dados antigos (03:00 UTC)
    const repeatables2 = await queue.getRepeatableJobs();
    for (const job of repeatables2) {
      if (job.name === 'cleanup-retencao-dados') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'cleanup-retencao-dados',
      {},
      {
        jobId: 'cleanup-retencao-dados',
        repeat: { cron: '0 3 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    // Job GEHC: monitoramento de saúde das RMs GE a cada 15min
    const repeatables3 = await queue.getRepeatableJobs();
    for (const job of repeatables3) {
      if (job.name === 'gehc-monitorar-saude') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'gehc-monitorar-saude',
      {},
      {
        // Portal GE atualiza dados de saude (helio, pressao, compressor) a
        // cada ~2h. Polling mais frequente nao traz dado novo — gera carga
        // sem ganho. Ajustado de 30min para 2h.
        repeat: { every: 2 * 60 * 60 * 1000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    );

    // Captura imediata no startup — só dispara se o último snapshot tem mais
    // de 90min (~1h30). Ajustado pra acompanhar o cron de 2h: redeploys
    // frequentes nao geram captura redundante quando ja tem snapshot recente.
    const STARTUP_THRESHOLD_MS = 90 * 60 * 1000;
    const ultimoSnapshot = await prisma.gehcSaudeSnapshot.findFirst({
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    }).catch(() => null);
    const precisaCapturar = !ultimoSnapshot || (Date.now() - ultimoSnapshot.capturedAt.getTime() > STARTUP_THRESHOLD_MS);
    if (precisaCapturar) {
      await queue.add(
        'gehc-monitorar-saude',
        {},
        {
          jobId: `gehc-monitorar-saude-startup-${Date.now()}`,
          removeOnComplete: 5,
          removeOnFail: 5,
        }
      );
    }

    console.log('[QUEUE] Job GEHC (gehc-monitorar-saude) agendado a cada 2h + captura imediata no startup se snapshot >90min.');

    // Sync completo de contratos, OS e utilização — uma vez por dia às 02:00 UTC
    const repeatables4 = await queue.getRepeatableJobs();
    for (const job of repeatables4) {
      if (job.name === 'gehc-sync-dados') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'gehc-sync-dados',
      {},
      {
        repeat: { cron: '0 2 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job GEHC (gehc-sync-dados) agendado diariamente às 02:00 UTC.');

    // Discovery automático diário — detecta RMs novas no portal GE sem precisar
    // de clique do admin. Roda às 02:30 UTC, depois do gehc-sync-dados.
    // Ver ADR-016 (automacao da integracao GE).
    const repeatables5 = await queue.getRepeatableJobs();
    for (const job of repeatables5) {
      if (job.name === 'gehc-discovery-diario') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'gehc-discovery-diario',
      {},
      {
        repeat: { cron: '30 2 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job GEHC (gehc-discovery-diario) agendado diariamente às 02:30 UTC.');

    // Captura de PDFs de OS GE para alimentar a IA preditiva — a cada 3h.
    // Roda DEPOIS do gehc-sync-dados (02:00) para que as OSs novas já estejam
    // persistidas; baixa os PDFs delas via Playwright e armazena no R2.
    // Resumível: cada execução pega até 50 OSs sem PDF por tenant. Backfill
    // histórico de uma base nova de equipamentos completa em poucos dias
    // com a cadencia de 8 ciclos/dia.
    const repeatables6 = await queue.getRepeatableJobs();
    for (const job of repeatables6) {
      if (job.name === 'gehc-capturar-pdfs') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'gehc-capturar-pdfs',
      {},
      {
        // A cada 3h (00, 03, 06, 09, 12, 15, 18, 21 UTC). 8 ciclos/dia ×
        // até 50 PDFs/ciclo = teto de 400 PDFs/dia. Backfill historico
        // completa em ~1/4 do tempo do agendamento antigo (2x/dia).
        repeat: { cron: '0 */3 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job GEHC (gehc-capturar-pdfs) agendado a cada 3h (00, 03, 06, 09, 12, 15, 18, 21 UTC).');

    // Extracao de causa-raiz / medicoes a partir dos PDFs ja baixados.
    // Roda diariamente as 05:00 UTC, 1h depois da captura, para que os PDFs
    // novos da noite ja estejam no R2 prontos pra extrair.
    // Reprocessamento automatico: PDFs ja extraidos com extractorVersion
    // antigo entram na fila ao subir uma versao nova do extrator.
    const repeatables7 = await queue.getRepeatableJobs();
    for (const job of repeatables7) {
      if (job.name === 'gehc-extrair-pdfs') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'gehc-extrair-pdfs',
      {},
      {
        repeat: { cron: '0 5 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job GEHC (gehc-extrair-pdfs) agendado diariamente às 05:00 UTC.');

    // Knowledge Layer: consolida eventos de 5 fontes diferentes em uma
    // timeline unica por equipamento. Roda hora em hora — barato, so leitura
    // + upsert idempotente. Mantem a memoria da IA fresca o dia todo.
    const repeatables8 = await queue.getRepeatableJobs();
    for (const job of repeatables8) {
      if (job.name === 'knowledge-layer-sync') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'knowledge-layer-sync',
      {},
      {
        repeat: { every: 60 * 60 * 1000 },
        removeOnComplete: 24,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job KL (knowledge-layer-sync) agendado a cada 1h.');

    // IA: gera embeddings dos eventos novos do Knowledge Layer.
    // Roda 1x por dia as 06:00 UTC, 1h depois do gehc-extrair-pdfs e
    // suficientemente longe de horario de pico do tenant. Custo: ~$0.01/dia
    // mesmo para parques grandes de equipamentos.
    const repeatables9 = await queue.getRepeatableJobs();
    for (const job of repeatables9) {
      if (job.name === 'ia-gerar-embeddings') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'ia-gerar-embeddings',
      {},
      {
        repeat: { cron: '0 6 * * *' },
        removeOnComplete: 10,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job IA (ia-gerar-embeddings) agendado diariamente às 06:00 UTC.');

    // IA: gera insights preditivos com base nos eventos do Knowledge Layer.
    // 5 detectores rodando: reincidencia, anomalia helio, risco alto, sem PM,
    // acionamento frequente de terceiro. Roda 4x ao dia para manter o painel
    // fresco (custo zero — so leitura + upsert).
    const repeatables10 = await queue.getRepeatableJobs();
    for (const job of repeatables10) {
      if (job.name === 'ia-gerar-insights') {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    await queue.add(
      'ia-gerar-insights',
      {},
      {
        repeat: { every: 6 * 60 * 60 * 1000 },
        removeOnComplete: 8,
        removeOnFail: 10,
      }
    );

    console.log('[QUEUE] Job IA (ia-gerar-insights) agendado a cada 6h.');

    await logQueueState('QUEUE_AFTER_INIT');
    return true;
  } catch (error) {
    markQueueUnavailable(error?.message || 'queue_init_failed');
    console.error('Erro ao iniciar jobs:', error.message || error);
    return false;
  }
}

export async function encerrarQueueDeAlertas() {
  try {
    if (alertasQueue) {
      await alertasQueue.close();
      alertasQueue = null;
    }

    if (connection) {
      await connection.quit();
      connection = null;
    }
  } catch (error) {
    console.error('Erro ao encerrar queue:', error);
  }
}

export async function enfileirarReprocessamentoAlertasDoTenant(
  tenantId,
  motivo = 'manutencao_atualizada'
) {
  if (!tenantId) return null;

  const queue = getAlertasQueue();
  if (!queue) {
    return null;
  }

  return queue.add(
    'reprocessar-alertas-tenant',
    {
      tenantId,
      motivo,
    },
    {
      jobId: `reprocessar-alertas-tenant-${tenantId}-${motivo}`,
      removeOnComplete: 50,
      removeOnFail: 50,
    }
  );
}
