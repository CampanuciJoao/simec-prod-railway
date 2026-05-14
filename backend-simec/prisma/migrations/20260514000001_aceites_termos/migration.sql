-- LGPD: registro do aceite de cada usuario as versoes vigentes dos
-- documentos legais (Politica de Privacidade, Termos de Uso). Permite
-- pedir novo aceite quando o documento sobe de versao.

CREATE TYPE "DocumentoLegal" AS ENUM ('politica_privacidade', 'termos_uso');

CREATE TABLE "aceites_termos" (
  "id"         TEXT NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "documento"  "DocumentoLegal" NOT NULL,
  "versao"     TEXT NOT NULL,
  "aceito_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip"         TEXT,
  "user_agent" TEXT,

  CONSTRAINT "aceites_termos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aceites_termos_usuario_id_documento_versao_key"
  ON "aceites_termos"("usuario_id", "documento", "versao");

CREATE INDEX "aceites_termos_usuario_id_idx"
  ON "aceites_termos"("usuario_id");

CREATE INDEX "aceites_termos_documento_versao_idx"
  ON "aceites_termos"("documento", "versao");

ALTER TABLE "aceites_termos"
  ADD CONSTRAINT "aceites_termos_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
