// Diagnóstico do pipeline de envio de alertas pelo Telegram. Read-only.
//
// Verifica:
//   1. TELEGRAM_BOT_TOKEN não testável aqui (só em runtime do Railway).
//   2. Destinatários cadastrados em telegramNotificacao por tenant.
//   3. Distribuição de telegramEnviado nos alertas dos últimos 7 dias.
//   4. Vinculações pendentes (telegramVinculacaoToken).
//   5. Sample dos 10 alertas mais recentes não enviados.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== Diagnóstico Telegram ===\n');

  const tenants = await prisma.$queryRawUnsafe(`
    SELECT id, slug, nome, kind FROM tenants ORDER BY kind, nome
  `);
  console.log('[tenants]');
  console.log(JSON.stringify(tenants, null, 2));

  console.log('\n[destinatarios por tenant]');
  const destinatarios = await prisma.$queryRawUnsafe(`
    SELECT t.slug, t.nome AS tenant_nome,
           COUNT(*)::int AS total,
           SUM(CASE WHEN tn.ativo THEN 1 ELSE 0 END)::int AS ativos,
           SUM(CASE WHEN tn."recebeAlertasManutencao" THEN 1 ELSE 0 END)::int AS recebe_manutencao
    FROM telegram_notificacoes tn
    JOIN tenants t ON tn."tenantId" = t.id
    GROUP BY t.id, t.slug, t.nome
    ORDER BY t.nome
  `);
  console.log(JSON.stringify(destinatarios, null, 2));

  console.log('\n[alertas - distribuicao telegramEnviado (7 dias)]');
  const dist = await prisma.$queryRawUnsafe(`
    SELECT t.slug,
           a."telegramEnviado",
           COUNT(*)::int AS total
    FROM alertas a
    JOIN tenants t ON a."tenantId" = t.id
    WHERE a."createdAt" > NOW() - INTERVAL '7 days'
    GROUP BY t.slug, a."telegramEnviado"
    ORDER BY t.slug, a."telegramEnviado"
  `);
  console.log(JSON.stringify(dist, null, 2));

  console.log('\n[vinculacoes pendentes (tokens nao usados/expirados)]');
  const tokens = await prisma.$queryRawUnsafe(`
    SELECT t.slug, COUNT(*)::int AS total
    FROM telegram_vinculacao_tokens tvt
    JOIN tenants t ON tvt."tenantId" = t.id
    WHERE tvt."usadoEm" IS NULL
    GROUP BY t.slug
  `);
  console.log(JSON.stringify(tokens, null, 2));

  console.log('\n[10 alertas mais recentes nao enviados]');
  const sample = await prisma.$queryRawUnsafe(`
    SELECT a.id, t.slug, a."tipoCategoria", a.prioridade, a.titulo, a."createdAt"
    FROM alertas a
    JOIN tenants t ON a."tenantId" = t.id
    WHERE a."telegramEnviado" = false
    ORDER BY a."createdAt" DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(sample, null, 2));

  console.log('\n[destinatarios completos do simec-default]');
  const detail = await prisma.$queryRawUnsafe(`
    SELECT tn.id, tn."chatId", tn.nome, tn.ativo,
           tn."recebeAlertasManutencao", tn."recebeAlertasContrato",
           tn."recebeAlertasSeguro", tn."recebeAlertasGehc",
           tn."recebeAlertasOsCorretiva", tn."recebeAlertasRecomendacao"
    FROM telegram_notificacoes tn
    JOIN tenants t ON tn."tenantId" = t.id
    WHERE t.slug = 'simec-default'
  `);
  console.log(JSON.stringify(detail, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
