-- Diagnostico de ultima tentativa de OAuth por inversor. Evita depender
-- de log do Railway pra descobrir por que a autorizacao Sungrow nao
-- concluiu (code expirado, redirect_uri mismatch, chave Redis vencida).

ALTER TABLE "solar_inverters"
  ADD COLUMN IF NOT EXISTS "last_auth_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_auth_error"      TEXT;
