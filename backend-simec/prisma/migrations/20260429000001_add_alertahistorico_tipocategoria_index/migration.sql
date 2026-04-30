-- Cria a tabela alertas_historico caso ainda não exista (ela não tem migration própria)
-- e adiciona o índice composto por tipoCategoria + dataAlerta.
-- Todos os índices usam IF NOT EXISTS para ser idempotente.

CREATE TABLE IF NOT EXISTS "alertas_historico" (
  "id"              TEXT        NOT NULL,
  "tenantId"        TEXT        NOT NULL,
  "alerta_id"       TEXT        NOT NULL,
  "titulo"          TEXT        NOT NULL,
  "subtitulo"       TEXT,
  "tipo"            TEXT        NOT NULL,
  "tipo_categoria"  TEXT,
  "tipo_evento"     TEXT,
  "prioridade"      TEXT        NOT NULL,
  "link"            TEXT,
  "numero_os"       TEXT,
  "data_alerta"     TIMESTAMP(3) NOT NULL,
  "data_arquivado"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motivo_arquivo"  TEXT        NOT NULL DEFAULT 'retencao_automatica',
  "metadata_json"   TEXT,
  CONSTRAINT "alertas_historico_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alertas_historico_tenantId_fkey'
  ) THEN
    ALTER TABLE "alertas_historico"
      ADD CONSTRAINT "alertas_historico_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "alertas_historico_tenantId_data_alerta_idx"
  ON "alertas_historico"("tenantId", "data_alerta" DESC);

CREATE INDEX IF NOT EXISTS "alertas_historico_tenantId_tipo_data_alerta_idx"
  ON "alertas_historico"("tenantId", "tipo", "data_alerta" DESC);

CREATE INDEX IF NOT EXISTS "alertas_historico_tenantId_tipo_categoria_data_alerta_idx"
  ON "alertas_historico"("tenantId", "tipo_categoria", "data_alerta" DESC);

CREATE INDEX IF NOT EXISTS "alertas_historico_tenantId_prioridade_data_alerta_idx"
  ON "alertas_historico"("tenantId", "prioridade", "data_alerta" DESC);

CREATE INDEX IF NOT EXISTS "alertas_historico_tenantId_data_arquivado_idx"
  ON "alertas_historico"("tenantId", "data_arquivado" DESC);
