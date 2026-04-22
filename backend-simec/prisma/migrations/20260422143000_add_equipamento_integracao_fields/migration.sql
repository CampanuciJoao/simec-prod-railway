ALTER TABLE "equipamentos"
  ADD COLUMN IF NOT EXISTS "ae_title" TEXT,
  ADD COLUMN IF NOT EXISTS "telefone_suporte" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "equipamentos_tenantId_ae_title_key"
  ON "equipamentos"("tenantId", "ae_title");

CREATE INDEX IF NOT EXISTS "equipamentos_tenantId_ae_title_idx"
  ON "equipamentos"("tenantId", "ae_title");
