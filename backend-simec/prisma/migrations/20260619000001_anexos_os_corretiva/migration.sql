-- Vincula anexos a OS Corretiva. O usuario pediu poder anexar fotos e
-- documentos durante a OS e tambem depois de fechadas (Concluida /
-- Cancelada), entao a FK e opcional e CASCADE: se a OS for excluida,
-- os anexos vao junto. Mantem padrao polimorfico igual aos demais
-- recursos (manutencoes, equipamentos, etc).

ALTER TABLE "anexos"
  ADD COLUMN "os_corretiva_id" TEXT;

CREATE INDEX "anexos_tenantId_os_corretiva_id_idx"
  ON "anexos"("tenantId", "os_corretiva_id");

ALTER TABLE "anexos"
  ADD CONSTRAINT "anexos_os_corretiva_fkey"
  FOREIGN KEY ("tenantId", "os_corretiva_id")
  REFERENCES "os_corretivas"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
