import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Janela: 7 dias. Agrupa por status e dia.
  const por_dia = await prisma.$queryRawUnsafe(`
    SELECT DATE("createdAt") AS dia, "telegramEnviado",
           COUNT(*)::int AS total
    FROM alertas
    WHERE "createdAt" > NOW() - INTERVAL '14 days'
    GROUP BY DATE("createdAt"), "telegramEnviado"
    ORDER BY dia DESC, "telegramEnviado"
  `);
  console.log('[alertas por dia]');
  console.log(JSON.stringify(por_dia, null, 2));

  console.log('\n[ultimos 10 alertas pendentes - quando criados]');
  const pendentes = await prisma.$queryRawUnsafe(`
    SELECT id, tipo_categoria, prioridade, titulo, "createdAt"
    FROM alertas
    WHERE "telegramEnviado" = false
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(pendentes, null, 2));

  console.log('\n[ultimos 5 que FORAM enviados]');
  const enviados = await prisma.$queryRawUnsafe(`
    SELECT id, tipo_categoria, titulo, "createdAt"
    FROM alertas
    WHERE "telegramEnviado" = true
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  console.log(JSON.stringify(enviados, null, 2));

  console.log('\n[chatId do destinatario simec-default]');
  const dest = await prisma.$queryRawUnsafe(`
    SELECT id, "chatId", nome, ativo,
           "recebeAlertasManutencao" AS receb_manut,
           "createdAt", "updatedAt"
    FROM telegram_notificacoes
    WHERE "tenantId" = (SELECT id FROM tenants WHERE slug='simec-default')
  `);
  console.log(JSON.stringify(dest, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
