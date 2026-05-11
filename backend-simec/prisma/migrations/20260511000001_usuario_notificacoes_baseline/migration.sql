-- Adiciona baseline de notificacoes por usuario.
-- Alertas com data anterior a este timestamp nao aparecem como "nao visto" no feed,
-- evitando que um usuario recem-criado herde o historico inteiro de alertas do tenant.

ALTER TABLE "usuarios"
  ADD COLUMN "notificacoes_baseline_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: usuarios existentes recebem como baseline a propria data de criacao,
-- de modo que continuam vendo o que sempre viram.
UPDATE "usuarios"
SET "notificacoes_baseline_em" = "createdAt"
WHERE "notificacoes_baseline_em" > "createdAt";
