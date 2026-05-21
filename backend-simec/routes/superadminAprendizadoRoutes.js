// Visao cross-tenant de aprendizado de maquina — restrita ao Tenant System.
// Espelha o que cada tenant ve em /api/gehc/aprendizado, mas agrega por
// cliente. Util para o superadmin acompanhar saude da IA no parque todo
// (cobertura GEHC, insights por tenant, pipelines pausados, etc).

import express from 'express';
import prisma from '../services/prismaService.js';
import {
  proteger,
  requireSystemTenant,
} from '../middleware/authMiddleware.js';
import { PIPELINE_NAMES, listarEstados } from '../services/ai/aiPipelineState.js';

const router = express.Router();

router.use(proteger);
router.use(requireSystemTenant);

// ─── GET /api/superadmin/aprendizado/visao-global ────────────────────────────
// KPIs agregados de toda a base. Soma N tenants — nao ha leak entre eles
// porque a resposta nao inclui referencias diretas a equipamentos/OSs.
router.get('/visao-global', async (req, res) => {
  try {
    const [
      totalTenantsAtivos,
      totalEventos,
      totalEventosComEmbedding,
      totalInsightsAtivos,
      totalInsightsResolvidos,
      totalInsightsDescartados,
      totalOsGehc,
      totalPdfsBaixados,
      totalPdfsExtraidos,
      pipelinesGlobais,
    ] = await Promise.all([
      prisma.tenant.count({ where: { ativo: true, kind: 'CUSTOMER' } }),
      prisma.eventoEquipamento.count(),
      prisma.eventoEquipamentoEmbedding.count(),
      prisma.iaInsight.count({ where: { resolvidoEm: null } }),
      prisma.iaInsight.count({
        where: { resolvidoEm: { not: null }, feedbackUtil: { not: false } },
      }),
      prisma.iaInsight.count({
        where: { resolvidoEm: { not: null }, feedbackUtil: false },
      }),
      prisma.gehcOrdemServico.count(),
      prisma.gehcPdfDocumento.count({ where: { baixadoEm: { not: null } } }),
      prisma.gehcPdfExtraido.count({ where: { extraidoEm: { not: null } } }),
      // Estado dos pipelines GLOBAIS (kill switches sistemicos)
      prisma.aiPipelineEstado.findMany({
        where: { tenantId: null },
        include: { pausadoPor: { select: { nome: true } } },
      }),
    ]);

    const coberturaEmbeddings = totalEventos > 0
      ? Math.round((totalEventosComEmbedding / totalEventos) * 100)
      : null;
    const coberturaPdfGlobal = totalOsGehc > 0
      ? Math.round((totalPdfsBaixados / totalOsGehc) * 100)
      : null;
    const coberturaExtracaoGlobal = totalPdfsBaixados > 0
      ? Math.round((totalPdfsExtraidos / totalPdfsBaixados) * 100)
      : null;

    res.json({
      tenants: {
        ativos: totalTenantsAtivos,
      },
      knowledge: {
        totalEventos,
        comEmbedding: totalEventosComEmbedding,
        coberturaEmbeddings,
      },
      insights: {
        ativos:      totalInsightsAtivos,
        resolvidos:  totalInsightsResolvidos,
        descartados: totalInsightsDescartados,
        taxaFalsoPositivo: (totalInsightsResolvidos + totalInsightsDescartados) > 0
          ? Math.round((totalInsightsDescartados / (totalInsightsResolvidos + totalInsightsDescartados)) * 100)
          : null,
      },
      gehc: {
        totalOs:          totalOsGehc,
        pdfsBaixados:     totalPdfsBaixados,
        pdfsExtraidos:    totalPdfsExtraidos,
        coberturaPdfPct:        coberturaPdfGlobal,
        coberturaExtracaoPct:   coberturaExtracaoGlobal,
      },
      pipelinesGlobais: pipelinesGlobais.map((p) => ({
        pipeline:    p.pipeline,
        ativo:       p.ativo,
        pausadoEm:   p.pausadoEm,
        pausadoPor:  p.pausadoPor?.nome || null,
        motivoPausa: p.motivoPausa,
      })),
    });
  } catch (err) {
    console.error('[SUPERADMIN_APRENDIZADO] /visao-global:', err.message);
    res.status(500).json({ message: 'Erro ao carregar visao global.' });
  }
});

