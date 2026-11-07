-- Controle de Manutencoes:
--   1. Equipamento.frequencia_preventiva_meses — periodicidade em meses
--      da preventiva padrao (3, 6, 12). Null = equipamento sem rotina
--      cadastrada (nao entra no dashboard).
--   2. Tabela rotinas_prediais — qual unidade monitora qual tipo de
--      servico predial com qual frequencia. Seed inicial cria 6 rotinas
--      pra cada unidade existente com periodicidades regulatorias padrao.

-- ============================================================================
-- Equipamentos: frequencia preventiva
-- ============================================================================
ALTER TABLE "equipamentos"
  ADD COLUMN "frequencia_preventiva_meses" INTEGER;

-- ============================================================================
-- Rotinas prediais
-- ============================================================================
CREATE TABLE "rotinas_prediais" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "tipo_servico_predial" "TipoServicoPredial" NOT NULL,
    "frequencia_meses" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotinas_prediais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rotinas_prediais_tenantId_unidade_id_tipo_servico_predial_key"
    ON "rotinas_prediais"("tenantId", "unidade_id", "tipo_servico_predial");
CREATE INDEX "rotinas_prediais_tenantId_ativa_idx"
    ON "rotinas_prediais"("tenantId", "ativa");

ALTER TABLE "rotinas_prediais" ADD CONSTRAINT "rotinas_prediais_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rotinas_prediais" ADD CONSTRAINT "rotinas_prediais_tenantId_unidade_id_fkey"
    FOREIGN KEY ("tenantId", "unidade_id") REFERENCES "unidades"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Seed: pra cada unidade existente, cria as 6 rotinas prediais com
-- periodicidade regulatoria padrao. Idempotente via ON CONFLICT DO NOTHING.
-- ============================================================================
INSERT INTO "rotinas_prediais"
  ("id", "tenantId", "unidade_id", "tipo_servico_predial", "frequencia_meses", "ativa", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."tenantId",
  u."id",
  tipo.nome::"TipoServicoPredial",
  tipo.freq,
  true,
  NOW(),
  NOW()
FROM "unidades" u
CROSS JOIN (VALUES
  ('LimpezaCaixaDagua', 6),
  ('Dedetizacao',       6),
  ('Extintor',          12),
  ('Bebedouro',         6),
  ('SpdaParaRaios',     12),
  ('ArtElevador',       12)
) AS tipo(nome, freq)
ON CONFLICT ("tenantId", "unidade_id", "tipo_servico_predial") DO NOTHING;
