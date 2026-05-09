-- CreateTable
CREATE TABLE "gehc_alerta_suspensoes" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "equipamento_id" TEXT,
    "tipo_evento"    TEXT,
    "motivo"         TEXT,
    "suspenso_ate"   TIMESTAMP(3) NOT NULL,
    "criado_por"     TEXT NOT NULL,
    "criado_em"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gehc_alerta_suspensoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gehc_alerta_suspensoes_tenantId_suspenso_ate_idx"
    ON "gehc_alerta_suspensoes"("tenantId", "suspenso_ate");

CREATE INDEX "gehc_alerta_suspensoes_tenantId_equipamento_id_idx"
    ON "gehc_alerta_suspensoes"("tenantId", "equipamento_id");

-- AddForeignKey
ALTER TABLE "gehc_alerta_suspensoes"
    ADD CONSTRAINT "gehc_alerta_suspensoes_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