// ─── GET /api/superadmin/aprendizado/por-tenant ──────────────────────────────
// Tabela com metricas de IA por tenant — drill-down do dashboard.
// Tenants em ordem de "menos cobertura primeiro" (onde a IA precisa mais).
router.get('/por-tenant', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { ativo: true, kind: 'CUSTOMER' },
      select: { id: true, nome: true, slug: true },
      orderBy: { nome: 'asc' },
    });

    if (tenants.length === 0) {
      return res.json({ tenants: [] });
    }

    // Em vez de N queries por tenant, faz N groupBy globais e mapeia.
    // groupBy nao aceita where vazio, entao filtramos pelo conjunto de tenants.
    const tenantIds = tenants.map((t) => t.id);

    const [
      eventosPorTenant,
      embeddingsPorTenant,
      insightsAtivosPorTenant,
      osGehcPorTenant,
      pdfsBaixadosPorTenant,
      pdfsExtraidosPorTenant,
      ultimaExecKnowledge,
    ] = await Promise.all([
      prisma.eventoEquipamento.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      prisma.eventoEquipamentoEmbedding.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      prisma.iaInsight.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds }, resolvidoEm: null },
        _count: { id: true },
      }),
      prisma.gehcOrdemServico.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      }),
      prisma.gehcPdfDocumento.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds }, baixadoEm: { not: null } },
        _count: { id: true },
      }),
      prisma.gehcPdfExtraido.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds }, extraidoEm: { not: null } },
        _count: { id: true },
      }),
      prisma.aiPipelineEstado.findMany({
        where: { tenantId: { in: tenantIds }, pipeline: PIPELINE_NAMES.KNOWLEDGE_LAYER },
        select: { tenantId: true, ultimaExecucaoEm: true, ultimaExecucaoOk: true, ativo: true },
      }),
    ]);

    const idx = (lista) => Object.fromEntries(lista.map((r) => [r.tenantId, r._count.id]));
    const idxExec = Object.fromEntries(
      ultimaExecKnowledge.map((r) => [r.tenantId, r])
    );

    const eventosMap     = idx(eventosPorTenant);
    const embeddingsMap  = idx(embeddingsPorTenant);
    const insightsMap    = idx(insightsAtivosPorTenant);
    const osGehcMap      = idx(osGehcPorTenant);
    const pdfsBxMap      = idx(pdfsBaixadosPorTenant);
    const pdfsExMap      = idx(pdfsExtraidosPorTenant);

    const linhas = tenants.map((t) => {
      const totalOs       = osGehcMap[t.id]    || 0;
      const pdfsBaixados  = pdfsBxMap[t.id]    || 0;
      const pdfsExtraidos = pdfsExMap[t.id]    || 0;
      const eventos       = eventosMap[t.id]   || 0;
      const embeddings    = embeddingsMap[t.id] || 0;
      const insightsAtivos = insightsMap[t.id] || 0;
      const exec          = idxExec[t.id] || null;

      return {
        tenantId:   t.id,
        nome:       t.nome,
        slug:       t.slug,
        totalEventos:   eventos,
        comEmbedding:   embeddings,
        coberturaEmbeddingsPct: eventos > 0 ? Math.round((embeddings / eventos) * 100) : null,
        insightsAtivos,
        gehc: {
          totalOs,
          pdfsBaixados,
          pdfsExtraidos,
          coberturaPdfPct:      totalOs       > 0 ? Math.round((pdfsBaixados  / totalOs)       * 100) : null,
          coberturaExtracaoPct: pdfsBaixados  > 0 ? Math.round((pdfsExtraidos / pdfsBaixados)  * 100) : null,
        },
        knowledgeLayer: exec
          ? {
              pausado:           !exec.ativo,
              ultimaExecucaoEm:  exec.ultimaExecucaoEm,
              ultimaExecucaoOk:  exec.ultimaExecucaoOk,
            }
          : { pausado: false, ultimaExecucaoEm: null, ultimaExecucaoOk: null },
      };
    });

    // Ordena por menor cobertura GEHC (mais necessidade de atencao) e
    // mantem tenants sem OS GEHC no fim (cobertura null).
    linhas.sort((a, b) => {
      const ca = a.gehc.coberturaPdfPct;
      const cb = b.gehc.coberturaPdfPct;
      if (ca === null && cb === null) return 0;
      if (ca === null) return 1;
      if (cb === null) return -1;
      return ca - cb;
    });

    res.json({ tenants: linhas });
  } catch (err) {
    console.error('[SUPERADMIN_APRENDIZADO] /por-tenant:', err.message);
    res.status(500).json({ message: 'Erro ao carregar visao por tenant.' });
  }
});

// ─── GET /api/superadmin/aprendizado/pipelines-globais ───────────────────────
// Estado dos pipelines globais (kill switches sistemicos). Permite ao
// superadmin pausar/retomar tudo de uma vez. Para pausar especifico de
// tenant, usar o endpoint per-tenant /api/gehc/aprendizado/pipelines/...
// com o tenant alvo via impersonacao.
router.get('/pipelines-globais', async (req, res) => {
  try {
    // listarEstados sem tenantId retorna so o estado global (sem linhaTenant).
    // escopoVisivel='system' mantem nomes/identidades.
    const pipelines = await listarEstados({ tenantId: null, escopoVisivel: 'system' });
    res.json({ pipelines });
  } catch (err) {
    console.error('[SUPERADMIN_APRENDIZADO] /pipelines-globais:', err.message);
    res.status(500).json({ message: 'Erro ao carregar pipelines globais.' });
  }
});

export default router;
