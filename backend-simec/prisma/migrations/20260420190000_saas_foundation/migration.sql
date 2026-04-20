DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'superadmin'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'superadmin';
  END IF;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "contatoNome" TEXT,
  ADD COLUMN IF NOT EXISTS "contatoEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contatoTelefone" TEXT;

ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "email" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_tenantId_email_key"
  ON "usuarios"("tenantId", "email");

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_refreshTokenHash_key"
  ON "auth_sessions"("refreshTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_tenantId_id_key"
  ON "auth_sessions"("tenantId", "id");
CREATE INDEX IF NOT EXISTS "auth_sessions_tenantId_usuarioId_expiresAt_idx"
  ON "auth_sessions"("tenantId", "usuarioId", "expiresAt");
CREATE INDEX IF NOT EXISTS "auth_sessions_tenantId_revokedAt_idx"
  ON "auth_sessions"("tenantId", "revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_tenantId_fkey'
  ) THEN
    ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "auth_sessions_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_tenantId_usuarioId_fkey'
  ) THEN
    ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "auth_sessions_tenantId_usuarioId_fkey"
      FOREIGN KEY ("tenantId", "usuarioId") REFERENCES "usuarios"("tenantId", "id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key"
  ON "password_reset_tokens"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tenantId_id_key"
  ON "password_reset_tokens"("tenantId", "id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_tenantId_usuarioId_expiresAt_idx"
  ON "password_reset_tokens"("tenantId", "usuarioId", "expiresAt");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_tenantId_usedAt_idx"
  ON "password_reset_tokens"("tenantId", "usedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_tenantId_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_tenantId_usuarioId_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_tenantId_usuarioId_fkey"
      FOREIGN KEY ("tenantId", "usuarioId") REFERENCES "usuarios"("tenantId", "id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "help_articles" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "resumo" TEXT,
  "conteudoMarkdown" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "help_articles_slug_key"
  ON "help_articles"("slug");
CREATE INDEX IF NOT EXISTS "help_articles_categoria_published_idx"
  ON "help_articles"("categoria", "published");
CREATE INDEX IF NOT EXISTS "help_articles_audience_published_idx"
  ON "help_articles"("audience", "published");
