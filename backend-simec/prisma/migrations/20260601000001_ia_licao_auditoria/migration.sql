-- G3: Validacao de anonimizacao cross-tenant em IaCategoriaLicao
--
-- Adiciona:
--   - Colunas de auditoria na IaCategoriaLicao (status, ultima_auditoria_em, label_hash)
--   - Tabela IaLicaoAuditoria (trilha de auditoria, decisao manual)
--
-- Default status='APROVADA' para licoes existentes — nao quebra ninguem.
-- Job semanal vai revisitar todas e marcar suspeitas como QUARENTENA.

ALTER TABLE "ia_categoria_licoes"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APROVADA',
  ADD COLUMN "ultima_auditoria_em" TIMESTAMP(3),
  ADD COLUMN "label_hash" TEXT;

CREATE INDEX "ia_categoria_licoes_status_created_at_idx"
  ON "ia_categoria_licoes" ("status", "created_at" DESC);

CREATE TABLE "ia_licao_auditoria" (
    "id" TEXT NOT NULL,
    "licao_id" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "padroes" JSONB NOT NULL DEFAULT '[]',
    "trecho" TEXT,
    "origem" TEXT NOT NULL,
    "revisado_por" TEXT,
    "revisado_em" TIMESTAMP(3),
    "decisao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_licao_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ia_licao_auditoria_licao_id_criado_em_idx"
  ON "ia_licao_auditoria" ("licao_id", "criado_em" DESC);
CREATE INDEX "ia_licao_auditoria_resultado_criado_em_idx"
  ON "ia_licao_auditoria" ("resultado", "criado_em" DESC);
CREATE INDEX "ia_licao_auditoria_decisao_criado_em_idx"
  ON "ia_licao_auditoria" ("decisao", "criado_em" DESC);

ALTER TABLE "ia_licao_auditoria" ADD CONSTRAINT "ia_licao_auditoria_licao_id_fkey"
    FOREIGN KEY ("licao_id") REFERENCES "ia_categoria_licoes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ia_licao_auditoria" ADD CONSTRAINT "ia_licao_auditoria_revisado_por_fkey"
    FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
