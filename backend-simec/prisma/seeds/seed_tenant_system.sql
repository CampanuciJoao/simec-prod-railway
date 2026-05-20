-- Seed SQL idempotente da Fase 0.
-- Equivalente em DML do scripts/seedTenantSystem.js, pra ser colado
-- diretamente no console do Railway Postgres.
--
-- Rodar APÓS aplicar a migration 20260520000001_tenant_system_e_impersonacao.

-- 1. Cria/promove o Tenant System.
INSERT INTO "tenants" ("id", "nome", "slug", "kind", "timezone", "locale", "ativo", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'SIMEC Plataforma', 'system', 'SYSTEM', 'UTC', 'pt-BR', true, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
  SET "kind" = 'SYSTEM';

-- 2. Migra todos os superadmins que estão FORA do Tenant System.
-- O UPDATE não roda se gerar conflito de @@unique([tenantId, username])
-- ou @@unique([tenantId, email]) — checa antes via NOT EXISTS.
WITH system_tenant AS (
  SELECT "id" FROM "tenants" WHERE "slug" = 'system' LIMIT 1
),
elegiveis AS (
  SELECT u."id", u."username", u."email"
  FROM "usuarios" u, system_tenant s
  WHERE u."role" = 'superadmin'
    AND u."tenantId" <> s."id"
    AND NOT EXISTS (
      SELECT 1 FROM "usuarios" u2
      WHERE u2."tenantId" = s."id"
        AND (u2."username" = u."username" OR u2."email" = u."email")
    )
)
UPDATE "usuarios" u
SET "tenantId" = (SELECT "id" FROM system_tenant)
FROM elegiveis e
WHERE u."id" = e."id";

-- 3. Confirmação (RETURNING via SELECT pós-update). Cole separadamente
-- se o console não exibir o resultado das duas instruções acima.
SELECT
  (SELECT COUNT(*) FROM "tenants" WHERE "kind" = 'SYSTEM') AS tenants_system,
  (SELECT COUNT(*) FROM "tenants" WHERE "kind" = 'CUSTOMER') AS tenants_customer,
  (SELECT COUNT(*) FROM "usuarios" u JOIN "tenants" t ON u."tenantId" = t."id"
    WHERE u."role" = 'superadmin' AND t."kind" = 'SYSTEM') AS superadmins_no_system,
  (SELECT COUNT(*) FROM "usuarios" u JOIN "tenants" t ON u."tenantId" = t."id"
    WHERE u."role" = 'superadmin' AND t."kind" = 'CUSTOMER') AS superadmins_fora_do_system;
