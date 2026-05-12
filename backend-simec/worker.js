import { Worker, QueueEvents, Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processarAlertasEEnviarNotificacoes } from './services/alertas/alertasOrchestrator.js';
import { processarAlertasManutencaoDoTenant } from './services/alertas/manutencao/index.js';
import { gerarAlertasRecomendacaoDoTenant } from './services/alertas/recomendacao/alertasRecomendacaoService.js';
import { executarCleanupCompleto } from './services/cleanup/cleanupService.js';
import { monitorarSaudeGehc } from './services/gehc/gehcMonitor.js';
import { sincronizarDadosGehc } from './services/gehc/gehcSyncService.js';
import { descobrirEquipamentosGehc } from './services/gehc/gehcDiscovery.js';
import { temCredenciaisConfiguradas } from './services/gehc/gehcAuthService.js';
import { executarBackfillTodosTenants, executarBackfillPdfs } from './services/gehc/gehcDocumentDownloader.js';
import prisma from './services/prismaService.js';
import { getRedisConnectionOptions } from './services/redis/redisConnectionOptions.js';
import { logQueueState } from './services/redis/queueUtils.js';

dotenv.config();

const redisConnectionOptions = getRedisConnectionOptions();
const connection = new IORedis({
  ...redisConnectionOptions,
  maxRetriesPerRequest: null,
});
const inspectionConnection = new IORedis({
  ...redisConnectionOptions,
  maxRetriesPerRequest: null,
});

const alertasQueue = new Queue('alertas-fila', {
  connection: inspectionConnection,
});

const alertasQueueEvents = new QueueEvents('alertas-fila', {
  connection,
});


const alertasWorker = new Worker(
  'alertas-fila',
  async (job) => {
    if (job?.name === 'reprocessar-alertas-tenant' && job?.data?.tenantId) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          id: job.data.tenantId,
          ativo: true,
        },
        select: {
          id: true,
          timezone: true,
        },
      });

      if (!tenant) {
        return {
          ok: false,
          skipped: true,
          reason: 'tenant_inativo_ou_inexistente',
        };
      }

      const [manutencoes, recomendacoes] = await Promise.all([
        processarAlertasManutencaoDoTenant(tenant.id),
        gerarAlertasRecomendacaoDoTenant(tenant.id, tenant.timezone),
      ]);

      return {
        ok: true,
        total: Number(manutencoes?.total || 0) + Number(recomendacoes?.total || 0),
        manutencoes: Number(manutencoes?.total || 0),
        seguros: 0,
        contratos: 0,
        recomendacoes: Number(recomendacoes?.total || 0),
      };
    }

    if (job?.name === 'cleanup-retencao-dados') {
      const result = await executarCleanupCompleto();
      return { ok: true, ...result };
    }

    if (job?.name === 'gehc-monitorar-saude') {
      const tenants = await prisma.tenant.findMany({
        where: { ativo: true },
        select: { id: true },
      });

      const resultados = [];
      for (const tenant of tenants) {
        try {
          await monitorarSaudeGehc({ tenantId: tenant.id });
          resultados.push({ tenantId: tenant.id, ok: true });
        } catch (err) {
          console.error(`[GEHC_WORKER] Erro tenant ${tenant.id}:`, err.message);
          resultados.push({ tenantId: tenant.id, ok: false, erro: err.message });
        }
      }

      return { ok: true, tenants: resultados.length, resultados };
    }

    if (job?.name === 'gehc-sync-dados') {
      const tenants = await prisma.tenant.findMany({
        where: { ativo: true },
        select: { id: true },
      });

      const resultados = [];
      for (const tenant of tenants) {
        try {
          const r = await sincronizarDadosGehc({ tenantId: tenant.id });
          resultados.push({ tenantId: tenant.id, ok: true, total: r?.total ?? 0 });
        } catch (err) {
          console.error(`[GEHC_SYNC_WORKER] Erro tenant ${tenant.id}:`, err.message);
          resultados.push({ tenantId: tenant.id, ok: false, erro: err.message });
        }
      }

      return { ok: true, tenants: resultados.length, resultados };
    }

    if (job?.name === 'gehc-capturar-pdfs') {
      // Captura noturna de PDFs de OS GE para alimentar a IA preditiva.
      // O downloader internamente respeita o estado de pausa do pipeline
      // (PIPELINE_NAMES.GEHC_CAPTURA_PDF) — se desativado, devolve cedo.
      try {
        const r = await executarBackfillTodosTenants({ diasAtras: 180, limite: 50 });
        return { ok: true, ...r };
      } catch (err) {
        console.error('[GEHC_PDF_WORKER] Erro:', err.message);
        return { ok: false, erro: err.message };
      }
    }

    if (job?.name === 'gehc-capturar-pdfs-tenant' && job?.data?.tenantId) {
      // Trigger pontual usado por endpoint admin ou eventos do sistema.
      // Mantemos opcional ainda que o cron diario cubra o caso geral.
      try {
        const r = await executarBackfillPdfs({
          tenantId: job.data.tenantId,
          diasAtras: job.data.diasAtras || 180,
          limite: job.data.limite || 50,
          modalidades: job.data.modalidades,
        });
        return { ok: true, ...r };
      } catch (err) {
        console.error(`[GEHC_PDF_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
        return { ok: false, erro: err.message };
      }
    }

    if (job?.name === 'gehc-discovery-diario') {
      // Roda discovery apenas para tenants que já tenham credenciais GE
      // configuradas — sem credenciais o discovery falha em capturar tokens
      // e não traz valor. Reduz ruído nos logs.
      const tenants = await prisma.tenant.findMany({
        where: { ativo: true },
        select: { id: true },
      });

      const resultados = [];
      for (const tenant of tenants) {
        try {
          const temCreds = await temCredenciaisConfiguradas(tenant.id);
          if (!temCreds) {
            resultados.push({ tenantId: tenant.id, ok: true, skipped: 'sem_credenciais' });
            continue;
          }
          const r = await descobrirEquipamentosGehc(tenant.id);
          resultados.push({
            tenantId: tenant.id,
            ok: true,
            vinculados: r.vinculados.length,
            jaVinculados: r.jaVinculados.length,
            semMatch: r.semMatch.length,
            pendentesConfirmacao: r.pendentesConfirmacao.length,
          });
        } catch (err) {
          console.error(`[GEHC_DISCOVERY_WORKER] Erro tenant ${tenant.id}:`, err.message);
          resultados.push({ tenantId: tenant.id, ok: false, erro: err.message });
        }
      }

      return { ok: true, tenants: resultados.length, resultados };
    }

    return processarAlertasEEnviarNotificacoes();
  },
  {
    connection,
    concurrency: 5,
    autorun: true,
    limiter: { max: 5, duration: 5000 },
  }
);

alertasWorker.on('ready', async () => {
  await logQueueState('ALERTAS_WORKER_READY', alertasQueue);
});

alertasWorker.on('failed', (job, err) => {
  console.error(`Erro no worker de alertas | job=${job?.name} | erro=${err.message}`);
});

alertasQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.log(`alertas failed | jobId=${jobId} | motivo=${failedReason}`);
});

async function shutdown(signal) {
  console.log(`[WORKER] Recebido ${signal}. Encerrando com seguranca...`);

  try {
    await alertasWorker.close();
    await alertasQueueEvents.close();
    await alertasQueue.close();
    await connection.quit();
    await inspectionConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Erro ao encerrar:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
