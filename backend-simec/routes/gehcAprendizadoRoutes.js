// Endpoints da sub-aba "Aprendizado da IA" em Integrações > GE Healthcare.
// Read-only para listagem; admin-only para pausar/retomar pipelines da IA.
// Tudo opera no escopo do tenant do usuário autenticado, exceto pausa global
// que é o kill switch (também restrito a admin).

import express from 'express';
import prisma from '../services/prismaService.js';
import { admin } from '../middleware/authMiddleware.js';
import { getFromR2 } from '../services/uploads/fileStorageService.js';
import {
  PIPELINE_NAMES,
  listarEstados,
  pausar,
  retomar,
} from '../services/ai/aiPipelineState.js';
import { perguntarIaSobreEquipamento } from '../services/ai/ragSearchService.js';
import { dispararPipeline } from '../services/ai/pipelineDispatcher.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipelineValido(nome) {
  return Object.values(PIPELINE_NAMES).includes(nome);
}

async function logAuditoria({ tenantId, autorId, acao, entidadeId, detalhes }) {
  try {
    await prisma.logAuditoria.create({
      data: {
        tenantId,
        acao,
        entidade:   'AiPipelineEstado',
        entidadeId: entidadeId || 'global',
        detalhes:   typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes),
        autorId,
      },
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] Falha ao gravar log:', err.message);
  }
}

