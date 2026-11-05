-- Fase 1 (catalogo de falhas), 2 (threshold offline configuravel) e 3
-- (agregacao mensal + valor economizado) do sistema de energia solar.
--
-- Adiciona:
--   - solar_plants.alerta_offline_minutos (Fase 2)
--   - solar_falhas                        (Fase 1)
--   - solar_agregados_diarios             (Fase 3 base)
--   - solar_agregados_mensais             (Fase 3 topo)

-- ============================================================================
-- Fase 2: threshold offline configuravel por planta
-- ============================================================================
ALTER TABLE "solar_plants" ADD COLUMN "alerta_offline_minutos" INTEGER;

-- ============================================================================
-- Fase 1: catalogo de falhas cross-fabricante
-- ============================================================================
CREATE TABLE "solar_falhas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "inverter_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "codigo_externo" TEXT NOT NULL,
    "codigo_tipo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "nivel" INTEGER NOT NULL,
    "codigo_reason" TEXT,
    "reportada_em" TIMESTAMP(3) NOT NULL,
    "resolvida_em" TIMESTAMP(3),
    "ultima_confirmacao_em" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_falhas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "solar_falhas_tenantId_inverter_id_codigo_externo_key"
    ON "solar_falhas"("tenantId", "inverter_id", "codigo_externo");
CREATE INDEX "solar_falhas_tenantId_plant_id_reportada_em_idx"
    ON "solar_falhas"("tenantId", "plant_id", "reportada_em" DESC);
CREATE INDEX "solar_falhas_tenantId_resolvida_em_idx"
    ON "solar_falhas"("tenantId", "resolvida_em");
CREATE INDEX "solar_falhas_tenantId_nivel_idx"
    ON "solar_falhas"("tenantId", "nivel");

ALTER TABLE "solar_falhas" ADD CONSTRAINT "solar_falhas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solar_falhas" ADD CONSTRAINT "solar_falhas_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solar_falhas" ADD CONSTRAINT "solar_falhas_inverter_id_fkey"
    FOREIGN KEY ("inverter_id") REFERENCES "solar_inverters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Fase 3: agregado diario por planta
-- ============================================================================
CREATE TABLE "solar_agregados_diarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "kwh_gerado" DOUBLE PRECISION,
    "kwh_consumido_rede" DOUBLE PRECISION,
    "kwh_exportado_rede" DOUBLE PRECISION,
    "valor_economizado_brl" DOUBLE PRECISION,
    "horas_offline" DOUBLE PRECISION,
    "falhas_abertas" INTEGER NOT NULL DEFAULT 0,
    "falhas_resolvidas" INTEGER NOT NULL DEFAULT 0,
    "picos_kw" DOUBLE PRECISION,
    "temp_max_c" DOUBLE PRECISION,
    "pr_aprox" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_agregados_diarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "solar_agregados_diarios_tenantId_plant_id_dia_key"
    ON "solar_agregados_diarios"("tenantId", "plant_id", "dia");
CREATE INDEX "solar_agregados_diarios_tenantId_plant_id_dia_idx"
    ON "solar_agregados_diarios"("tenantId", "plant_id", "dia" DESC);

ALTER TABLE "solar_agregados_diarios" ADD CONSTRAINT "solar_agregados_diarios_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solar_agregados_diarios" ADD CONSTRAINT "solar_agregados_diarios_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Fase 3: agregado mensal por planta
-- ============================================================================
CREATE TABLE "solar_agregados_mensais" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "kwh_gerado" DOUBLE PRECISION,
    "kwh_consumido_rede" DOUBLE PRECISION,
    "kwh_exportado_rede" DOUBLE PRECISION,
    "valor_economizado_brl" DOUBLE PRECISION,
    "horas_offline" DOUBLE PRECISION,
    "falhas_total" INTEGER NOT NULL DEFAULT 0,
    "quedas_total" INTEGER NOT NULL DEFAULT 0,
    "dias_com_geracao" INTEGER,
    "picos_kw" DOUBLE PRECISION,
    "pr_aprox_medio" DOUBLE PRECISION,
    "variacao_kwh_mes_anterior" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_agregados_mensais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "solar_agregados_mensais_tenantId_plant_id_ano_mes_key"
    ON "solar_agregados_mensais"("tenantId", "plant_id", "ano", "mes");
CREATE INDEX "solar_agregados_mensais_tenantId_plant_id_ano_mes_idx"
    ON "solar_agregados_mensais"("tenantId", "plant_id", "ano" DESC, "mes" DESC);

ALTER TABLE "solar_agregados_mensais" ADD CONSTRAINT "solar_agregados_mensais_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "solar_agregados_mensais" ADD CONSTRAINT "solar_agregados_mensais_plant_id_fkey"
    FOREIGN KEY ("plant_id") REFERENCES "solar_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
