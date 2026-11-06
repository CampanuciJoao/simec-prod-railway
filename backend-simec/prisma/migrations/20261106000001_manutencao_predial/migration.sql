-- Preventivas prediais na tabela Manutencao:
--  - Novo enum CategoriaManutencao (Equipamento | Predial)
--  - Novo enum TipoServicoPredial (caixa d'agua, dedetizacao, extintor, etc)
--  - Coluna categoria (default 'Equipamento' pra compat com registros existentes)
--  - Coluna tipo_servico_predial (null quando categoria=Equipamento)
--  - Coluna unidade_id_direto (null quando Equipamento — unidade vem via Equipamento)
--  - equipamento_id vira NULLABLE (null quando categoria=Predial)
--  - FK em equipamento afrouxada (ON DELETE CASCADE mantido)

CREATE TYPE "CategoriaManutencao" AS ENUM ('Equipamento', 'Predial');

CREATE TYPE "TipoServicoPredial" AS ENUM (
  'LimpezaCaixaDagua',
  'Dedetizacao',
  'ExtintorRecarga',
  'ExtintorTesteHidrostatico',
  'BebedouroTrocaFiltro',
  'BebedouroHigienizacao',
  'SpdaParaRaios',
  'Avcb',
  'AlvaraSanitario'
);

ALTER TABLE "manutencoes"
  ADD COLUMN "categoria" "CategoriaManutencao" NOT NULL DEFAULT 'Equipamento',
  ADD COLUMN "tipo_servico_predial" "TipoServicoPredial",
  ADD COLUMN "unidade_predial_id" TEXT;

-- equipamento_id passa a aceitar NULL (quando categoria = Predial).
-- A FK ja existente nao precisa mudar — Postgres aceita NULL em FK por default.
ALTER TABLE "manutencoes" ALTER COLUMN "equipamento_id" DROP NOT NULL;

-- Indice pra filtros rapidos por categoria
CREATE INDEX "manutencoes_tenantId_categoria_idx" ON "manutencoes"("tenantId", "categoria");

-- FK pra unidade predial — SET NULL em delete (nao cascata, pra nao
-- perder historico de manutencao se a unidade for removida)
ALTER TABLE "manutencoes"
  ADD CONSTRAINT "manutencoes_unidade_predial_fkey"
  FOREIGN KEY ("tenantId", "unidade_predial_id")
  REFERENCES "unidades"("tenantId", "id") ON DELETE SET NULL;
