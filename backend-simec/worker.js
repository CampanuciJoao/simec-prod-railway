import { Worker, QueueEvents, Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processarAlertasEEnviarNotificacoes } from './services/alertas/alertasOrchestrator.js';
import { processarAlertasManutencaoDoTenant } from './services/alertas/manutencao/index.js';
import { dispararPendenciasTelegramTodos } from './services/telegram/telegramAlertService.js';
import { gerarAlertasRecomendacaoDoTenant } from './services/alertas/recomendacao/alertasRecomendacaoService.js';
import { executarCleanupCompleto } from './services/cleanup/cleanupService.js';
import { monitorarSaudeGehc } from './services/gehc/gehcMonitor.js';
import { sincronizarDadosGehc } from './services/gehc/gehcSyncService.js';
import { descobrirEquipamentosGehc } from './services/gehc/gehcDiscovery.js';
import { temCredenciaisConfiguradas } from './services/gehc/gehcAuthService.js';
import { executarBackfillTodosTenants, executarBackfillPdfs } from './services/gehc/gehcDocumentDownloader.js';
import { executarExtracaoTodosTenants, executarExtracaoPdfsTenant } from './services/gehc/gehcPdfExtractionOrchestrator.js';
import { sincronizarKnowledgeLayerTodosTenants, sincronizarKnowledgeLayerTenant } from './services/knowledgeLayer/knowledgeLayerSync.js';
import { gerarEmbeddingsTodosTenants, gerarEmbeddingsTenant } from './services/ai/eventoEmbeddingsWorker.js';
import { gerarInsightsTodosTenants, gerarInsightsTenant } from './services/ai/insightsGenerator.js';
import { registrarExecucao, PIPELINE_NAMES } from './services/ai/aiPipelineState.js';
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

/**
 * Envolve um handler longo em heartbeat: chama job.updateProgress() a cada
 * `intervalMs` para o BullMQ saber que o worker continua vivo e renovar o
 * lock. Permite manter `lockDuration` curto no Worker (recuperacao rapida
 * em caso de crash) sem matar handlers que demoram minutos.
 */
