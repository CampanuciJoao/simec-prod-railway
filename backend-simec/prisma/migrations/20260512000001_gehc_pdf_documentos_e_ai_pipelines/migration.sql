-- Captura de PDFs de OS GE (insumo bruto para a IA preditiva).
-- Cada OS GE pode ter 1+ documentos (Relatório de Serviço principal e anexos).
-- O PDF é baixado via Playwright autenticado e armazenado em R2 (Cloudflare).
-- A extração estruturada (causa-raiz, medições) acontece em PR separado.

CREATE TABLE "gehc_pdf_documentos" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "equipamento_id"   TEXT NOT NULL,
  "ordem_servico_id" TEXT NOT NULL,

  "document_id"      TEXT NOT NULL,
  "file_name"        TEXT NOT NULL,
  "file_hash"        TEXT,
  "file_size_bytes"  INTEGER,

  "r2_key"           TEXT,

  "baixado_em"       TIMESTAMP(3),
  "tentativas"       INTEGER NOT NULL DEFAULT 0,
  "ultimo_erro"      TEXT,
  "ultima_tentativa_em" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "gehc_pdf_documentos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gehc_pdf_documentos_document_id_key"
  ON "gehc_pdf_documentos"("document_id");

CREATE INDEX "gehc_pdf_documentos_tenantId_equipamento_id_idx"
  ON "gehc_pdf_documentos"("tenantId", "equipamento_id");

CREATE INDEX "gehc_pdf_documentos_tenantId_ordem_servico_id_idx"
  ON "gehc_pdf_documentos"("tenantId", "ordem_servico_id");

CREATE INDEX "gehc_pdf_documentos_baixado_em_idx"
  ON "gehc_pdf_documentos"("baixado_em");

ALTER TABLE "gehc_pdf_documentos"
  ADD CONSTRAINT "gehc_pdf_documentos_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gehc_pdf_documentos"
  ADD CONSTRAINT "gehc_pdf_documentos_tenantId_equipamento_id_fkey"
  FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gehc_pdf_documentos"
  ADD CONSTRAINT "gehc_pdf_documentos_ordem_servico_id_fkey"
  FOREIGN KEY ("ordem_servico_id") REFERENCES "gehc_ordens_servico"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Estado dos pipelines automáticos da IA (kill switch global + pausa por pipeline).
-- tenantId = NULL representa estado global aplicável a todos os tenants.
-- Workers checam este estado antes de executar; se pausado, só fazem log.

CREATE TABLE "ai_pipeline_estados" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT,
  "pipeline"       TEXT NOT NULL,
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "pausado_em"     TIMESTAMP(3),
  "pausado_por_id" TEXT,
  "motivo_pausa"   TEXT,
  "retomado_em"    TIMESTAMP(3),
  "retomado_por_id" TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_pipeline_estados_pkey" PRIMARY KEY ("id")
);

-- Unique parcial: tenantId NULL é tratado como global; mesmo pipeline pode existir
-- por tenant (override). Postgres trata NULL como distinto, então criamos dois índices.
CREATE UNIQUE INDEX "ai_pipeline_estados_global_pipeline_key"
  ON "ai_pipeline_estados"("pipeline")
  WHERE "tenantId" IS NULL;

CREATE UNIQUE INDEX "ai_pipeline_estados_tenant_pipeline_key"
  ON "ai_pipeline_estados"("tenantId", "pipeline")
  WHERE "tenantId" IS NOT NULL;

ALTER TABLE "ai_pipeline_estados"
  ADD CONSTRAINT "ai_pipeline_estados_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_pipeline_estados"
  ADD CONSTRAINT "ai_pipeline_estados_pausado_por_id_fkey"
  FOREIGN KEY ("pausado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_pipeline_estados"
  ADD CONSTRAINT "ai_pipeline_estados_retomado_por_id_fkey"
  FOREIGN KEY ("retomado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
