-- FoxESS integration: solar inverter + battery monitoring per unit.
-- 3 tables: Site (install), Snapshot (telemetry polling, every 60s),
-- Queda (grid outage event aggregated from snapshots).
--
-- API key is stored encrypted (AES-256-GCM, foxessCrypto). Snapshot
-- retention: 1 year (cron cleanupService handles pruning). One site
-- per unit (unique constraint) — adding other units later is a new
-- row, no schema change.

-- ─── foxess_sites ────────────────────────────────────────────────────────────
CREATE TABLE "foxess_sites" (
  "id"              TEXT PRIMARY KEY,
  "tenantId"        TEXT NOT NULL,
  "unidade_id"      TEXT NOT NULL,
  "nome"            TEXT NOT NULL,
  "api_key_crypt"   TEXT NOT NULL,
  "api_base"        TEXT NOT NULL DEFAULT 'https://www.foxesscloud.com',
  "inverter_sn"     TEXT NOT NULL,
  "bateria_sns"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "modelo_inversor" TEXT,
  "capacidade_kwh"  DOUBLE PRECISION,
  "autonomia_horas" DOUBLE PRECISION,
  "ativo"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP NOT NULL,
  CONSTRAINT "foxess_sites_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "foxess_sites_tenantId_unidade_id_fkey"
    FOREIGN KEY ("tenantId", "unidade_id") REFERENCES "unidades"("tenantId", "id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "foxess_sites_tenantId_unidade_id_key"
  ON "foxess_sites"("tenantId", "unidade_id");

CREATE INDEX "foxess_sites_tenantId_ativo_idx"
  ON "foxess_sites"("tenantId", "ativo");

-- ─── foxess_snapshots ────────────────────────────────────────────────────────
CREATE TABLE "foxess_snapshots" (
  "id"                     TEXT PRIMARY KEY,
  "tenantId"               TEXT NOT NULL,
  "site_id"                TEXT NOT NULL,
  "captured_at"            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "soc"                    DOUBLE PRECISION,
  "bat_charge_power"       DOUBLE PRECISION,
  "bat_discharge_power"    DOUBLE PRECISION,
  "feedin_power"           DOUBLE PRECISION,
  "grid_consumption_power" DOUBLE PRECISION,
  "eps_power"              DOUBLE PRECISION,
  "running_state"          INTEGER,
  "current_fault"          TEXT,
  "baterias_json"          JSONB,
  "raw_json"               TEXT,
  CONSTRAINT "foxess_snapshots_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "foxess_snapshots_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "foxess_sites"("id") ON DELETE CASCADE
);

CREATE INDEX "foxess_snapshots_tenantId_site_id_captured_at_idx"
  ON "foxess_snapshots"("tenantId", "site_id", "captured_at" DESC);

CREATE INDEX "foxess_snapshots_tenantId_captured_at_idx"
  ON "foxess_snapshots"("tenantId", "captured_at" DESC);

-- ─── foxess_quedas ───────────────────────────────────────────────────────────
CREATE TABLE "foxess_quedas" (
  "id"           TEXT PRIMARY KEY,
  "tenantId"     TEXT NOT NULL,
  "site_id"      TEXT NOT NULL,
  "inicio_em"    TIMESTAMP NOT NULL,
  "fim_em"       TIMESTAMP,
  "duracao_min"  INTEGER,
  "soc_inicial"  DOUBLE PRECISION,
  "soc_minimo"   DOUBLE PRECISION,
  "soc_final"    DOUBLE PRECISION,
  "resumo"       TEXT,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP NOT NULL,
  CONSTRAINT "foxess_quedas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "foxess_quedas_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "foxess_sites"("id") ON DELETE CASCADE
);

CREATE INDEX "foxess_quedas_tenantId_site_id_inicio_em_idx"
  ON "foxess_quedas"("tenantId", "site_id", "inicio_em" DESC);

CREATE INDEX "foxess_quedas_tenantId_fim_em_idx"
  ON "foxess_quedas"("tenantId", "fim_em");