async function withHeartbeat(job, fn, intervalMs = 25_000) {
  const heartbeat = setInterval(() => {
    job?.updateProgress({ heartbeat: Date.now() }).catch(() => {});
  }, intervalMs);
  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Combina heartbeat + registro de execucao (sucesso/falha + metricas) em
 * ai_pipeline_estados. UI exibe esses dados no card do pipeline para o
 * admin saber se rodou sem precisar de logs.
 *
 * @param {object} job - job BullMQ atual
 * @param {string} pipeline - PIPELINE_NAMES.* (chave para registrar)
 * @param {Function} fn - async () => result. Result tipico:
 *                         { ok, ...metricas } (ex: capturados, processadas)
 * @param {object} [opts]
 * @param {string|null} [opts.tenantId] - quando informado, telemetria fica na
 *   linha do tenant (e nao na global). Obrigatorio para handlers *-tenant
 *   para evitar cross-tenant info leak.
 */
async function comTelemetria(job, pipeline, fn, { tenantId = null } = {}) {
  const inicio = Date.now();
  let resultado;
  let erro;
  try {
    resultado = await withHeartbeat(job, fn);
    return resultado;
  } catch (err) {
    erro = err;
    throw err;
  } finally {
    const duracaoMs = Date.now() - inicio;
    const ok = !erro && resultado?.ok !== false;

    // Mensagem prioriza, em ordem:
    //  1. Exception thrown → "Falha: <stack curta>"
    //  2. Handler retornou { ok:false, erro:'...' } sem throw → "Falha: <erro>"
    //  3. Pipeline pausado (motivo) → "<motivo>"
    //  4. Sumario das metricas
    let mensagem;
    if (erro) {
      mensagem = `Falha: ${erro.message?.slice(0, 200) ?? 'erro_desconhecido'}`;
    } else if (!ok && resultado?.erro) {
      mensagem = `Falha: ${String(resultado.erro).slice(0, 200)}`;
    } else {
      mensagem = resultado?.motivo || resumoMetricas(resultado);
    }

    // Remove campos de controle do payload de metricas (mantem so dados uteis).
    const { ok: _ok, motivo: _motivo, erro: _erro, ...metrics } = (resultado || {});

    registrarExecucao(pipeline, { ok, mensagem, metrics, duracaoMs, tenantId })
      .catch(() => {});  // nunca bloqueia o handler em caso de falha de log
  }
}

// Constroi mensagem curta de sumario das metricas para mostrar na UI
function resumoMetricas(r) {
  if (!r || typeof r !== 'object') return null;
  const partes = [];
  if (typeof r.capturados === 'number')  partes.push(`${r.capturados} capturados`);
  if (typeof r.sucessos === 'number')    partes.push(`${r.sucessos} ok`);
  if (typeof r.processados === 'number') partes.push(`${r.processados} processados`);
  if (typeof r.processadas === 'number') partes.push(`${r.processadas} OS(s)`);
  if (typeof r.tenants === 'number')     partes.push(`${r.tenants} tenant(s)`);
  if (typeof r.equipamentos === 'number') partes.push(`${r.equipamentos} eq(s)`);
  if (typeof r.equipamentosAnalisados === 'number') partes.push(`${r.equipamentosAnalisados} eq(s)`);
  return partes.length ? partes.join(' · ') : null;
}

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
      return withHeartbeat(job, async () => {
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
      });
    }

    if (job?.name === 'gehc-sync-dados') {
      return withHeartbeat(job, async () => {
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
      });
    }

    if (job?.name === 'gehc-capturar-pdfs') {
      // Captura de PDFs de OS GE para alimentar a IA preditiva.
      // O downloader internamente respeita o estado de pausa do pipeline
      // (PIPELINE_NAMES.GEHC_CAPTURA_PDF) — se desativado, devolve cedo.
      // limite 50 + maxPorEquipamento 10 = teto generoso por eq para
      // aproveitar quando poucos eqs concentram muitas OSs pendentes,
      // sem sair do envelope de tempo do ciclo (~10-15min).
      return comTelemetria(job, PIPELINE_NAMES.GEHC_CAPTURA_PDF, async () => {
        try {
          // Janela de 365d (1 ano) — cobre manutencoes antigas relevantes
          // para a IA. O backfill nao puxa tudo de uma vez: cada execucao
          // processa no maximo `limite` OSs, comecando das mais recentes
          // (orderBy requestedAt desc dentro do equipamento). Conforme as
          // recentes vao sendo marcadas como baixadas, os ciclos seguintes
          // descem naturalmente para as mais antigas. Cobertura plena dos
          // 365d acontece em alguns dias com o cron a cada 3h.
          const r = await executarBackfillTodosTenants({
            diasAtras: 365,
            limite: 50,
            maxPorEquipamento: 10,
          });
          return { ok: true, ...r };
        } catch (err) {
          console.error('[GEHC_PDF_WORKER] Erro:', err.message);
          return { ok: false, erro: err.message };
        }
      });
    }

    if (job?.name === 'gehc-capturar-pdfs-tenant' && job?.data?.tenantId) {
      // Trigger pontual usado por endpoint admin ou eventos do sistema.
      // Mantemos opcional ainda que o cron diario cubra o caso geral.
      return comTelemetria(job, PIPELINE_NAMES.GEHC_CAPTURA_PDF, async () => {
        try {
          const r = await executarBackfillPdfs({
            tenantId: job.data.tenantId,
            diasAtras: job.data.diasAtras || 365,
            limite: job.data.limite || 50,
            modalidades: job.data.modalidades,
          });
          return { ok: true, ...r };
        } catch (err) {
          console.error(`[GEHC_PDF_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
          return { ok: false, erro: err.message };
        }
      }, { tenantId: job.data.tenantId });
    }

    if (job?.name === 'gehc-extrair-pdfs') {
      // Cron noturno: extrai causa-raiz + medicoes dos PDFs ja baixados.
      // Roda 1h depois do gehc-capturar-pdfs para pegar PDFs da mesma noite.
      return comTelemetria(job, PIPELINE_NAMES.GEHC_EXTRACAO_PDF, async () => {
        try {
          const r = await executarExtracaoTodosTenants({ limite: 100 });
          return { ok: true, ...r };
        } catch (err) {
          console.error('[GEHC_EXTRACAO_WORKER] Erro:', err.message);
          return { ok: false, erro: err.message };
        }
      });
    }

    if (job?.name === 'gehc-extrair-pdfs-tenant' && job?.data?.tenantId) {
      return comTelemetria(job, PIPELINE_NAMES.GEHC_EXTRACAO_PDF, async () => {
        try {
          const r = await executarExtracaoPdfsTenant({
            tenantId: job.data.tenantId,
            limite: job.data.limite || 100,
          });
          return { ok: true, ...r };
        } catch (err) {
          console.error(`[GEHC_EXTRACAO_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
          return { ok: false, erro: err.message };
        }
      }, { tenantId: job.data.tenantId });
    }

    if (job?.name === 'knowledge-layer-sync') {
      // Sync horario do Knowledge Layer: consolida eventos das 5 fontes em
      // evento_equipamento. Idempotente, barato (so leitura + upsert).
      return comTelemetria(job, PIPELINE_NAMES.KNOWLEDGE_LAYER, async () => {
        try {
          const r = await sincronizarKnowledgeLayerTodosTenants();
          return { ok: true, ...r };
        } catch (err) {
          console.error('[KL_WORKER] Erro:', err.message);
          return { ok: false, erro: err.message };
        }
      });
    }

    if (job?.name === 'knowledge-layer-sync-tenant' && job?.data?.tenantId) {
      return comTelemetria(job, PIPELINE_NAMES.KNOWLEDGE_LAYER, async () => {
        try {
          const r = await sincronizarKnowledgeLayerTenant({ tenantId: job.data.tenantId });
          return { ok: true, ...r };
        } catch (err) {
          console.error(`[KL_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
          return { ok: false, erro: err.message };
        }
      }, { tenantId: job.data.tenantId });
    }

    if (job?.name === 'ia-gerar-embeddings') {
      return comTelemetria(job, PIPELINE_NAMES.IA_EMBEDDINGS, async () => {
        try {
          const r = await gerarEmbeddingsTodosTenants({ limite: 200 });
          return { ok: true, ...r };
        } catch (err) {
          console.error('[IA_EMBEDDINGS_WORKER] Erro:', err.message);
          return { ok: false, erro: err.message };
        }
      });
    }

    if (job?.name === 'ia-gerar-embeddings-tenant' && job?.data?.tenantId) {
      return comTelemetria(job, PIPELINE_NAMES.IA_EMBEDDINGS, async () => {
        try {
          const r = await gerarEmbeddingsTenant({
            tenantId: job.data.tenantId,
            limite: job.data.limite || 200,
          });
          return { ok: true, ...r };
        } catch (err) {
          console.error(`[IA_EMBEDDINGS_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
          return { ok: false, erro: err.message };
        }
      }, { tenantId: job.data.tenantId });
    }

    if (job?.name === 'ia-gerar-insights') {
      return comTelemetria(job, PIPELINE_NAMES.IA_INSIGHTS, async () => {
        try {
          const r = await gerarInsightsTodosTenants();
          return { ok: true, ...r };
        } catch (err) {
          console.error('[IA_INSIGHTS_WORKER] Erro:', err.message);
          return { ok: false, erro: err.message };
        }
      });
    }

    if (job?.name === 'ia-gerar-insights-tenant' && job?.data?.tenantId) {
      return comTelemetria(job, PIPELINE_NAMES.IA_INSIGHTS, async () => {
        try {
          const r = await gerarInsightsTenant({ tenantId: job.data.tenantId });
          return { ok: true, ...r };
        } catch (err) {
          console.error(`[IA_INSIGHTS_WORKER] Erro tenant ${job.data.tenantId}:`, err.message);
          return { ok: false, erro: err.message };
        }
      }, { tenantId: job.data.tenantId });
    }

    if (job?.name === 'gehc-discovery-diario') {
      // Roda discovery apenas para tenants que já tenham credenciais GE
      // configuradas — sem credenciais o discovery falha em capturar tokens
      // e não traz valor. Reduz ruído nos logs.
      return withHeartbeat(job, async () => {
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
      });
    }

    if (job?.name === 'telegram-drenar-pendencias') {
      // Roda a cada 1min independente do orchestrator. Garante que
      // alertas pendentes (telegramEnviado=false) sejam reenviados mesmo
      // quando o tenant nao teve mudanca na rodada — evita o bug em que
      // alertas ficam represados ate alguma rodada futura "afetar" o
      // tenant e drenar tudo de uma vez.
      return dispararPendenciasTelegramTodos();
    }

    return processarAlertasEEnviarNotificacoes();
  },
  {
    connection,
    concurrency: 5,
    autorun: true,
    limiter: { max: 5, duration: 5000 },
    // lockDuration mantem-se proximo do default (60s) para que recuperacao
    // de jobs curtos apos crash continue rapida. Handlers longos
    // (Playwright, sync GE, embeddings) usam withHeartbeat() abaixo para
    // renovar o lock explicitamente — evita 'stalled' sem regredir
    // tempo de retry global.
    lockDuration: 60 * 1000,       // 60s (era 30s default)
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
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
