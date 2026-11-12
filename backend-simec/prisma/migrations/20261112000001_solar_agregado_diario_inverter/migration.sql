-- Agregado diario POR inverter. Permite backfill de cada inverter sem
-- sobrescrever o do outro na mesma planta (bug observado em SEDE que
-- tem Growatt + Sungrow juntos). O agregado por planta e derivado como
-- soma dos agregados dos inverters dela.

CREATE TABLE IF NOT EXISTS "solar_agregados_diarios_inverter" (
  "id"          TEXT PRIMARY KEY,
  "tenantId"    TEXT NOT NULL,
  "plant_id"    TEXT NOT NULL,
  "inverter_id" TEXT NOT NULL,
  "dia"         DATE NOT NULL,
  "kwh_gerado"  DOUBLE PRECISION,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "solar_agregados_diarios_inverter_tenant_fkey"
    FOREIGN KEY ("tenantId")    REFERENCES "tenants"("id")         ON DELETE CASCADE,
  CONSTRAINT "solar_agregados_diarios_inverter_plant_fkey"
    FOREIGN KEY ("plant_id")    REFERENCES "solar_plants"("id")    ON DELETE CASCADE,
  CONSTRAINT "solar_agregados_diarios_inverter_inverter_fkey"
    FOREIGN KEY ("inverter_id") REFERENCES "solar_inverters"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "solar_agregados_diarios_inverter_inverterId_dia_key"
  ON "solar_agregados_diarios_inverter" ("inverter_id", "dia");

CREATE INDEX IF NOT EXISTS "solar_agregados_diarios_inverter_tenantId_plant_id_dia_idx"
  ON "solar_agregados_diarios_inverter" ("tenantId", "plant_id", "dia");
