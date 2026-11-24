-- Correcao: a migration anterior (20261124030001_telegram_bot_tipo) tentou
-- dropar a constraint UNIQUE antiga (tenantId, chatId) usando o nome
-- 'telegram_notificacoes_tenantId_chatId_key', mas aparentemente esse nome
-- nao bateu com o nome real no banco, entao a constraint ficou e bloqueia
-- a criacao de um segundo chat (bot LEMBRETES) pro mesmo (tenant, chatId).
--
-- Esta migration faz o drop de forma robusta: descobre todas as constraints
-- UNIQUE da tabela telegram_notificacoes cuja definicao envolva EXATAMENTE
-- (tenantId, chatId) sem bot_tipo, e as remove. Depois garante a constraint
-- composta nova.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'telegram_notificacoes'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE 'UNIQUE (%"tenantId"%)'
      AND pg_get_constraintdef(oid) ILIKE '%"chatId"%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%bot_tipo%'
  LOOP
    EXECUTE format('ALTER TABLE telegram_notificacoes DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Removida constraint antiga: %', r.conname;
  END LOOP;
END$$;

-- Tambem remove indices UNIQUE orfaos (sem constraint associada) com o mesmo
-- padrao — podem existir se a constraint tiver sido migrada manualmente.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'telegram_notificacoes'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%("tenantId", "chatId")%'
      AND indexdef NOT ILIKE '%bot_tipo%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
    RAISE NOTICE 'Removido indice unique orfao: %', r.indexname;
  END LOOP;
END$$;

-- Garante a constraint composta nova. Se ja existir, nao faz nada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'telegram_notificacoes'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%"tenantId"%"chatId"%bot_tipo%'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'telegram_notificacoes'
      AND indexname = 'telegram_notificacoes_tenantId_chatId_bot_tipo_key'
  ) THEN
    CREATE UNIQUE INDEX "telegram_notificacoes_tenantId_chatId_bot_tipo_key"
      ON "telegram_notificacoes" ("tenantId", "chatId", "bot_tipo");
  END IF;
END$$;
