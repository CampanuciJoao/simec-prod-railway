-- Solar generico multi-fabricante.
-- Cria novas tabelas solar_* substituindo o modelo especifico FoxESS.
-- Migra todos os dados existentes (FoxessSite/Snapshot/Queda) pro novo
-- schema SEM PERDA, dentro de uma unica transacao (Prisma envolve o
-- arquivo .sql inteiro em BEGIN/COMMIT por default).
--
-- Mapeamento:
--   foxess_sites        -> solar_plants (1:1) + solar_inverters (1 por site) + solar_batteries (N por site)
--   foxess_snapshots    -> solar_snapshots (1:1 com inverterId do inversor criado acima)
--   foxess_quedas       -> solar_outages (1:1 com plantId)
--
-- Depois do COPY as tabelas antigas sao dropadas. Segurança: a transacao
-- so comita se TUDO rodar sem erro.

-- ============================================================================
-- 1) Cria as novas tabelas
-- ============================================================================

CREATE TABLE "solar_plants" (
  "id"               TEXT PRIMARY KEY,
  "tenantId"         TEXT NOT NULL,
  "unidade_id"       TEXT NOT NULL,
  "nome"             TEXT NOT NULL,
  "local_fisico"     TEXT,
  "capacidade_kwp"   DOUBLE PRECISION,
  "tarifa_kwh"       DOUBLE PRECISION,
  "tem_bateria"      BOOLEAN NOT NULL DEFAULT false,
  "autonomia_horas"  DOUBLE PRECISION,
  "ativo"            BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP NOT NULL,
  CONSTRAINT "solar_plants_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_plants_tenantId_unidade_id_fkey"
    FOREIGN KEY ("tenantId", "unidade_id") REFERENCES "unidades"("tenantId", "id") ON DELETE CASCADE
);
CREATE INDEX "solar_plants_tenantId_unidade_id_idx" ON "solar_plants"("tenantId", "unidade_id");
CREATE INDEX "solar_plants_tenantId_ativo_idx"     ON "solar_plants"("tenantId", "ativo");