// ─── GET /api/gehc/aprendizado/status ─────────────────────────────────────────
// KPIs principais para o cabeçalho da aba "Aprendizado da IA".
router.get('/status', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const [
      totalOs,
      totalPdfs,
      pdfsBaixados,
      pdfsComErro,
      ultimoPdfBaixado,
      ultimaSync,
      pdfsExtraidos,
      pdfsComCausaCategoria,
      ultimaExtracao,
    ] = await Promise.all([
      prisma.gehcOrdemServico.count({ where: { tenantId } }),
      prisma.gehcPdfDocumento.count({ where: { tenantId } }),
      prisma.gehcPdfDocumento.count({ where: { tenantId, baixadoEm: { not: null } } }),
      prisma.gehcPdfDocumento.count({
        where: { tenantId, baixadoEm: null, ultimoErro: { not: null } },
      }),
      prisma.gehcPdfDocumento.findFirst({
        where: { tenantId, baixadoEm: { not: null } },
        orderBy: { baixadoEm: 'desc' },
        select: { baixadoEm: true },
      }),
      prisma.gehcOrdemServico.findFirst({
        where: { tenantId },
        orderBy: { sincronizadoEm: 'desc' },
        select: { sincronizadoEm: true },
      }),
      prisma.gehcPdfExtraido.count({ where: { tenantId, extraidoEm: { not: null } } }),
      prisma.gehcPdfExtraido.count({
        where: { tenantId, rootCauseCategory: { not: null } },
      }),
      prisma.gehcPdfExtraido.findFirst({
        where: { tenantId, extraidoEm: { not: null } },
        orderBy: { extraidoEm: 'desc' },
        select: { extraidoEm: true },
      }),
    ]);

    const coberturaPdf       = totalOs > 0       ? Math.round((pdfsBaixados / totalOs) * 100)         : null;
    const coberturaExtracao  = pdfsBaixados > 0  ? Math.round((pdfsExtraidos / pdfsBaixados) * 100)   : null;

    res.json({
      tenantId,
      totalOs,
      totalPdfs,
      pdfsBaixados,
      pdfsComErro,
      coberturaPct: coberturaPdf,
      pdfsExtraidos,
      pdfsComCausaCategoria,
      coberturaExtracaoPct: coberturaExtracao,
      ultimoPdfBaixadoEm:  ultimoPdfBaixado?.baixadoEm  || null,
      ultimaSyncEm:        ultimaSync?.sincronizadoEm   || null,
      ultimaExtracaoEm:    ultimaExtracao?.extraidoEm    || null,
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/insights ──────────────────────────────────────
// Lista insights ativos da IA (sem resolvedoEm). Ordenado por severidade
// (critical > high > medium > low) e geradoEm desc.
router.get('/insights', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const insights = await prisma.iaInsight.findMany({
      where: { tenantId, resolvidoEm: null },
      include: {
        equipamento: { select: { id: true, tag: true, apelido: true, modelo: true } },
      },
      orderBy: [{ geradoEm: 'desc' }],
    });

    const ordemSev = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    insights.sort((a, b) => (ordemSev[a.severidade] ?? 9) - (ordemSev[b.severidade] ?? 9));

    res.json({ insights });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /insights:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/gehc/aprendizado/insights/:id/feedback ────────────────────────
// Engenheiro marca util / inutil / falso positivo. Vira ground truth para
// retreinamento futuro.
router.patch('/insights/:id/feedback', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { id } = req.params;
  const { util } = req.body || {};

  if (typeof util !== 'boolean') {
    return res.status(400).json({ error: 'Campo "util" (boolean) obrigatorio.' });
  }

  try {
    const insight = await prisma.iaInsight.findFirst({ where: { id, tenantId } });
    if (!insight) return res.status(404).json({ error: 'Insight nao encontrado.' });

    const atualizado = await prisma.iaInsight.update({
      where: { id },
      data: { feedbackUtil: util, feedbackEm: new Date() },
    });
    res.json({ ok: true, insight: atualizado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/insights/limpar-todos ────────────────────────
// Marca todos insights ativos do tenant como resolvidos. Util para zerar apos
// fix de logica de detector que gerou falsos positivos. Proxima execucao do
// ia-gerar-insights re-cria APENAS os que ainda forem validos pelos novos
// criterios.
router.post('/insights/limpar-todos', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const usuarioId = req.usuario.id;
  try {
    const r = await prisma.iaInsight.updateMany({
      where: { tenantId, resolvidoEm: null },
      data:  { resolvidoEm: new Date() },
    });
    await logAuditoria({
      tenantId, autorId: usuarioId,
      acao: 'AI_INSIGHTS_LIMPOS_EM_LOTE',
      entidadeId: 'todos',
      detalhes: { resolvidos: r.count, motivo: req.body?.motivo || 'limpeza_manual' },
    });
    res.json({ ok: true, resolvidos: r.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/gehc/aprendizado/insights/:id/resolver ────────────────────────
// Marca insight como resolvido manualmente (engenheiro tomou acao).
// Proximo run do insightsGenerator pode regerar se a condicao persistir.
router.patch('/insights/:id/resolver', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { id } = req.params;
  try {
    const insight = await prisma.iaInsight.findFirst({ where: { id, tenantId } });
    if (!insight) return res.status(404).json({ error: 'Insight nao encontrado.' });

    const atualizado = await prisma.iaInsight.update({
      where: { id },
      data: { resolvidoEm: new Date() },
    });
    res.json({ ok: true, insight: atualizado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/ia/ask ───────────────────────────────────────
// Pergunta livre + RAG sobre o Knowledge Layer.
// Body: { pergunta, equipamentoId? }
router.post('/ia/ask', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { pergunta, equipamentoId } = req.body || {};

  if (!pergunta || typeof pergunta !== 'string') {
    return res.status(400).json({ error: 'Campo "pergunta" obrigatorio.' });
  }

  try {
    const r = await perguntarIaSobreEquipamento({ tenantId, pergunta, equipamentoId });
    if (!r.ok) return res.status(503).json({ error: r.motivo });
    res.json(r);
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /ia/ask:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/timeline/:equipamentoId ───────────────────────
// Timeline unificada do Knowledge Layer para um equipamento. Read-only — usada
// para inspecao (admin/debug) e como base para o RAG do chatbot (PR4).
router.get('/timeline/:equipamentoId', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { equipamentoId } = req.params;
  const limite = Math.min(Number(req.query.limite) || 100, 500);
  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: { tenantId, id: equipamentoId },
      select: { id: true, tag: true, apelido: true, modelo: true, gehcAssetId: true },
    });
    if (!equipamento) return res.status(404).json({ error: 'Equipamento não encontrado.' });

    const eventos = await prisma.eventoEquipamento.findMany({
      where: { tenantId, equipamentoId },
      orderBy: { ocorridoEm: 'desc' },
      take: limite,
    });

    res.json({
      equipamento,
      total: eventos.length,
      eventos,
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /timeline:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/causas ─────────────────────────────────────────
// Agregacao de causa-raiz por categoria normalizada (taxonomia LLM).
// Resposta: top categorias com contagem total + por equipamento.
router.get('/causas', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const agregadosBrutos = await prisma.gehcPdfExtraido.groupBy({
      by: ['rootCauseCategory'],
      where: { tenantId, rootCauseCategory: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { rootCauseCategory: 'desc' } },
    });

    const agregados = agregadosBrutos.map((a) => ({
      categoria: a.rootCauseCategory,
      total:     a._count._all,
    }));

    res.json({ categorias: agregados });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /causas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/equipamentos ───────────────────────────────────
// Lista equipamentos com cobertura de PDF (ordenado por menor cobertura primeiro
// — quem precisa de mais atenção fica no topo).
router.get('/equipamentos', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const equipamentos = await prisma.equipamento.findMany({
      where: { tenantId, gehcAssetId: { not: null } },
      select: {
        id:       true,
        tag:      true,
        apelido:  true,
        modelo:   true,
        tipo:     true,
        unidade:  { select: { nomeSistema: true } },
        _count:   { select: { gehcOrdensServico: true, gehcPdfDocumentos: true } },
      },
    });

    const linhas = await Promise.all(equipamentos.map(async (eq) => {
      const [baixados, ultimaOs, causasAgregadas] = await Promise.all([
        prisma.gehcPdfDocumento.count({
          where: { tenantId, equipamentoId: eq.id, baixadoEm: { not: null } },
        }),
        prisma.gehcOrdemServico.findFirst({
          where: { tenantId, equipamentoId: eq.id },
          orderBy: { requestedAt: 'desc' },
          select: { requestedAt: true },
        }),
        // Agrega causas extraidas por equipamento (via JOIN gehc_pdf_documentos)
        prisma.gehcPdfExtraido.groupBy({
          by: ['rootCauseCategory'],
          where: {
            tenantId,
            rootCauseCategory: { not: null },
            pdfDocumento: { equipamentoId: eq.id },
          },
          _count: { _all: true },
          orderBy: { _count: { rootCauseCategory: 'desc' } },
          take: 3,
        }),
      ]);
      return {
        id:           eq.id,
        tag:          eq.tag,
        apelido:      eq.apelido,
        modelo:       eq.modelo,
        tipo:         eq.tipo,
        unidade:      eq.unidade?.nomeSistema || null,
        totalOs:      eq._count.gehcOrdensServico,
        totalPdfs:    eq._count.gehcPdfDocumentos,
        pdfsBaixados: baixados,
        coberturaPct: eq._count.gehcOrdensServico > 0
          ? Math.round((baixados / eq._count.gehcOrdensServico) * 100)
          : null,
        ultimaOsEm:   ultimaOs?.requestedAt || null,
        causasTop:    causasAgregadas.map((c) => ({
          categoria: c.rootCauseCategory,
          total:     c._count._all,
        })),
      };
    }));

    linhas.sort((a, b) => (a.coberturaPct ?? 0) - (b.coberturaPct ?? 0));

    res.json({ equipamentos: linhas });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /equipamentos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/equipamentos/:id ───────────────────────────────
// Drill-down: lista OSs do equipamento com flag indicando se tem PDF baixado.
router.get('/equipamentos/:id', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { id } = req.params;
  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: { tenantId, id },
      select: {
        id: true, tag: true, apelido: true, modelo: true, tipo: true,
        gehcAssetId: true, gehcSystemId: true,
        unidade: { select: { nomeSistema: true } },
      },
    });
    if (!equipamento) return res.status(404).json({ error: 'Equipamento não encontrado.' });

    const ordens = await prisma.gehcOrdemServico.findMany({
      where: { tenantId, equipamentoId: id },
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        pdfDocumentos: {
          select: {
            id: true,
            documentId: true,
            fileName: true,
            baixadoEm: true,
            tentativas: true,
            ultimoErro: true,
            fileSizeBytes: true,
            extraido: {
              select: {
                rootCauseCategory: true,
                rootCauseRaw:      true,
                equipmentStatus:   true,
                engineerFullName:  true,
                actionsTaken:      true,
                measurementsJson:  true,
                partsReplacedJson: true,
                totalMinutes:      true,
                extraidoEm:        true,
                llmError:          true,
              },
            },
          },
        },
      },
    });

    res.json({
      equipamento,
      ordens: ordens.map((o) => ({
        id: o.id,
        gehcServiceId:    o.gehcServiceId,
        problemDescription: o.problemDescription,
        serviceTypeCode:  o.serviceTypeCode,
        serviceStateCode: o.serviceStateCode,
        requestedAt:      o.requestedAt,
        engineerName:     o.engineerName,
        documentos:       o.pdfDocumentos,
      })),
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /equipamentos/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/pdf/:documentId ────────────────────────────────
// Stream do PDF original armazenado no R2. Acesso restrito ao tenant dono.
router.get('/pdf/:documentId', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const { documentId } = req.params;
  try {
    const doc = await prisma.gehcPdfDocumento.findUnique({
      where:  { documentId },
      select: { tenantId: true, r2Key: true, fileName: true, baixadoEm: true },
    });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (doc.tenantId !== tenantId) return res.status(403).json({ error: 'Acesso negado.' });
    if (!doc.r2Key || !doc.baixadoEm) return res.status(409).json({ error: 'PDF ainda não baixado.' });

    const r2Object = await getFromR2(doc.r2Key);
    if (!r2Object?.Body) return res.status(500).json({ error: 'Falha ao recuperar PDF do storage.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    r2Object.Body.pipe(res);
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /pdf:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/atividade ──────────────────────────────────────
// Feed cronológico das últimas captações (sucessos e falhas) — usada na seção
// "Atividade recente da IA" da UI.
router.get('/atividade', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const documentos = await prisma.gehcPdfDocumento.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        equipamento: { select: { tag: true, apelido: true } },
        ordemServico: { select: { gehcServiceId: true, problemDescription: true } },
      },
    });

    const itens = documentos.map((d) => ({
      id: d.id,
      ocorridoEm: d.baixadoEm || d.ultimaTentativaEm || d.updatedAt,
      tipo: d.baixadoEm
        ? 'pdf_baixado'
        : (d.ultimoErro ? 'pdf_falha' : 'pdf_pendente'),
      equipamento: d.equipamento?.tag || null,
      gehcServiceId: d.ordemServico?.gehcServiceId,
      problema: d.ordemServico?.problemDescription?.slice(0, 120) || null,
      fileName: d.fileName,
      fileSizeBytes: d.fileSizeBytes,
      tentativas: d.tentativas,
      ultimoErro: d.ultimoErro,
    }));

    res.json({ itens });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /atividade:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/pipelines ──────────────────────────────────────
// Estado de cada pipeline da IA (kill switch global + pipelines individuais).
router.get('/pipelines', async (req, res) => {
  const tenantId = req.usuario.tenantId;
  try {
    const pipelines = await listarEstados({ tenantId });
    res.json({ pipelines });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /pipelines:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/pipelines/:pipeline/pausar ────────────────────
// Pausa um pipeline. Body opcional: { escopo: 'tenant'|'global', motivo }.
// "global" só pausa o tenant atual a menos que o usuário seja superadmin.
router.post('/pipelines/:pipeline/pausar', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const usuarioId = req.usuario.id;
  const { pipeline } = req.params;
  const { motivo, escopo = 'tenant' } = req.body || {};

  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }

  // Pausa global só se a aplicação suportar superadmin futuramente; por hora,
  // todos os admin podem pausar o próprio tenant. Pausa global mexe no campo
  // tenantId=null da tabela ai_pipeline_estados.
  const escopoFinal = escopo === 'global' ? null : tenantId;

  try {
    const estado = await pausar(pipeline, { tenantId: escopoFinal, usuarioId, motivo });
    await logAuditoria({
      tenantId,
      autorId: usuarioId,
      acao: 'AI_PIPELINE_PAUSADO',
      entidadeId: pipeline,
      detalhes: { escopo: escopoFinal === null ? 'global' : 'tenant', motivo },
    });
    res.json({ ok: true, estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/pipelines/:pipeline/disparar ──────────────────
// Forca execucao agora de um pipeline (sem esperar o cron). Util para
// validacao, manutencao e debug. O cron continua agendado normalmente —
// isso adiciona UMA execucao avulsa em paralelo.
router.post('/pipelines/:pipeline/disparar', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const usuarioId = req.usuario.id;
  const { pipeline } = req.params;

  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }
  if (pipeline === 'global') {
    return res.status(400).json({ error: 'Pipeline "global" e kill switch — nao tem job para disparar.' });
  }

  try {
    const r = await dispararPipeline(pipeline);
    if (!r.ok) return res.status(503).json({ error: r.motivo });

    await logAuditoria({
      tenantId, autorId: usuarioId,
      acao: 'AI_PIPELINE_DISPARADO',
      entidadeId: pipeline,
      detalhes: { jobId: r.jobId, jobName: r.jobName },
    });

    res.json({ ok: true, jobId: r.jobId, jobName: r.jobName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/pipelines/:pipeline/retomar ───────────────────
router.post('/pipelines/:pipeline/retomar', admin, async (req, res) => {
  const tenantId = req.usuario.tenantId;
  const usuarioId = req.usuario.id;
  const { pipeline } = req.params;
  const { escopo = 'tenant' } = req.body || {};

  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }

  const escopoFinal = escopo === 'global' ? null : tenantId;

  try {
    const estado = await retomar(pipeline, { tenantId: escopoFinal, usuarioId });
    await logAuditoria({
      tenantId,
      autorId: usuarioId,
      acao: 'AI_PIPELINE_RETOMADO',
      entidadeId: pipeline,
      detalhes: { escopo: escopoFinal === null ? 'global' : 'tenant' },
    });
    res.json({ ok: true, estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
