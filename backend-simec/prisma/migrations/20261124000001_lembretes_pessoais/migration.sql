-- Lembretes pessoais atribuiveis dentro do tenant, com entrega multi-canal
-- (painel + Telegram + email), recorrencia opcional e vinculo opcional a
-- uma entidade do SIMEC (OS corretiva, equipamento, unidade, seguro, contrato).

CREATE TYPE "LembreteStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'CONCLUIDO', 'DESCARTADO');
CREATE TYPE "LembreteRecorrencia" AS ENUM ('UNICA', 'DIARIA', 'SEMANAL', 'MENSAL');
CREATE TYPE "LembreteEntidadeTipo" AS ENUM ('OS_CORRETIVA', 'EQUIPAMENTO', 'UNIDADE', 'SEGURO', 'CONTRATO');

CREATE TABLE "lembretes" (
  "id"                TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL,
  "criado_por_id"     TEXT NOT NULL,
  "destinatario_id"   TEXT NOT NULL,
  "titulo"            TEXT NOT NULL,
  "descricao"         TEXT,
  "lembrar_em"        TIMESTAMP(3) NOT NULL,
  "recorrencia"       "LembreteRecorrencia" NOT NULL DEFAULT 'UNICA',
  "status"            "LembreteStatus" NOT NULL DEFAULT 'PENDENTE',
  "canais"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "entidadeTipo"      "LembreteEntidadeTipo",
  "entidade_id"       TEXT,
  "entidade_label"    TEXT,
  "enviado_em"        TIMESTAMP(3),
  "concluido_em"      TIMESTAMP(3),
  "lido_em"           TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lembretes_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "lembretes_criador_fkey"
    FOREIGN KEY ("tenantId", "criado_por_id") REFERENCES "usuarios"("tenantId", "id") ON DELETE CASCADE,
  CONSTRAINT "lembretes_destinatario_fkey"
    FOREIGN KEY ("tenantId", "destinatario_id") REFERENCES "usuarios"("tenantId", "id") ON DELETE CASCADE
);

CREATE INDEX "lembretes_tenantId_destinatario_id_status_idx"
  ON "lembretes" ("tenantId", "destinatario_id", "status");
CREATE INDEX "lembretes_status_lembrar_em_idx"
  ON "lembretes" ("status", "lembrar_em");
CREATE INDEX "lembretes_tenantId_status_lembrar_em_idx"
  ON "lembretes" ("tenantId", "status", "lembrar_em");
