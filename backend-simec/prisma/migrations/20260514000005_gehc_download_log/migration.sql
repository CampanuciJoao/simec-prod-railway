-- Log estruturado de cada tentativa do gehcDocumentDownloader.
-- Permite diagnostico granular sem precisar de log do Railway:
-- categoria do erro + timeline das etapas + duracao.

CREATE TABLE "gehc_download_logs" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "documentId"       TEXT,
  "fileName"         TEXT,
  "equipamentoId"    TEXT,
  "ordemServicoId"   TEXT,
  "trackingNumber"   TEXT,

  -- Categoria do resultado/erro:
  -- SUCESSO, TIMEOUT_DOWNLOAD, POPUP_NAO_ABRIU, BOTAO_NAO_ENCONTRADO,
  -- SESSAO_PERDIDA, S3_LENTO, EXTRACAO_FALHOU, R2_UPLOAD_FALHOU,
  -- DOCUMENT_SEARCH_FALHOU, OUTRO
  "categoria"        TEXT NOT NULL,
  "mensagem"         TEXT,
  "etapasJson"       TEXT,  -- JSON: [{etapa, ok, ms, erro?}]
  "duracaoMs"        INTEGER,
  "tentativaN"       INTEGER NOT NULL DEFAULT 1,

  -- Indica se essa falha foi posteriormente resolvida
  -- (mesmo documentId baixou com sucesso depois).
  "resolvido"        BOOLEAN NOT NULL DEFAULT false,
  "resolvidoEm"      TIMESTAMP(3),

  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gehc_download_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gehc_download_logs_tenant_created_idx"
  ON "gehc_download_logs"("tenantId", "createdAt" DESC);

CREATE INDEX "gehc_download_logs_tenant_categoria_idx"
  ON "gehc_download_logs"("tenantId", "categoria");

CREATE INDEX "gehc_download_logs_tenant_resolvido_idx"
  ON "gehc_download_logs"("tenantId", "resolvido", "createdAt" DESC);

CREATE INDEX "gehc_download_logs_documentId_idx"
  ON "gehc_download_logs"("documentId");

ALTER TABLE "gehc_download_logs"
  ADD CONSTRAINT "gehc_download_logs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