CREATE TABLE "solar_inverters" (
  "id"               TEXT PRIMARY KEY,
  "plant_id"         TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "provider"         TEXT NOT NULL,
  "nome"             TEXT,
  "inverter_sn"      TEXT NOT NULL,
  "modelo_inversor"  TEXT,
  "capacidade_kw"    DOUBLE PRECISION,
  "credential_crypt" TEXT NOT NULL,
  "api_base"         TEXT NOT NULL,
  "ativo"            BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP NOT NULL,
  CONSTRAINT "solar_inverters_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_inverters_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "solar_inverters_tenantId_plant_id_idx"           ON "solar_inverters"("tenantId", "plant_id");
CREATE INDEX "solar_inverters_tenantId_provider_ativo_idx"     ON "solar_inverters"("tenantId", "provider", "ativo");

CREATE TABLE "solar_batteries" (
  "id"             TEXT PRIMARY KEY,
  "plant_id"       TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "sn"             TEXT NOT NULL,
  "capacidade_kwh" DOUBLE PRECISION,
  "provider"       TEXT NOT NULL,
  "ativo"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP NOT NULL,
  CONSTRAINT "solar_batteries_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_batteries_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX "solar_batteries_tenantId_plant_id_idx" ON "solar_batteries"("tenantId", "plant_id");

CREATE TABLE "solar_snapshots" (
  "id"                     TEXT PRIMARY KEY,
  "tenantId"               TEXT NOT NULL,
  "plant_id"               TEXT NOT NULL,
  "inverter_id"            TEXT,
  "captured_at"            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "power_kw"               DOUBLE PRECISION,
  "generation_kwh_day"     DOUBLE PRECISION,
  "generation_kwh_month"   DOUBLE PRECISION,
  "generation_kwh_total"   DOUBLE PRECISION,
  "feedin_power"           DOUBLE PRECISION,
  "grid_consumption_power" DOUBLE PRECISION,
  "soc"                    DOUBLE PRECISION,
  "bat_charge_power"       DOUBLE PRECISION,
  "bat_discharge_power"    DOUBLE PRECISION,
  "eps_power"              DOUBLE PRECISION,
  "running_state"          INTEGER,
  "current_fault"          TEXT,
  "ambient_temp_c"         DOUBLE PRECISION,
  "inverter_temp_c"        DOUBLE PRECISION,
  "detalhes_json"          JSONB,
  "raw_json"               TEXT,
  CONSTRAINT "solar_snapshots_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_snapshots_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_snapshots_inverter_id_fkey"
    FOREIGN KEY ("inverter_id") REFERENCES "solar_inverters"("id") ON DELETE SET NULL
);
CREATE INDEX "solar_snapshots_tenantId_plant_id_captured_at_idx"    ON "solar_snapshots"("tenantId", "plant_id", "captured_at" DESC);
CREATE INDEX "solar_snapshots_tenantId_inverter_id_captured_at_idx" ON "solar_snapshots"("tenantId", "inverter_id", "captured_at" DESC);
CREATE INDEX "solar_snapshots_tenantId_captured_at_idx"             ON "solar_snapshots"("tenantId", "captured_at" DESC);

CREATE TABLE "solar_outages" (
  "id"          TEXT PRIMARY KEY,
  "tenantId"    TEXT NOT NULL,
  "plant_id"    TEXT NOT NULL,
  "inicio_em"   TIMESTAMP NOT NULL,
  "fim_em"      TIMESTAMP,
  "duracao_min" INTEGER,
  "soc_inicial" DOUBLE PRECISION,
  "soc_minimo"  DOUBLE PRECISION,
  "soc_final"   DOUBLE PRECISION,
  "resumo"      TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL,
  CONSTRAINT "solar_outages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "solar_outages_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE
);
CREATE INDEX "solar_outages_tenantId_plant_id_inicio_em_idx" ON "solar_outages"("tenantId", "plant_id", "inicio_em" DESC);
CREATE INDEX "solar_outages_tenantId_fim_em_idx"             ON "solar_outages"("tenantId", "fim_em");

-- ============================================================================
-- 2) Migra dados do foxess_sites -> solar_plants + solar_inverters + solar_batteries
--    Uma linha em foxess_sites vira:
--      - 1 linha em solar_plants (com tem_bateria=true se tiver bateria)
--      - 1 linha em solar_inverters (provider='foxess')
--      - N linhas em solar_batteries (uma por SN em bateria_sns)
--
--    Mapeamento de credencial: o api_key_crypt do FoxESS era so a key
--    em texto crypt. No novo schema, credential_crypt guarda JSON cript
--    com {apiKey: "..."}. Pra nao re-criptografar aqui (precisaria do
--    secret), preservamos o valor antigo com um marcador 'LEGACY_V1:'
--    que o adapter FoxESS reconhece e decript direto como string (nao JSON).
-- ============================================================================

-- Garante IDs novos deterministicos — assim re-rodar a migration (no ambiente
-- errado) nao duplica linhas. Usa o proprio id do foxess_site como semente.
INSERT INTO "solar_plants" (
  "id", "tenantId", "unidade_id", "nome", "local_fisico",
  "capacidade_kwp", "tarifa_kwh", "tem_bateria", "autonomia_horas",
  "ativo", "createdAt", "updatedAt"
)
SELECT
  fs."id",
  fs."tenantId",
  fs."unidade_id",
  fs."nome",
  NULL,                              -- local_fisico (FoxESS nao tinha)
  NULL,                              -- capacidade_kwp (opcional, UI preenche depois)
  NULL,                              -- tarifa_kwh (idem)
  (fs."bateria_sns" IS NOT NULL AND array_length(fs."bateria_sns", 1) > 0) AS tem_bateria,
  fs."autonomia_horas",
  fs."ativo",
  fs."createdAt",
  fs."updatedAt"
FROM "foxess_sites" fs
ON CONFLICT ("id") DO NOTHING;

-- Inverter: 1 por site. id = siteId (reusa pra manter o vinculo com snapshots)
INSERT INTO "solar_inverters" (
  "id", "plant_id", "tenantId", "provider", "nome", "inverter_sn",
  "modelo_inversor", "capacidade_kw", "credential_crypt", "api_base",
  "ativo", "createdAt", "updatedAt"
)
SELECT
  fs."id",                            -- mesmo id do site, 1:1 (unico inversor)
  fs."id",                            -- plant_id (mesmo id)
  fs."tenantId",
  'foxess'                            AS provider,
  fs."modelo_inversor"                AS nome,
  fs."inverter_sn",
  fs."modelo_inversor",
  NULL                                AS capacidade_kw,
  'LEGACY_V1:' || fs."api_key_crypt"  AS credential_crypt,
  fs."api_base",
  fs."ativo",
  fs."createdAt",
  fs."updatedAt"
FROM "foxess_sites" fs
ON CONFLICT ("id") DO NOTHING;

-- Baterias: 1 linha por SN. gen_random_uuid() precisa da extensao pgcrypto;
-- usamos md5 do texto como fallback portavel (nao e UUID real mas e aceito
-- em coluna TEXT; so precisa ser unico).
INSERT INTO "solar_batteries" (
  "id", "plant_id", "tenantId", "sn", "capacidade_kwh", "provider",
  "ativo", "createdAt", "updatedAt"
)
SELECT
  md5(fs."id" || ':' || sn) AS id,
  fs."id"                   AS plant_id,
  fs."tenantId",
  sn,
  NULL                      AS capacidade_kwh,
  'foxess'                  AS provider,
  true,
  fs."createdAt",
  fs."updatedAt"
FROM "foxess_sites" fs,
     unnest(fs."bateria_sns") AS sn
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- 3) Migra foxess_snapshots -> solar_snapshots
-- ============================================================================

