-- Simplifica TipoServicoPredial por feedback operacional:
--   ExtintorRecarga + ExtintorTesteHidrostatico -> Extintor (consolidado)
--   BebedouroTrocaFiltro + BebedouroHigienizacao -> Bebedouro (consolidado)
--   Avcb + AlvaraSanitario removidos (nao sao servicos de manutencao recorrente)
--
-- Ordem importa: antes de referenciar o novo valor no cast, a coluna
-- precisa estar em TEXT (nao no enum antigo). Caso contrario o cast
-- 'Extintor'::"TipoServicoPredial" falha porque o enum ATUAL nao tem
-- esse valor.

-- 1. Coluna vai temporariamente pra TEXT
ALTER TABLE "manutencoes"
  ALTER COLUMN "tipo_servico_predial" TYPE text
  USING "tipo_servico_predial"::text;

-- 2. Normaliza valores antigos pros novos (idempotente — se nao ha dados,
--    estes UPDATE sao no-op)
UPDATE "manutencoes"
  SET "tipo_servico_predial" = 'Extintor'
  WHERE "tipo_servico_predial" IN ('ExtintorRecarga', 'ExtintorTesteHidrostatico');

UPDATE "manutencoes"
  SET "tipo_servico_predial" = 'Bebedouro'
  WHERE "tipo_servico_predial" IN ('BebedouroTrocaFiltro', 'BebedouroHigienizacao');

-- Registros com Avcb ou AlvaraSanitario viram NULL (manutencao predial
-- generica) — admin pode reclassificar ou cancelar depois.
UPDATE "manutencoes"
  SET "tipo_servico_predial" = NULL
  WHERE "tipo_servico_predial" IN ('Avcb', 'AlvaraSanitario');

-- 3. Dropa o enum antigo (coluna ja esta em TEXT, nao depende mais dele)
DROP TYPE "TipoServicoPredial";

-- 4. Cria enum novo com os 5 valores consolidados
CREATE TYPE "TipoServicoPredial" AS ENUM (
  'LimpezaCaixaDagua',
  'Dedetizacao',
  'Extintor',
  'Bebedouro',
  'SpdaParaRaios'
);

-- 5. Converte coluna de volta pra enum. Qualquer valor nao-canonico vira
--    NULL (via USING que retorna NULL se o cast falhar — impossivel aqui
--    pq ja normalizamos na etapa 2).
ALTER TABLE "manutencoes"
  ALTER COLUMN "tipo_servico_predial" TYPE "TipoServicoPredial"
  USING (
    CASE
      WHEN "tipo_servico_predial" IN (
        'LimpezaCaixaDagua', 'Dedetizacao', 'Extintor', 'Bebedouro', 'SpdaParaRaios'
      )
      THEN "tipo_servico_predial"::"TipoServicoPredial"
      ELSE NULL
    END
  );
