-- telegram_notificacoes: destinatarios de alertas via bot Telegram
CREATE TABLE "telegram_notificacoes" (
  "id"                        TEXT NOT NULL,
  "tenantId"                  TEXT NOT NULL,
  "chatId"                    TEXT NOT NULL,
  "nome"                      TEXT,
  "ativo"                     BOOLEAN NOT NULL DEFAULT true,
  "recebeAlertasContrato"     BOOLEAN NOT NULL DEFAULT true,
  "recebeAlertasManutencao"   BOOLEAN NOT NULL DEFAULT true,
  "recebeAlertasSeguro"       BOOLEAN NOT NULL DEFAULT true,
  "recebeAlertasGehc"         BOOLEAN NOT NULL DEFAULT true,
  "recebeAlertasOsCorretiva"  BOOLEAN NOT NULL DEFAULT false,
  "recebeAlertasRecomendacao" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_notificacoes_tenantId_chatId_key"
  ON "telegram_notificacoes"("tenantId", "chatId");

ALTER TABLE "telegram_notificacoes"
  ADD CONSTRAINT "telegram_notificacoes_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- telegram_vinculacao_tokens: tokens temporarios para vincular chat ao tenant
CREATE TABLE "telegram_vinculacao_tokens" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usado"     BOOLEAN NOT NULL DEFAULT false,
  "chatId"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telegram_vinculacao_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_vinculacao_tokens_token_key"
  ON "telegram_vinculacao_tokens"("token");

ALTER TABLE "telegram_vinculacao_tokens"
  ADD CONSTRAINT "telegram_vinculacao_tokens_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campo telegramEnviado na tabela alertas (espelho de emailEnviado)
ALTER TABLE "alertas" ADD COLUMN "telegramEnviado" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "alertas_tenantId_telegramEnviado_createdAt_idx"
  ON "alertas"("tenantId", "telegramEnviado", "createdAt" DESC);
