-- Timestamp do ultimo envio Telegram bem-sucedido do alerta.
-- Usado pelo drainer pra decidir re-notificacao de alertas persistentes:
-- GEHC_SAUDE de prioridade ALTA/MEDIA sao re-enviados apos 24h desde
-- telegramEnviadoEm. Escalonamento (media->alta) e variacao significativa
-- da metrica (ex: +0.5 PSI de pressao helio) tambem reseta telegramEnviado
-- imediatamente pra forcar nova notificacao.

ALTER TABLE "alertas"
  ADD COLUMN "telegram_enviado_em" TIMESTAMP;

-- Index composto pra query de re-notificacao (categoria + timestamp).
CREATE INDEX "alertas_tenantId_tipoCategoria_telegramEnviadoEm_idx"
  ON "alertas"("tenantId", "tipo_categoria", "telegram_enviado_em");
