-- Adiciona coluna para persistir o storageState completo do Playwright
-- (cookies + localStorage). Necessario para reaproveitar o "device trust"
-- da GE Healthcare entre execucoes apos a migracao do portal (jun/2026)
-- que introduziu gate de 2FA quando o navegador nao tem cookie de
-- dispositivo confiavel. O valor e' guardado encriptado (AES-256-GCM)
-- via gehcCrypto, igual aos tokens.

ALTER TABLE "gehc_tokens"
  ADD COLUMN "storage_state" TEXT;
