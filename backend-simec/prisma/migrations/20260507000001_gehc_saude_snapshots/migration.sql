-- Vincula equipamentos GE ao portal MyEquipment 360
ALTER TABLE "equipamentos" ADD COLUMN IF NOT EXISTS "gehc_asset_id" TEXT;

-- Histórico de saúde das RMs GE (hélio, pressão, temperatura, etc.)
CREATE TABLE IF NOT EXISTS "gehc_saude_snapshots" (
    "id"                   TEXT NOT NULL,
    "tenantId"             TEXT NOT NULL,
    "equipamento_id"       TEXT NOT NULL,
    "captured_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "helium_level_pct"     DOUBLE PRECISION,
    "helium_pressure_psi"  DOUBLE PRECISION,
    "compressor_status"    TEXT,
    "coolant_flow_gpm"     DOUBLE PRECISION,
    "coolant_temp_c"       DOUBLE PRECISION,
    "cryocooler_status"    TEXT,
    "magnet_online"        BOOLEAN,
    "equipment_online"     BOOLEAN,
    "raw_json"             TEXT,

    CONSTRAINT "gehc_saude_snapshots_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "gehc_saude_snapshots"
    ADD CONSTRAINT "gehc_saude_snapshots_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gehc_saude_snapshots"
    ADD CONSTRAINT "gehc_saude_snapshots_tenantId_equipamento_id_fkey"
    FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS "gehc_saude_snapshots_tenantId_equipamento_id_captured_at_idx"
    ON "gehc_saude_snapshots" ("tenantId", "equipamento_id", "captured_at" DESC);

CREATE INDEX IF NOT EXISTS "gehc_saude_snapshots_tenantId_captured_at_idx"
    ON "gehc_saude_snapshots" ("tenantId", "captured_at" DESC);
