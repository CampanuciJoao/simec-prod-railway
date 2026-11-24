-- Suporte a chat privado por usuario (DM) nas notificacoes Telegram.
-- Permite que lembretes pessoais sejam entregues apenas ao destinatario,
-- sem poluir o chat de grupo do tenant.

ALTER TABLE "telegram_notificacoes"
  ADD COLUMN "usuario_id" TEXT,
  ADD COLUMN "chat_type"  TEXT;

CREATE INDEX "telegram_notificacoes_tenantId_usuario_id_idx"
  ON "telegram_notificacoes" ("tenantId", "usuario_id");

ALTER TABLE "telegram_vinculacao_tokens"
  ADD COLUMN "usuario_id" TEXT;

CREATE INDEX "telegram_vinculacao_tokens_tenantId_usuario_id_idx"
  ON "telegram_vinculacao_tokens" ("tenantId", "usuario_id");
