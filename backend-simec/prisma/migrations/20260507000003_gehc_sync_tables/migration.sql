-- GE Health Cloud: tokens de autenticação por tenant
CREATE TABLE IF NOT EXISTS "gehc_tokens" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "access_token"  TEXT NOT NULL,
  "id_token"      TEXT NOT NULL,
  "refresh_token" TEXT,
  "expires_at"    TIMESTAMP(3),
  "captured_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gehc_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gehc_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gehc_tokens_tenantId_key" UNIQUE ("tenantId")
);

-- GE Health Cloud: cobertura contratual por equipamento (upsert — uma linha por equipamento)
CREATE TABLE IF NOT EXISTS "gehc_contratos" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "equipamento_id"      TEXT NOT NULL,
  "contract_name"       TEXT,
  "contract_status"     TEXT,
  "contract_start"      TIMESTAMP(3),
  "contract_expiration" TIMESTAMP(3),
  "warranty_status"     TEXT,
  "warranty_expiration" TIMESTAMP(3),
  "entitlements"        TEXT,
  "asset_coverage_type" TEXT,
  "raw_json"            TEXT,
  "sincronizado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gehc_contratos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gehc_contratos_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gehc_contratos_equip_fkey" FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE,
  CONSTRAINT "gehc_contratos_unique" UNIQUE ("tenantId", "equipamento_id")
);
CREATE INDEX IF NOT EXISTS "gehc_contratos_tenantId_idx" ON "gehc_contratos"("tenantId");

-- GE Health Cloud: histórico de ordens de serviço
CREATE TABLE IF NOT EXISTS "gehc_ordens_servico" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "equipamento_id"      TEXT NOT NULL,
  "gehc_service_id"     TEXT NOT NULL,
  "problem_description" TEXT,
  "tracking_number"     TEXT,
  "service_type_code"   TEXT,
  "service_state_code"  TEXT,
  "requested_at"        TIMESTAMP(3),
  "scheduled_date"      TIMESTAMP(3),
  "engineer_name"       TEXT,
  "corrective_action"   TEXT,
  "raw_json"            TEXT,
  "sincronizado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gehc_ordens_servico_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gehc_os_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gehc_os_equip_fkey" FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE,
  CONSTRAINT "gehc_os_service_id_key" UNIQUE ("gehc_service_id")
);
CREATE INDEX IF NOT EXISTS "gehc_os_tenant_equip_idx" ON "gehc_ordens_servico"("tenantId", "equipamento_id", "requested_at" DESC);

-- GE Health Cloud: utilização e uptime mensais por equipamento
CREATE TABLE IF NOT EXISTS "gehc_utilizacao_mensal" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "equipamento_id"   TEXT NOT NULL,
  "mes_referencia"   TIMESTAMP(3) NOT NULL,
  "pacientes_total"  INTEGER,
  "exames_total"     INTEGER,
  "duracao_media_min" DOUBLE PRECISION,
  "uptime_contrato"  DOUBLE PRECISION,
  "uptime_clock"     DOUBLE PRECISION,
  "sincronizado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gehc_utilizacao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gehc_util_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "gehc_util_equip_fkey" FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id") ON DELETE CASCADE,
  CONSTRAINT "gehc_utilizacao_unique" UNIQUE ("tenantId", "equipamento_id", "mes_referencia")
);
CREATE INDEX IF NOT EXISTS "gehc_util_tenant_equip_idx" ON "gehc_utilizacao_mensal"("tenantId", "equipamento_id", "mes_referencia" DESC);
