import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dest = await prisma.$queryRawUnsafe(`
    SELECT * FROM telegram_notificacoes
    WHERE "tenantId" = (SELECT id FROM tenants WHERE slug='simec-default')
  `);
  console.log('[destinatario completo]');
  console.log(JSON.stringify(dest, null, 2));

  // Distribuição de tipo_categoria dos pendentes
  const pendByCat = await prisma.$queryRawUnsafe(`
    SELECT tipo_categoria, COUNT(*)::int AS total
    FROM alertas
    WHERE "telegramEnviado" = false
      AND "tenantId" = (SELECT id FROM tenants WHERE slug='simec-default')
    GROUP BY tipo_categoria
  `);
  console.log('\n[pendentes por categoria]');
  console.log(JSON.stringify(pendByCat, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
