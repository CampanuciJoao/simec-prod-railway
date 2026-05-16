// Orquestrador da extracao de PDFs de OS GE.
// Liga: download do R2 -> Camada 1 (regex) -> Camada 2 (LLM) -> persistencia
// em gehc_pdf_extraidos. Respeita pausa do pipeline GEHC_EXTRACAO_PDF.
//
// Idempotencia: cada PDF tem 1:1 com extraido. Reprocessamento (bumpa
// extractorVersion) atualiza a mesma linha sem perder histórico de tentativas.

import prisma from '../prismaService.js';
import { getFromR2 } from '../uploads/fileStorageService.js';
import { extrairCamposDoPdf, REGEX_EXTRACTOR_VERSION } from './gehcPdfTextExtractor.js';
import { extrairCamposViaLlm, LLM_EXTRACTOR_VERSION_EXPORT } from './gehcPdfLlmExtractor.js';
import { estaAtivo, PIPELINE_NAMES } from '../ai/aiPipelineState.js';

const RATE_LIMIT_PDF_MS    = 1500;  // entre PDFs do mesmo tenant (LLM rate limit)
const RATE_LIMIT_TENANT_MS = 5000;
const VERSAO_COMPOSTA      = REGEX_EXTRACTOR_VERSION * 100 + LLM_EXTRACTOR_VERSION_EXPORT;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function bufferDoR2(key) {
  const obj = await getFromR2(key);
  if (!obj?.Body) throw new Error('r2_objeto_sem_body');
  const chunks = [];
  for await (const chunk of obj.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ─── Extracao de UM PDF (orquestracao) ───────────────────────────────────────
//
// Aceita um buffer opcional para o caso novo (extracao inline no momento do
// download — PDFs nao sao mais persistidos em R2). Quando o buffer nao vem,
// tenta carregar do R2 via r2Key (caminho legado para PDFs antigos enquanto
// existirem no bucket).
export async function extrairUmPdf({ pdfDocumento, buffer: bufferInline = null }) {
  const { id: pdfDocumentoId, tenantId, r2Key } = pdfDocumento;

  let buffer = bufferInline;

  if (!buffer) {
    if (!r2Key) {
      return { ok: false, erro: 'pdf_sem_r2_key_e_sem_buffer' };
    }
    try {
      buffer = await bufferDoR2(r2Key);
    } catch (err) {
      await registrarFalhaExtracao({ pdfDocumentoId, tenantId, erro: `r2_get_failed: ${err.message}` });
      return { ok: false, erro: `r2_get_failed: ${err.message}` };
    }
  }

  // 2. Camada 1: regex.
  const regex = await extrairCamposDoPdf(buffer);
  if (!regex.ok) {
    await registrarFalhaExtracao({ pdfDocumentoId, tenantId, erro: `regex_failed: ${regex.erro}` });
    return { ok: false, erro: `regex_failed: ${regex.erro}` };
  }

  // 3. Camada 2: LLM. Falha aqui nao bloqueia — persiste o que tem da Camada 1
  //    com llmError preenchido para retry no proximo cron.
  const llm = await extrairCamposViaLlm({ tenantId, regexCampos: regex.campos });

  // 4. Persiste tudo.
  const dataBase = {
    tenantId,
    pdfDocumentoId,

    // Camada 1
    caseNumber:       regex.campos.caseNumber,
    woNumber:         regex.campos.woNumber,
    serviceType:      regex.campos.serviceType,
    equipmentStatus:  regex.campos.equipmentStatus,
    systemId:         regex.campos.systemId,
    serialNumber:     regex.campos.serialNumber,
    engineerFullName: regex.campos.engineerFullName,
    problemReported:  regex.campos.problemReported,
    problemAnalyzed:  regex.campos.problemAnalyzed,
    actionsTaken:     regex.campos.actionsTaken,
    rootCauseRaw:     regex.campos.rootCauseRaw,
    testsPerformed:   regex.campos.testsPerformed,
    totalMinutes:     regex.campos.totalMinutes,
    openedAt:         regex.campos.openedAt,

    // Camada 2 (pode ser null se LLM falhou)
    rootCauseCategory: llm.ok ? llm.dados.rootCauseCategory : null,
    solucaoAplicada:   llm.ok ? llm.dados.solucaoAplicada   : null,
    llmConfianca:      llm.ok ? (llm.dados.confianca ?? null)  : null,
    llmRaciocinio:     llm.ok ? (llm.dados.raciocinio ?? null) : null,
    measurementsJson:  llm.ok ? llm.dados.measurements      : null,
    partsReplacedJson: llm.ok ? llm.dados.partsReplaced     : null,
    llmExtractedAt:    llm.ok ? new Date()                  : null,
    llmModel:          llm.ok ? llm.llmModel                : null,
    llmError:          llm.ok ? null                        : llm.erro,

    extractorVersion:  VERSAO_COMPOSTA,
    rawTextHash:       regex.rawTextHash,
    extractionError:   null,
    extraidoEm:        new Date(),
    ultimaTentativaEm: new Date(),
  };

  await prisma.gehcPdfExtraido.upsert({
    where:  { pdfDocumentoId },
    create: { ...dataBase, tentativas: 1 },
    update: { ...dataBase, tentativas: { increment: 1 } },
  });

  return { ok: true, llmOk: llm.ok };
}

async function registrarFalhaExtracao({ pdfDocumentoId, tenantId, erro }) {
  await prisma.gehcPdfExtraido.upsert({
    where:  { pdfDocumentoId },
    create: {
      tenantId,
      pdfDocumentoId,
      extractorVersion:  VERSAO_COMPOSTA,
      extractionError:   erro?.slice(0, 1000) || 'erro_desconhecido',
      tentativas:        1,
      ultimaTentativaEm: new Date(),
    },
    update: {
      extractionError:   erro?.slice(0, 1000) || 'erro_desconhecido',
      tentativas:        { increment: 1 },
      ultimaTentativaEm: new Date(),
    },
  });
}

// ─── Backfill: para cada PDF baixado sem extracao (ou com versao antiga) ────

export async function executarExtracaoPdfsTenant({ tenantId, limite = 100 } = {}) {
  if (!tenantId) throw new Error('tenantId obrigatorio');

  const ativo = await estaAtivo(PIPELINE_NAMES.GEHC_EXTRACAO_PDF, tenantId);
  if (!ativo) {
    console.log(`[GEHC_EXTRACAO] Pipeline pausado para tenant ${tenantId}.`);
    return { processados: 0, sucessos: 0, motivo: 'pipeline_pausado' };
  }

  // PDFs baixados que ainda nao foram extraidos OU que foram extraidos numa
  // versao anterior do extrator (reprocessamento automatico apos bump).
  const pdfs = await prisma.gehcPdfDocumento.findMany({
    where: {
      tenantId,
      baixadoEm: { not: null },
      OR: [
        { extraido: null },
        { extraido: { extractorVersion: { lt: VERSAO_COMPOSTA } } },
      ],
    },
    take: limite,
    orderBy: { baixadoEm: 'desc' },
  });

  if (!pdfs.length) {
    console.log(`[GEHC_EXTRACAO] Nada a extrair para tenant ${tenantId}.`);
    return { processados: 0, sucessos: 0 };
  }

  console.log(`[GEHC_EXTRACAO] Tenant=${tenantId} — ${pdfs.length} PDF(s) para extrair (versao alvo ${VERSAO_COMPOSTA}).`);

  let sucessos = 0;
  let processados = 0;

  for (const pdf of pdfs) {
    if (!(await estaAtivo(PIPELINE_NAMES.GEHC_EXTRACAO_PDF, tenantId))) {
      console.log('[GEHC_EXTRACAO] Pipeline pausado durante execucao — interrompendo.');
      break;
    }

    try {
      const r = await extrairUmPdf({ pdfDocumento: pdf });
      processados++;
      if (r.ok) sucessos++;
      console.log(
        `[GEHC_EXTRACAO] PDF ${pdf.documentId}: ${r.ok ? (r.llmOk ? 'ok' : 'ok-sem-llm') : 'falha'}` +
        (r.erro ? ` · ${r.erro}` : '')
      );
    } catch (err) {
      console.error(`[GEHC_EXTRACAO] Erro PDF ${pdf.documentId}:`, err.message);
    }

    await sleep(RATE_LIMIT_PDF_MS);
  }

  return { processados, sucessos };
}

export async function executarExtracaoTodosTenants({ limite = 100 } = {}) {
  const ativoGlobal = await estaAtivo(PIPELINE_NAMES.GEHC_EXTRACAO_PDF);
  if (!ativoGlobal) {
    console.log('[GEHC_EXTRACAO] Pipeline globalmente pausado.');
    return { tenants: 0, processados: 0, sucessos: 0 };
  }

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
  });

  let totalProcessados = 0;
  let totalSucessos    = 0;

  for (const t of tenants) {
    try {
      const r = await executarExtracaoPdfsTenant({ tenantId: t.id, limite });
      totalProcessados += r.processados || 0;
      totalSucessos    += r.sucessos    || 0;
    } catch (err) {
      console.error(`[GEHC_EXTRACAO] Tenant ${t.nome} (${t.id}) falhou:`, err.message);
    }
    await sleep(RATE_LIMIT_TENANT_MS);
  }

  return { tenants: tenants.length, processados: totalProcessados, sucessos: totalSucessos };
}

export const VERSAO_COMPOSTA_EXPORT = VERSAO_COMPOSTA;
