-- Suporte a multiplos bots do Telegram (ALERTAS e LEMBRETES).
-- Cada registro em telegram_notificacoes agora e especifico a um bot;
-- um mesmo chat humano pode ter 2 entradas se o usuario vinculou os dois.

-- Nota sobre migracao da constraint @@unique:
-- Antes: UNIQUE (tenantId, chatId)
-- Depois: UNIQUE (tenantId, chatId, botTipo)
-- Como bot_tipo default = 'ALERTAS', todos os registros existentes
-- continuam atendendo a nova constraint sem colisao.

ALTER TABLE "telegram_notificacoes"
  ADD COLUMN "bot_tipo" TEXT NOT NULL DEFAULT 'ALERTAS';

ALTER TABLE "telegram_vinculacao_tokens"
  ADD COLUMN "bot_tipo" TEXT NOT NULL DEFAULT 'LEMBRETES';

-- Substituir unique antigo pela nova composta
ALTER TABLE "telegram_notificacoes"
  DROP CONSTRAINT IF EXISTS "telegram_notificacoes_tenantId_chatId_key";

CREATE UNIQUE INDEX "telegram_notificacoes_tenantId_chatId_bot_tipo_key"
  ON "telegram_notificacoes" ("tenantId", "chatId", "bot_tipo");

CREATE INDEX "telegram_notificacoes_tenantId_bot_tipo_usuario_id_idx"
  ON "telegram_notificacoes" ("tenantId", "bot_tipo", "usuario_id");
