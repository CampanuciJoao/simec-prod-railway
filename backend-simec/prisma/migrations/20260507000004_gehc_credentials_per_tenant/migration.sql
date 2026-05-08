-- Credenciais GE por tenant (criptografadas com AES-256-GCM)
ALTER TABLE "gehc_tokens" ADD COLUMN IF NOT EXISTS "gehc_login"    TEXT;
ALTER TABLE "gehc_tokens" ADD COLUMN IF NOT EXISTS "gehc_password"  TEXT;

-- Torna access_token e id_token opcionais para suportar registro criado só com credenciais
ALTER TABLE "gehc_tokens" ALTER COLUMN "access_token" DROP NOT NULL;
ALTER TABLE "gehc_tokens" ALTER COLUMN "id_token"     DROP NOT NULL;
