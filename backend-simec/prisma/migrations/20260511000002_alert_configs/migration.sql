-- Centro de configuracao de alertas (multi-modulo).
-- Tabela generica para overrides de thresholds por tenant + modulo.
-- Modulo atual: GEHC. Futuros: MANUTENCAO, SEGUROS, etc.

CREATE TABLE "alert_configs" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "module"    TEXT NOT NULL,
  "config"    JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT,

  CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alert_configs_tenantId_module_key" ON "alert_configs"("tenantId", "module");
CREATE INDEX "alert_configs_tenantId_idx" ON "alert_configs"("tenantId");

ALTER TABLE "alert_configs"
  ADD CONSTRAINT "alert_configs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