INSERT INTO "solar_snapshots" (
  "id", "tenantId", "plant_id", "inverter_id", "captured_at",
  "power_kw", "generation_kwh_day", "generation_kwh_month", "generation_kwh_total",
  "feedin_power", "grid_consumption_power",
  "soc", "bat_charge_power", "bat_discharge_power", "eps_power",
  "running_state", "current_fault", "ambient_temp_c", "inverter_temp_c",
  "detalhes_json", "raw_json"
)
SELECT
  fsn."id",
  fsn."tenantId",
  fsn."site_id"                AS plant_id,
  fsn."site_id"                AS inverter_id,  -- 1 inverter por site
  fsn."captured_at",
  NULL                         AS power_kw,
  NULL                         AS generation_kwh_day,
  NULL                         AS generation_kwh_month,
  NULL                         AS generation_kwh_total,
  fsn."feedin_power",
  fsn."grid_consumption_power",
  fsn."soc",
  fsn."bat_charge_power",
  fsn."bat_discharge_power",
  fsn."eps_power",
  fsn."running_state",
  fsn."current_fault",
  fsn."ambient_temp_c",
  fsn."inverter_temp_c",
  fsn."baterias_json"          AS detalhes_json,
  fsn."raw_json"
FROM "foxess_snapshots" fsn
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- 4) Migra foxess_quedas -> solar_outages
-- ============================================================================

INSERT INTO "solar_outages" (
  "id", "tenantId", "plant_id", "inicio_em", "fim_em", "duracao_min",
  "soc_inicial", "soc_minimo", "soc_final", "resumo", "createdAt", "updatedAt"
)
SELECT
  fq."id",
  fq."tenantId",
  fq."site_id"   AS plant_id,
  fq."inicio_em",
  fq."fim_em",
  fq."duracao_min",
  fq."soc_inicial",
  fq."soc_minimo",
  fq."soc_final",
  fq."resumo",
  fq."createdAt",
  fq."updatedAt"
FROM "foxess_quedas" fq
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- 5) Drop das tabelas antigas (dados ja copiados)
-- ============================================================================
--
-- Como e a mesma transacao, se qualquer INSERT acima falhar o DROP tambem
-- e revertido automaticamente — nenhum dado perdido.

DROP TABLE "foxess_snapshots";
DROP TABLE "foxess_quedas";
DROP TABLE "foxess_sites";
