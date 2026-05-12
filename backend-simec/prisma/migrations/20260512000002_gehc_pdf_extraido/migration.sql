-- Extração estruturada do conteúdo dos PDFs de OS GE.
-- Cada PDF baixado pelo PR1 (gehc_pdf_documentos) gera 0 ou 1 linha aqui.
-- Camada 1: campos fixos extraídos por regex sobre o texto do PDF.
-- Camada 2: campos normalizados por LLM (taxonomia de causa-raiz, medições).
--
-- extractor_version permite reprocessamento: ao subir a versão (mudou regex,
-- mudou prompt), o worker noturno re-extrai todos os PDFs com versão antiga
-- sem precisar re-baixar do portal GE.

CREATE TABLE "gehc_pdf_extraidos" (
  "id"                TEXT NOT NULL,
  "tenantId"          TEXT NOT NULL,
  "pdf_documento_id"  TEXT NOT NULL,

  -- ─── Camada 1: regex sobre texto cru do PDF ─────────────────────────────
  "case_number"       TEXT,
  "wo_number"         TEXT,
  "service_type"      TEXT,
  "equipment_status"  TEXT,
  "system_id"         TEXT,
  "serial_number"     TEXT,
  "engineer_full_name" TEXT,
  "problem_reported"  TEXT,
  "problem_analyzed"  TEXT,
  "actions_taken"     TEXT,
  "root_cause_raw"    TEXT,
  "tests_performed"   TEXT,
  "total_minutes"     INTEGER,
  "opened_at"         TIMESTAMP(3),

  -- ─── Camada 2: LLM normaliza e extrai dados estruturados ───────────────
  "root_cause_category"  TEXT,
  "measurements_json"    JSONB,
  "parts_replaced_json"  JSONB,
  "llm_extracted_at"     TIMESTAMP(3),
  "llm_model"            TEXT,
  "llm_error"            TEXT,

  -- ─── Versionamento e controle ──────────────────────────────────────────
  "extractor_version" INTEGER NOT NULL DEFAULT 1,
  "raw_text_hash"     TEXT,
  "extraction_error"  TEXT,
  "extraido_em"       TIMESTAMP(3),
  "tentativas"        INTEGER NOT NULL DEFAULT 0,
  "ultima_tentativa_em" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "gehc_pdf_extraidos_pkey" PRIMARY KEY ("id")
);

-- 1:1 com pdf_documento — cada PDF gera no máximo uma extração.
CREATE UNIQUE INDEX "gehc_pdf_extraidos_pdf_documento_id_key"
  ON "gehc_pdf_extraidos"("pdf_documento_id");

CREATE INDEX "gehc_pdf_extraidos_tenantId_root_cause_category_idx"
  ON "gehc_pdf_extraidos"("tenantId", "root_cause_category");

CREATE INDEX "gehc_pdf_extraidos_tenantId_extraido_em_idx"
  ON "gehc_pdf_extraidos"("tenantId", "extraido_em");

CREATE INDEX "gehc_pdf_extraidos_extractor_version_extraido_em_idx"
  ON "gehc_pdf_extraidos"("extractor_version", "extraido_em");

ALTER TABLE "gehc_pdf_extraidos"
  ADD CONSTRAINT "gehc_pdf_extraidos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gehc_pdf_extraidos"
  ADD CONSTRAINT "gehc_pdf_extraidos_pdf_documento_id_fkey"
  FOREIGN KEY ("pdf_documento_id") REFERENCES "gehc_pdf_documentos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
