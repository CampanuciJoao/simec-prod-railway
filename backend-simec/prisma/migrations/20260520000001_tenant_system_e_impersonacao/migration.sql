-- Migração Fase 0 do plano de controle (modelo Tenant System inspirado em
-- IBM Maximo MAS).
--
-- Estrutura:
--   1. Enum TenantKind (SYSTEM | CUSTOMER) + coluna Tenant.kind (default CUSTOMER).
--   2. LogAuditoria.acted_as_tenant_id (nullable) para registrar impersonação
--      em escritas operacionais.
--   3. Tabela log_admin: trilha auditável de ações administrativas (criar
--      tenant, suspender, reset cross-tenant, etc), separada do log
--      operacional pra não poluir auditoria de cliente.
--   4. Tabela impersonacao: histórico de sessões de superadmin atuando em
--      tenants. Aberta no POST /impersonar e fechada no DELETE ou expiração.
--
-- Backfill de Tenant System + migração de usuários superadmin é feito pelo
-- script scripts/seedTenantSystem.js (executar APÓS aplicar esta migration).

-- 1. Enum TenantKind + coluna kind
CREATE TYPE "TenantKind" AS ENUM ('SYSTEM', 'CUSTOMER');

ALTER TABLE "tenants"
  ADD COLUMN "kind" "TenantKind" NOT NULL DEFAULT 'CUSTOMER';

-- 2. acted_as_tenant_id em log_auditoria
ALTER TABLE "log_auditoria"
  ADD COLUMN "acted_as_tenant_id" TEXT;

ALTER TABLE "log_auditoria"
  ADD CONSTRAINT "log_auditoria_acted_as_tenant_id_fkey"
  FOREIGN KEY ("acted_as_tenant_id")
  REFERENCES "tenants"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "log_auditoria_acted_as_tenant_id_timestamp_idx"
  ON "log_auditoria"("acted_as_tenant_id", "timestamp");

-- 3. log_admin
CREATE TABLE "log_admin" (
  "id"         TEXT NOT NULL,
  "autor_id"   TEXT NOT NULL,
  "acao"       TEXT NOT NULL,
  "alvo_tipo"  TEXT NOT NULL,
  "alvo_id"    TEXT,
  "motivo"     TEXT,
  "contexto"   JSONB,
  "timestamp"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "log_admin_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "log_admin"
  ADD CONSTRAINT "log_admin_autor_id_fkey"
  FOREIGN KEY ("autor_id")
  REFERENCES "usuarios"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "log_admin_autor_id_timestamp_idx"
  ON "log_admin"("autor_id", "timestamp");

CREATE INDEX "log_admin_alvo_tipo_alvo_id_timestamp_idx"
  ON "log_admin"("alvo_tipo", "alvo_id", "timestamp");

-- 4. impersonacao
CREATE TABLE "impersonacao" (
  "id"                    TEXT NOT NULL,
  "superadmin_id"         TEXT NOT NULL,
  "acted_as_tenant_id"    TEXT NOT NULL,
  "motivo"                TEXT NOT NULL,
  "iniciada_em"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "encerrada_em"          TIMESTAMP(3),
  "status"                TEXT NOT NULL DEFAULT 'ativa',
  CONSTRAINT "impersonacao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "impersonacao"
  ADD CONSTRAINT "impersonacao_superadmin_id_fkey"
  FOREIGN KEY ("superadmin_id")
  REFERENCES "usuarios"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "impersonacao"
  ADD CONSTRAINT "impersonacao_acted_as_tenant_id_fkey"
  FOREIGN KEY ("acted_as_tenant_id")
  REFERENCES "tenants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "impersonacao_superadmin_id_iniciada_em_idx"
  ON "impersonacao"("superadmin_id", "iniciada_em");

CREATE INDEX "impersonacao_acted_as_tenant_id_iniciada_em_idx"
  ON "impersonacao"("acted_as_tenant_id", "iniciada_em");

CREATE INDEX "impersonacao_status_iniciada_em_idx"
  ON "impersonacao"("status", "iniciada_em");
