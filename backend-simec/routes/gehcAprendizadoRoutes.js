// Endpoints da sub-aba "Aprendizado da IA" em Integrações > GE Healthcare.
// Read-only para listagem; admin-only para pausar/retomar pipelines da IA.
// Tudo opera no escopo do tenant do usuário autenticado, exceto pausa global
// que é o kill switch (também restrito a admin).

import express from 'express';
import prisma from '../services/prismaService.js';
import { admin } from '../middleware/authMiddleware.js';
import { getFromR2, deleteFromR2 } from '../services/uploads/fileStorageService.js';
import {
  PIPELINE_NAMES,
  listarEstados,
  pausar,
  retomar,
} from '../services/ai/aiPipelineState.js';
import { perguntarIaSobreEquipamento } from '../services/ai/ragSearchService.js';
import { dispararPipeline, statusDoJobDoPipeline } from '../services/ai/pipelineDispatcher.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipelineValido(nome) {
  return Object.values(PIPELINE_NAMES).includes(nome);
}

// Escopo 'global' (tenantId=null em ai_pipeline_estados) e privilegiado:
// pausa/retoma o pipeline para todos os tenants ao mesmo tempo. So aceita
// se a identidade ORIGINAL do request for superadmin do Tenant System,
// independente de impersonacao em curso. Admin de tenant comum (Cerdil
// etc) so pode operar no proprio tenant.
function ehSuperadminSystem(req) {
  const u = req.usuario;
  return Boolean(u && u.role === 'superadmin' && u.tenant?.kind === 'SYSTEM');
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
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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

// ─── GET /api/gehc/aprendizado/logs-downloader ───────────────────────────────
// Lista logs estruturados do gehcDocumentDownloader (1 entry por tentativa
// inline). Filtros opcionais: categoria, resolvido, desdeDias, limite.
router.get('/logs-downloader', async (req, res) => {
  const tenantId = req.tenantContext;
  const categoria = req.query?.categoria || null;
  const resolvido = req.query?.resolvido != null
    ? String(req.query.resolvido) === 'true'
    : null;
  const desdeDias = Math.min(Number(req.query?.desdeDias) || 7, 180);
  const limite = Math.min(Number(req.query?.limite) || 50, 200);

  try {
    const desde = new Date(Date.now() - desdeDias * 86_400_000);
    const where = { tenantId, createdAt: { gte: desde } };
    if (categoria) where.categoria = categoria;
    if (resolvido !== null) where.resolvido = resolvido;

    const [items, totalPorCategoria] = await Promise.all([
      prisma.gehcDownloadLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      prisma.gehcDownloadLog.groupBy({
        by: ['categoria'],
        where: { tenantId, createdAt: { gte: desde } },
        _count: { id: true },
      }),
    ]);

    const itemsParsed = items.map((l) => ({
      ...l,
      etapas: l.etapasJson ? JSON.parse(l.etapasJson) : null,
      etapasJson: undefined,
    }));

    res.json({
      tenantId,
      filtros: { categoria, resolvido, desdeDias, limite },
      totalPorCategoria: totalPorCategoria.reduce((acc, c) => {
        acc[c.categoria] = c._count.id;
        return acc;
      }, {}),
      total: items.length,
      items: itemsParsed,
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /logs-downloader:', err);
    res.status(500).json({ message: 'Erro ao buscar logs do downloader.' });
  }
});

// ─── GET /api/gehc/aprendizado/extracoes/diagnostico ─────────────────────────
// Snapshot do estado da pipeline de PDFs para o tenant. Util quando os KPIs
// nao batem (ex: PDFs baixados mas 0 analisados) e nao se tem acesso ao log.
router.get('/extracoes/diagnostico', async (req, res) => {
  const tenantId = req.tenantContext;

  try {
    const [
      docsTotal,
      docsComR2,
      docsSemR2,
      docsComErro,
      extracoesTotal,
      extracoesOk,
      extracoesComErro,
      extracoesSemLlm,
      ultimoDoc,
      ultimaExtracaoOk,
      amostrasErro,
      amostrasLlmErro,
      amostrasDownloadErro,
    ] = await Promise.all([
      prisma.gehcPdfDocumento.count({ where: { tenantId } }),
      prisma.gehcPdfDocumento.count({ where: { tenantId, r2Key: { not: null } } }),
      prisma.gehcPdfDocumento.count({ where: { tenantId, r2Key: null } }),
      prisma.gehcPdfDocumento.count({
        where: { tenantId, ultimoErro: { not: null }, baixadoEm: null },
      }),
      prisma.gehcPdfExtraido.count({ where: { tenantId } }),
      prisma.gehcPdfExtraido.count({ where: { tenantId, extraidoEm: { not: null }, extractionError: null } }),
      prisma.gehcPdfExtraido.count({ where: { tenantId, extractionError: { not: null } } }),
      prisma.gehcPdfExtraido.count({ where: { tenantId, extraidoEm: { not: null }, llmError: { not: null } } }),
      prisma.gehcPdfDocumento.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        select: { documentId: true, fileName: true, baixadoEm: true, r2Key: true, ultimoErro: true, tentativas: true, updatedAt: true },
      }),
      prisma.gehcPdfExtraido.findFirst({
        where: { tenantId, extraidoEm: { not: null } },
        orderBy: { extraidoEm: 'desc' },
        select: { id: true, pdfDocumentoId: true, extraidoEm: true, rootCauseCategory: true, llmError: true },
      }),
      prisma.gehcPdfExtraido.findMany({
        where: { tenantId, extractionError: { not: null } },
        select: { pdfDocumentoId: true, extractionError: true, tentativas: true, ultimaTentativaEm: true },
        orderBy: { ultimaTentativaEm: 'desc' },
        take: 5,
      }),
      prisma.gehcPdfExtraido.findMany({
        where: { tenantId, extraidoEm: { not: null }, llmError: { not: null } },
        select: { pdfDocumentoId: true, llmError: true },
        orderBy: { extraidoEm: 'desc' },
        take: 5,
      }),
      // Amostras dos ultimos erros do DOWNLOADER — diferente da extracao.
      // Contem mensagem amigavel salva pelo gehcDocumentDownloader.
      prisma.gehcPdfDocumento.findMany({
        where: { tenantId, ultimoErro: { not: null } },
        select: {
          documentId: true,
          fileName: true,
          ultimoErro: true,
          tentativas: true,
          ultimaTentativaEm: true,
          equipamento: { select: { tag: true, modelo: true } },
        },
        orderBy: { ultimaTentativaEm: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      tenantId,
      documentos: {
        total: docsTotal,
        comR2KeyLegado: docsComR2,
        semR2KeyNovo: docsSemR2,
        comErroDownload: docsComErro,
        ultimoDocumento: ultimoDoc,
      },
      extracoes: {
        total: extracoesTotal,
        sucesso: extracoesOk,
        comErroExtracao: extracoesComErro,
        sucessoMasSemLlm: extracoesSemLlm,
        ultimaSucesso: ultimaExtracaoOk,
      },
      amostraDeErros: {
        download: amostrasDownloadErro,
        extracao: amostrasErro,
        llm: amostrasLlmErro,
      },
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /extracoes/diagnostico:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/gehc/aprendizado/insights/:id/descartar ──────────────────────
// Descarta o insight como FALSO POSITIVO. Diferente de "resolver" (que
// significa que o problema real foi tratado), descartar registra
// feedbackUtil=false — sinaliza para a IA que esse insight nao deveria
// ter sido gerado.
router.patch('/insights/:id/descartar', async (req, res) => {
  const tenantId = req.tenantContext;
  const { id } = req.params;
  try {
    const insight = await prisma.iaInsight.findFirst({ where: { id, tenantId } });
    if (!insight) return res.status(404).json({ error: 'Insight nao encontrado.' });

    const atualizado = await prisma.iaInsight.update({
      where: { id },
      data: {
        resolvidoEm:  new Date(),
        feedbackUtil: false,
        feedbackEm:   new Date(),
      },
    });
    res.json({ ok: true, insight: atualizado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/insights/descartar-todos ─────────────────────
// Descarta todos insights ativos como falsos positivos. Util para limpar
// uma onda de erros sem dar feedback positivo a IA.
router.post('/insights/descartar-todos', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const usuarioId = req.usuario.id;
  try {
    const agora = new Date();
    const r = await prisma.iaInsight.updateMany({
      where: { tenantId, resolvidoEm: null },
      data:  { resolvidoEm: agora, feedbackUtil: false, feedbackEm: agora },
    });
    await logAuditoria({
      tenantId, autorId: usuarioId,
      acao: 'AI_INSIGHTS_DESCARTADOS_EM_LOTE',
      entidadeId: 'todos',
      detalhes: { descartados: r.count, motivo: req.body?.motivo || 'descarte_manual' },
    });
    res.json({ ok: true, descartados: r.count });
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
  const tenantId = req.tenantContext;
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

// ─── POST /api/gehc/aprendizado/extracoes/resetar ────────────────────────────
// Apaga as extracoes de PDF + eventos do Knowledge Layer derivados de PDFs
// (refFonteTipo='gehc_pdf_extraido') + embeddings associados + arquivos PDF
// no R2 + registros gehcPdfDocumento. Insights ativos sao marcados como
// resolvidos.
//
// Diferente de antes, agora o reset eh COMPLETO: como o pipeline novo nao
// salva mais PDFs no R2 (extracao inline durante download), manter os PDFs
// e gehcPdfDocumento legados sem extracao nao serve para nada. Para
// reprocessar, eh necessario rodar "Captura de PDFs GE" para baixar tudo
// de novo.
router.post('/extracoes/resetar', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const usuarioId = req.usuario.id;

  try {
    // 1. Coleta IDs e r2Keys ANTES das deletes (precisamos para apagar do R2
    //    e dos embeddings).
    const [eventosPdf, pdfDocumentos] = await Promise.all([
      prisma.eventoEquipamento.findMany({
        where: { tenantId, refFonteTipo: 'gehc_pdf_extraido' },
        select: { id: true },
      }),
      prisma.gehcPdfDocumento.findMany({
        where: { tenantId, r2Key: { not: null } },
        select: { id: true, r2Key: true },
      }),
    ]);
    const eventoIds = eventosPdf.map((e) => e.id);
    const r2KeysParaApagar = pdfDocumentos.map((p) => p.r2Key).filter(Boolean);

    // 2. Apaga registros do banco em transacao.
    const [embeddingsDel, eventosDel, extracoesDel, documentosDel, insightsDel] =
      await prisma.$transaction([
        prisma.eventoEquipamentoEmbedding.deleteMany({
          where: { tenantId, eventoEquipamentoId: { in: eventoIds } },
        }),
        prisma.eventoEquipamento.deleteMany({
          where: { tenantId, refFonteTipo: 'gehc_pdf_extraido' },
        }),
        prisma.gehcPdfExtraido.deleteMany({ where: { tenantId } }),
        prisma.gehcPdfDocumento.deleteMany({ where: { tenantId } }),
        prisma.iaInsight.updateMany({
          where: { tenantId, resolvidoEm: null },
          data:  { resolvidoEm: new Date() },
        }),
      ]);

    // 3. Apaga arquivos do R2 (best-effort; falhas individuais ja sao
    //    logadas em deleteFromR2). Roda em paralelo limitado para nao
    //    saturar a conexao.
    let arquivosR2Removidos = 0;
    const LOTE = 25;
    for (let i = 0; i < r2KeysParaApagar.length; i += LOTE) {
      const lote = r2KeysParaApagar.slice(i, i + LOTE);
      const resultados = await Promise.all(lote.map((k) => deleteFromR2(k)));
      arquivosR2Removidos += resultados.filter(Boolean).length;
    }

    await logAuditoria({
      tenantId, autorId: usuarioId,
      acao: 'AI_EXTRACOES_RESETADAS',
      entidadeId: 'todos',
      detalhes: {
        embeddingsRemovidos:  embeddingsDel.count,
        eventosRemovidos:     eventosDel.count,
        extracoesRemovidas:   extracoesDel.count,
        documentosRemovidos:  documentosDel.count,
        arquivosR2Removidos,
        insightsResolvidos:   insightsDel.count,
        motivo: req.body?.motivo || 'reset_manual',
      },
    });

    res.json({
      ok: true,
      embeddingsRemovidos:  embeddingsDel.count,
      eventosRemovidos:     eventosDel.count,
      extracoesRemovidas:   extracoesDel.count,
      documentosRemovidos:  documentosDel.count,
      arquivosR2Removidos,
      insightsResolvidos:   insightsDel.count,
      mensagem: 'Reset concluido. Rode "Captura de PDFs GE" para baixar e extrair tudo do zero.',
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] Erro ao resetar extracoes:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/gehc/aprendizado/insights/:id/resolver ────────────────────────
// Marca insight como resolvido manualmente (engenheiro tomou acao).
// Proximo run do insightsGenerator pode regerar se a condicao persistir.
router.patch('/insights/:id/resolver', admin, async (req, res) => {
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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

// ─── GET /api/gehc/aprendizado/causas/:categoria ──────────────────────────────
// Drill-down: devolve as OSs/PDFs classificados naquela categoria, com
// evidencia (raciocinio do LLM, trecho do problema, acoes tomadas) para
// rastreabilidade.
router.get('/causas/:categoria', async (req, res) => {
  const tenantId = req.tenantContext;
  const { categoria } = req.params;
  try {
    const extracoes = await prisma.gehcPdfExtraido.findMany({
      where: { tenantId, rootCauseCategory: categoria },
      orderBy: { extraidoEm: 'desc' },
      take: 100,
      select: {
        id: true,
        pdfDocumentoId: true,
        caseNumber: true,
        woNumber: true,
        serviceType: true,
        equipmentStatus: true,
        engineerFullName: true,
        problemReported: true,
        problemAnalyzed: true,
        actionsTaken: true,
        rootCauseRaw: true,
        openedAt: true,
        rootCauseCategory: true,
        llmConfianca: true,
        llmRaciocinio: true,
        partsReplacedJson: true,
        extraidoEm: true,
        pdfDocumento: {
          select: {
            documentId: true,
            fileName: true,
            r2Key: true,
            equipamento: { select: { id: true, tag: true, apelido: true, modelo: true } },
            ordemServico: {
              select: {
                gehcServiceId: true,
                trackingNumber: true,
                problemDescription: true,
                requestedAt: true,
                serviceTypeCode: true,
              },
            },
          },
        },
      },
    });

    // Achata pra resposta mais limpa.
    const itemsBrutos = extracoes.map((e) => ({
      id: e.id,
      caseNumber: e.caseNumber,
      woNumber: e.woNumber,
      serviceType: e.serviceType,
      serviceTypeCode: e.pdfDocumento?.ordemServico?.serviceTypeCode,
      equipmentStatus: e.equipmentStatus,
      engineerFullName: e.engineerFullName,
      problemReported: e.problemReported,
      problemAnalyzed: e.problemAnalyzed,
      actionsTaken: e.actionsTaken,
      rootCauseRaw: e.rootCauseRaw,
      llmConfianca: e.llmConfianca,
      llmRaciocinio: e.llmRaciocinio,
      partsReplaced: e.partsReplacedJson,
      openedAt: e.openedAt,
      extraidoEm: e.extraidoEm,
      gehcServiceId: e.pdfDocumento?.ordemServico?.gehcServiceId,
      trackingNumber: e.pdfDocumento?.ordemServico?.trackingNumber,
      problemDescriptionOs: e.pdfDocumento?.ordemServico?.problemDescription,
      requestedAt: e.pdfDocumento?.ordemServico?.requestedAt,
      equipamento: e.pdfDocumento?.equipamento,
      pdfDocumentId: e.pdfDocumento?.documentId,
      pdfFileName: e.pdfDocumento?.fileName,
      temArquivoR2: Boolean(e.pdfDocumento?.r2Key),
    }));

    // Dedup por gehcServiceId: cada OS GE pode ter varios PDFs (Service
    // Report + Activity Sheet etc), todos com conteudo praticamente
    // identico. Mostra so o mais recente por OS e devolve o total de PDFs
    // contribuintes para transparencia.
    const porOs = new Map();
    for (const it of itemsBrutos) {
      const chave = it.gehcServiceId || it.id;
      const existente = porOs.get(chave);
      if (!existente) {
        porOs.set(chave, { ...it, pdfsContribuintes: 1 });
      } else {
        existente.pdfsContribuintes += 1;
        // Mantem a extracao mais recente (extraidoEm desc)
        const novaMaisRecente =
          (it.extraidoEm && (!existente.extraidoEm || new Date(it.extraidoEm) > new Date(existente.extraidoEm)));
        if (novaMaisRecente) {
          porOs.set(chave, { ...it, pdfsContribuintes: existente.pdfsContribuintes });
        }
      }
    }
    const items = Array.from(porOs.values());

    res.json({
      categoria,
      total: items.length,            // OSs distintas
      totalPdfs: itemsBrutos.length,  // PDFs analisados
      items,
    });
  } catch (err) {
    console.error('[GEHC_APRENDIZADO] /causas/:categoria:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/equipamentos ───────────────────────────────────
// Lista equipamentos com cobertura de PDF (ordenado por menor cobertura primeiro
// — quem precisa de mais atenção fica no topo).
router.get('/equipamentos', async (req, res) => {
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
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
  const tenantId = req.tenantContext;
  const { documentId } = req.params;
  try {
    // Scoped por (tenantId, documentId): se o PDF eh de outro tenant, retorna
    // 404 sem revelar que ele existe (falha-segura). Antes usava findUnique
    // por PK global e revelava a existencia via 403 separado.
    const doc = await prisma.gehcPdfDocumento.findFirst({
      where:  { tenantId, documentId },
      select: { r2Key: true, fileName: true, baixadoEm: true },
    });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
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
  const tenantId = req.tenantContext;
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
      // PDFs novos nao sao mais persistidos no R2 (extracao inline). Apenas
      // legados ainda podem ser abertos.
      temArquivoR2: Boolean(d.r2Key),
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
  const tenantId = req.tenantContext;
  try {
    // Superadmin do Tenant System enxerga o kill switch 'global' + identidade
    // de quem operou globalmente. Admin de tenant comum so ve seus pipelines
    // e estado herdado (com pausadoPor/motivo mascarados).
    const escopoVisivel = ehSuperadminSystem(req) ? 'system' : 'tenant';
    const pipelines = await listarEstados({ tenantId, escopoVisivel });
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
  const tenantId = req.tenantContext;
  const usuarioId = req.usuario.id;
  const { pipeline } = req.params;
  const { motivo, escopo = 'tenant' } = req.body || {};

  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }

  // Pausa global exige superadmin do Tenant System. Admin de tenant
  // comum so pode pausar o proprio tenant — ignora silenciosamente o
  // escopo='global' do body em vez de aceitar.
  if (escopo === 'global' && !ehSuperadminSystem(req)) {
    return res.status(403).json({
      error: 'Pausa global de pipeline reservada ao superadmin do Tenant System.',
    });
  }
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
  const tenantId = req.tenantContext;
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
    console.log(
      `[DISPARAR] pipeline=${pipeline} usuario=${usuarioId} ok=${r.ok} ` +
      `jobId=${r.jobId || '-'} motivo=${r.motivo || '-'}`
    );
    if (!r.ok) {
      // 409 quando ja ha job em execucao — front trata como estado, nao erro.
      if (r.jaEmExecucao) {
        return res.status(409).json({ error: r.motivo, jaEmExecucao: true });
      }
      return res.status(503).json({ error: r.motivo });
    }

    await logAuditoria({
      tenantId, autorId: usuarioId,
      acao: 'AI_PIPELINE_DISPARADO',
      entidadeId: pipeline,
      detalhes: { jobId: r.jobId, jobName: r.jobName },
    });

    res.json({ ok: true, jobId: r.jobId, jobName: r.jobName });
  } catch (err) {
    console.error(`[DISPARAR] pipeline=${pipeline} erro=${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gehc/aprendizado/pipelines/:pipeline/job-status ────────────────
// Retorna se ha job do pipeline rodando/aguardando. Usado pelo front para
// fazer polling enquanto o botao "Rodar agora" mostra o spinner.
router.get('/pipelines/:pipeline/job-status', async (req, res) => {
  const { pipeline } = req.params;
  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }
  try {
    const status = await statusDoJobDoPipeline(pipeline);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gehc/aprendizado/pipelines/:pipeline/retomar ───────────────────
router.post('/pipelines/:pipeline/retomar', admin, async (req, res) => {
  const tenantId = req.tenantContext;
  const usuarioId = req.usuario.id;
  const { pipeline } = req.params;
  const { escopo = 'tenant' } = req.body || {};

  if (!pipelineValido(pipeline)) {
    return res.status(400).json({ error: `Pipeline desconhecido: ${pipeline}` });
  }

  if (escopo === 'global' && !ehSuperadminSystem(req)) {
    return res.status(403).json({
      error: 'Retomada global de pipeline reservada ao superadmin do Tenant System.',
    });
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
