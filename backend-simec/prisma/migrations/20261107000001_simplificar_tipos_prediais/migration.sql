-- Simplifica TipoServicoPredial por feedback operacional:
--   ExtintorRecarga + ExtintorTesteHidrostatico -> Extintor (consolidado)
--   BebedouroTrocaFiltro + BebedouroHigienizacao -> Bebedouro (consolidado)
--   Avcb + AlvaraSanitario removidos (nao sao servicos de manutencao recorrente)
--
-- Como Postgres nao permite DROP VALUE em enum, a estrategia e:
--   1. Converter manutencoes existentes dos valores antigos pros novos
--   2. Renomear enum antigo, criar novo com so os 5 valores
--   3. Converter coluna + dropar enum antigo

-- Migra registros existentes (idempotente — se nao ha, nao faz nada)
UPDATE "manutencoes"
  SET "tipo_servico_predial" = 'Extintor'::"TipoServicoPredial"
  WHERE "tipo_servico_predial" IN (
    'ExtintorRecarga'::"TipoServicoPredial",
    'ExtintorTesteHidrostatico'::"TipoServicoPredial"
  );

UPDATE "manutencoes"
  SET "tipo_servico_predial" = 'Bebedouro'::"TipoServicoPredial"
  WHERE "tipo_servico_predial" IN (
    'BebedouroTrocaFiltro'::"TipoServicoPredial",
    'BebedouroHigienizacao'::"TipoServicoPredial"
  );

-- Registros com Avcb ou AlvaraSanitario viram NULL (manutencao predial
-- generica) — admin pode reclassificar ou cancelar depois.
UPDATE "manutencoes"
  SET "tipo_servico_predial" = NULL
  WHERE "tipo_servico_predial" IN (
    'Avcb'::"TipoServicoPredial",
    'AlvaraSanitario'::"TipoServicoPredial"
  );

-- Ping-pong de enum (Postgres nao suporta DROP VALUE)
ALTER TYPE "TipoServicoPredial" RENAME TO "TipoServicoPredial_old";

CREATE TYPE "TipoServicoPredial" AS ENUM (
  'LimpezaCaixaDagua',
  'Dedetizacao',
  'Extintor',
  'Bebedouro',
  'SpdaParaRaios'
);

-- Como ja normalizamos os valores acima, o cast via text funciona pra
-- os sobreviventes. ExtintorRecarga etc nao existem mais na coluna.
ALTER TABLE "manutencoes"
  ALTER COLUMN "tipo_servico_predial" TYPE "TipoServicoPredial"
    USING ("tipo_servico_predial"::text::"TipoServicoPredial");

DROP TYPE "TipoServicoPredial_old";
