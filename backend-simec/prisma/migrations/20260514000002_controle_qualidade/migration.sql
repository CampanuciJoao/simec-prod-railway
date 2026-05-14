-- Modulo de Controle de Qualidade (RDC ANVISA 611/2022).
-- Cria catalogo de tipos de teste por modalidade e tabela de execucoes.
-- Adiciona FK em anexos para suportar upload de laudos PDF.

CREATE TYPE "ResultadoTesteQualidade" AS ENUM (
  'Aprovado',
  'AprovadoComRestricoes',
  'Reprovado'
);

-- ─── Catalogo de tipos de teste (tenant-specific) ───────────────────────────
CREATE TABLE "tipos_testes_qualidade" (
  "id"                 TEXT NOT NULL,
  "tenantId"           TEXT NOT NULL,
  "codigo"             TEXT NOT NULL,
  "nome"               TEXT NOT NULL,
  "modalidade"         TEXT NOT NULL,
  "frequencia_dias"    INTEGER NOT NULL,
  "obrigatorio"        BOOLEAN NOT NULL DEFAULT false,
  "norma_referencia"   TEXT,
  "responsavel_tipico" TEXT,
  "descricao"          TEXT,
  "ativo"              BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tipos_testes_qualidade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tipos_testes_qualidade_tenantId_codigo_key"
  ON "tipos_testes_qualidade"("tenantId", "codigo");

CREATE INDEX "tipos_testes_qualidade_tenantId_modalidade_ativo_idx"
  ON "tipos_testes_qualidade"("tenantId", "modalidade", "ativo");

ALTER TABLE "tipos_testes_qualidade"
  ADD CONSTRAINT "tipos_testes_qualidade_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Execucoes de teste (registros historicos) ──────────────────────────────
CREATE TABLE "testes_qualidade" (
  "id"                   TEXT NOT NULL,
  "tenantId"             TEXT NOT NULL,
  "equipamento_id"       TEXT NOT NULL,
  "tipo_teste_id"        TEXT NOT NULL,
  "data_execucao"        DATE,
  "proximo_vencimento"   DATE,
  "resultado"            "ResultadoTesteQualidade",
  "numero_laudo"         TEXT,
  "empresa_executora"    TEXT,
  "responsavel_nome"     TEXT,
  "responsavel_registro" TEXT,
  "validade_meses"       INTEGER,
  "observacoes"          TEXT,
  "pendencias_acao"      JSONB,
  "autor_registro_id"    TEXT,
  "deletado_em"          TIMESTAMP(3),
  "deletado_por_id"      TEXT,
  "motivo_exclusao"      TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "testes_qualidade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "testes_qualidade_tenantId_id_key"
  ON "testes_qualidade"("tenantId", "id");

CREATE INDEX "testes_qualidade_tenantId_equipamento_data_idx"
  ON "testes_qualidade"("tenantId", "equipamento_id", "data_execucao" DESC);

CREATE INDEX "testes_qualidade_tenantId_proximo_vencimento_idx"
  ON "testes_qualidade"("tenantId", "proximo_vencimento");

CREATE INDEX "testes_qualidade_tenantId_resultado_proximo_vencimento_idx"
  ON "testes_qualidade"("tenantId", "resultado", "proximo_vencimento");

CREATE INDEX "testes_qualidade_tenantId_deletado_em_idx"
  ON "testes_qualidade"("tenantId", "deletado_em");

ALTER TABLE "testes_qualidade"
  ADD CONSTRAINT "testes_qualidade_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "testes_qualidade"
  ADD CONSTRAINT "testes_qualidade_equipamento_fkey"
  FOREIGN KEY ("tenantId", "equipamento_id") REFERENCES "equipamentos"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "testes_qualidade"
  ADD CONSTRAINT "testes_qualidade_tipo_teste_fkey"
  FOREIGN KEY ("tipo_teste_id") REFERENCES "tipos_testes_qualidade"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "testes_qualidade"
  ADD CONSTRAINT "testes_qualidade_autor_registro_fkey"
  FOREIGN KEY ("autor_registro_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "testes_qualidade"
  ADD CONSTRAINT "testes_qualidade_deletado_por_fkey"
  FOREIGN KEY ("deletado_por_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Flag de Telegram para opt-in de alertas CQ por destinatario ────────────
ALTER TABLE "telegram_notificacoes"
  ADD COLUMN "recebeAlertasControleQualidade" BOOLEAN NOT NULL DEFAULT true;

-- ─── FK em anexos para vincular laudos PDF aos testes ───────────────────────
ALTER TABLE "anexos"
  ADD COLUMN "teste_qualidade_id" TEXT;

CREATE INDEX "anexos_tenantId_teste_qualidade_id_idx"
  ON "anexos"("tenantId", "teste_qualidade_id");

ALTER TABLE "anexos"
  ADD CONSTRAINT "anexos_teste_qualidade_fkey"
  FOREIGN KEY ("tenantId", "teste_qualidade_id")
  REFERENCES "testes_qualidade"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
