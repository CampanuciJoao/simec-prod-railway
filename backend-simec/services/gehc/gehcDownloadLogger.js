// Logger estruturado do gehcDocumentDownloader.
//
// Cada tentativa de download (incluindo retry inline) gera 1 entry em
// gehc_download_logs com:
// - categoria do resultado (SUCESSO ou tipo de falha)
// - timeline das etapas (botao_visivel, click_botao, popup_aberto,
//   checkbox_marcado, download_event, etc) com timestamps
// - duracao total
// - tentativaN (1, 2, 3 — dentro do retry inline)
//
// Quando um documento eventualmente baixa com sucesso, marca os logs
// anteriores do mesmo documentId como resolvido=true.

import prisma from '../prismaService.js';

export const CATEGORIAS_LOG = {
  SUCESSO: 'SUCESSO',
  TIMEOUT_DOWNLOAD: 'TIMEOUT_DOWNLOAD',
  POPUP_NAO_ABRIU: 'POPUP_NAO_ABRIU',
  BOTAO_NAO_ENCONTRADO: 'BOTAO_NAO_ENCONTRADO',
  SESSAO_PERDIDA: 'SESSAO_PERDIDA',
  DOCUMENT_SEARCH_FALHOU: 'DOCUMENT_SEARCH_FALHOU',
  EXTRACAO_FALHOU: 'EXTRACAO_FALHOU',
  FALHA_SISTEMICA: 'FALHA_SISTEMICA',
  OUTRO: 'OUTRO',
};

// Categoriza uma mensagem de erro bruta em uma das categorias acima.
// Usado no catch genérico — quando ja sabemos a categoria especifica,
// passa direto.
export function categorizarErro(mensagem = '') {
  const m = String(mensagem).toLowerCase();
  if (m.includes('sessao_perdida') || m.includes('logon.gehealthcare') || m.includes('loginflow')) {
    return CATEGORIAS_LOG.SESSAO_PERDIDA;
  }
  if (m.includes('timeout') && m.includes('download')) {
    return CATEGORIAS_LOG.TIMEOUT_DOWNLOAD;
  }
  if (m.includes('popup')) return CATEGORIAS_LOG.POPUP_NAO_ABRIU;
  if (m.includes('botao_download_nao_visivel') || m.includes('button_not_found')) {
    return CATEGORIAS_LOG.BOTAO_NAO_ENCONTRADO;
  }
  if (m.includes('documentsearch') || m.includes('document_search')) {
    return CATEGORIAS_LOG.DOCUMENT_SEARCH_FALHOU;
  }
  if (m.includes('extracao') || m.includes('pdf-parse') || m.includes('pdf_parse')) {
    return CATEGORIAS_LOG.EXTRACAO_FALHOU;
  }
  return CATEGORIAS_LOG.OUTRO;
}

/**
 * Construtor de timeline de etapas. Uso:
 *   const t = novaTimeline();
 *   t.marcar('botao_visivel', { ok: true });
 *   ...
 *   const log = t.finalizar();
 */
export function novaTimeline() {
  const inicio = Date.now();
  const etapas = [];
  return {
    marcar(etapa, info = {}) {
      etapas.push({
        etapa,
        ms: Date.now() - inicio,
        ok: info.ok !== false,
        ...info,
      });
    },
    finalizar() {
      return {
        etapas,
        duracaoMs: Date.now() - inicio,
      };
    },
  };
}

/**
 * Persiste um log de download. Soft-failable — nunca lanca erro pra fora,
 * porque diagnostico nao pode quebrar o downloader.
 */
export async function registrarLog({
  tenantId,
  documentId = null,
  fileName = null,
  equipamentoId = null,
  ordemServicoId = null,
  trackingNumber = null,
  categoria,
  mensagem = null,
  etapas = null,
  duracaoMs = null,
  tentativaN = 1,
}) {
  try {
    await prisma.gehcDownloadLog.create({
      data: {
        tenantId,
        documentId,
        fileName,
        equipamentoId,
        ordemServicoId,
        trackingNumber,
        categoria,
        mensagem: mensagem ? String(mensagem).slice(0, 2000) : null,
        etapasJson: etapas ? JSON.stringify(etapas).slice(0, 8000) : null,
        duracaoMs,
        tentativaN,
      },
    });
  } catch (err) {
    console.error('[GEHC_DOWNLOAD_LOG] Falha ao persistir log:', err.message);
  }
}

/**
 * Marca como resolvido todos os logs anteriores de um documentId que
 * tinham falhado. Util para calcular % de sucesso eventual.
 */
export async function marcarComoResolvido({ tenantId, documentId }) {
  if (!documentId) return;
  try {
    await prisma.gehcDownloadLog.updateMany({
      where: { tenantId, documentId, resolvido: false, categoria: { not: 'SUCESSO' } },
      data: { resolvido: true, resolvidoEm: new Date() },
    });
  } catch { /* nao bloqueia */ }
}

// Politica de retencao — evita crescimento infinito da tabela.
// SUCESSO eh purgado em 30 dias (informacao operacional sem valor pos-mortem).
// Falhas recuperadas (resolvido=true) em 60 dias.
// Falhas nao resolvidas em 180 dias (auditoria mais longa).
const RETENCAO = {
  SUCESSO_DIAS: 30,
  RESOLVIDO_DIAS: 60,
  PADRAO_DIAS: 180,
};

/**
 * Cleanup automatico — apaga logs antigos conforme politica de retencao.
 * Roda em cron (vide queueService).
 */
export async function purgarLogsAntigos() {
  const agora = Date.now();
  const limiteSucesso = new Date(agora - RETENCAO.SUCESSO_DIAS * 86_400_000);
  const limiteResolvido = new Date(agora - RETENCAO.RESOLVIDO_DIAS * 86_400_000);
  const limitePadrao = new Date(agora - RETENCAO.PADRAO_DIAS * 86_400_000);

  try {
    const [s, r, p] = await Promise.all([
      prisma.gehcDownloadLog.deleteMany({
        where: { categoria: 'SUCESSO', createdAt: { lt: limiteSucesso } },
      }),
      prisma.gehcDownloadLog.deleteMany({
        where: { resolvido: true, createdAt: { lt: limiteResolvido } },
      }),
      prisma.gehcDownloadLog.deleteMany({
        where: { createdAt: { lt: limitePadrao } },
      }),
    ]);
    const total = (s.count || 0) + (r.count || 0) + (p.count || 0);
    if (total > 0) {
      console.log(
        `[GEHC_DOWNLOAD_LOG] Purgou ${total} log(s) antigos (sucesso=${s.count}, resolvido=${r.count}, padrao=${p.count}).`
      );
    }
    return { purgados: total };
  } catch (e) {
    console.error('[GEHC_DOWNLOAD_LOG] Falha no cleanup:', e.message);
    return { purgados: 0, erro: e.message };
  }
}
