-- Alertas solar (FOXESS_ENERGIA) nao eram entregues no Telegram porque o
-- mapa CATEGORIA_FLAG nao tinha entrada para esta categoria. Esta migration
-- cria a flag opt-in no destinatario (default true) e, em seguida, backfill
-- dos alertas solar ainda ativos no banco que foram marcados como enviados
-- sem de fato terem sido entregues.

ALTER TABLE "telegram_notificacoes"
  ADD COLUMN IF NOT EXISTS "recebeAlertasFoxessEnergia" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: ressuscita alertas solar que foram "enviados" sem destinatario
-- real (telegram_enviado_em e NULL, o que acontece quando o service marcou
-- como enviado mesmo sem ter chamado enviarMensagem).
-- OBS: a coluna categoria no banco e tipo_categoria (snake, tem @map),
-- mas telegramEnviado/telegram_enviado_em seguem o camelCase do schema
-- (telegramEnviado sem @map, telegram_enviado_em com @map).
UPDATE "alertas"
   SET "telegramEnviado" = false
 WHERE "tipo_categoria"      = 'FOXESS_ENERGIA'
   AND "telegramEnviado"     = true
   AND "telegram_enviado_em" IS NULL;
