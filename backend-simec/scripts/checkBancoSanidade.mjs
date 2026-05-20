// Script de sanidade: conecta no banco indicado por DATABASE_URL e roda
// alguns SELECTs para confirmar que é o banco esperado antes de aplicar
// migration. Não escreve nada.
//
// Uso:
//   DATABASE_URL='postgresql://...' node scripts/checkBancoSanidade.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeQuery(label, fn) {
  try {
    const r = await fn();
    console.log(`\n[${label}]`);
    console.log(JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  } catch (err) {
    console.log(`\n[${label}] ERRO: ${err.message}`);
  }
}

async function main() {
  console.log('== Sanidade do banco ==\n');

  await safeQuery('tenants', () =>
    prisma.$queryRawUnsafe(`SELECT id, slug, nome, ativo FROM tenants ORDER BY "createdAt" ASC`)
  );

  await safeQuery('usuarios_total', () =>
    prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM usuarios`)
  );

  await safeQuery('superadmins', () =>
    prisma.$queryRawUnsafe(`
      SELECT u.username, u.email, u."tenantId", t.slug AS tenant_slug
      FROM usuarios u
      JOIN tenants t ON u."tenantId" = t.id
      WHERE u.role = 'superadmin'
      ORDER BY u.username
    `)
  );

  await safeQuery('prisma_migrations_existe', async () => {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '_prisma_migrations'
      ) AS existe
    `);
    return rows;
  });

  await safeQuery('prisma_migrations_recent', () =>
    prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 8
    `)
  );

  await safeQuery('tenant_kind_existe', async () => {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'kind'
      ) AS existe
    `);
    return rows;
  });

  await safeQuery('row_counts', async () => {
    const eq = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM equipamentos`);
    const un = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM unidades`);
    const ma = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM manutencoes`);
    return { equipamentos: eq, unidades: un, manutencoes: ma };
  });
}

main()
  .catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
