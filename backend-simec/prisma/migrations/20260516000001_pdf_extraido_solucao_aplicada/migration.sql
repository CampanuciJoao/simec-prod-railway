-- Adiciona coluna `solucao_aplicada` em `gehc_pdf_extraidos` para alimentar
-- a camada cross-tenant do Knowledge Agent (ADR-018). Categoria da intervenção
-- aplicada (troca_peca, recalibracao, firmware, etc.) — whitelist V1.
--
-- Backfill: registros existentes ficam com NULL. O orquestrador de extração
-- reprocessa automaticamente todo o backlog porque o LLM_EXTRACTOR_VERSION
-- foi bumpado de 1 para 2 (ver gehcPdfExtractionOrchestrator.js: filtra
-- pdfs com extractorVersion < VERSAO_COMPOSTA).

ALTER TABLE "gehc_pdf_extraidos"
  ADD COLUMN "solucao_aplicada" TEXT;

CREATE INDEX "gehc_pdf_extraidos_tenantId_solucao_aplicada_idx"
  ON "gehc_pdf_extraidos"("tenantId", "solucao_aplicada");
