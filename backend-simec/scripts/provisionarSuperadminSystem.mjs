// Provisionamento idempotente do superadmin de plataforma (Tenant System)
// + rebaixamento dos superadmins legados que estão em tenants CUSTOMER.
//
// Argumentos via env:
//   NOVO_SUPERADMIN_EMAIL, NOVO_SUPERADMIN_USERNAME, NOVO_SUPERADMIN_SENHA,
//   NOVO_SUPERADMIN_NOME (opcional, default = username)
//
// Comportamento:
//   1. Confirma que existe Tenant kind=SYSTEM.
//   2. Cria usuário superadmin no Tenant System se ainda não existe
//      (ou atualiza senha se já existe — idempotente).
//   3. Rebaixa role de superadmin->admin para todos os superadmins em
//      tenants kind=CUSTOMER (preserva tenantId, histórico, sessões).
//   4. Encerra sessões de auth ativas dos usuários rebaixados (força
//      re-login com role correta).
//   5. Confirma com SELECT final.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL    = process.env.NOVO_SUPERADMIN_EMAIL;
const USERNAME = process.env.NOVO_SUPERADMIN_USERNAME;
const SENHA    = process.env.NOVO_SUPERADMIN_SENHA;
const NOME     = process.env.NOVO_SUPERADMIN_NOME || USERNAME;

if (!EMAIL || !USERNAME || !SENHA) {
  console.error('[PROVISION] Faltam vars: NOVO_SUPERADMIN_EMAIL, _USERNAME, _SENHA');
  process.exit(1);
}

async function main() {
  // 1. Tenant System — cria se não existir (idempotente).
  let tenantSystem = await prisma.tenant.findFirst({ where: { kind: 'SYSTEM' } });
  if (!tenantSystem) {
    // Pode existir com slug='system' mas como CUSTOMER (raro mas possível);
    // promove em vez de duplicar.
    const slugExistente = await prisma.tenant.findUnique({ where: { slug: 'system' } });
    if (slugExistente) {
      tenantSystem = await prisma.tenant.update({
        where: { id: slugExistente.id },
        data: { kind: 'SYSTEM' },
      });
      console.log(`[PROVISION] Tenant 'system' promovido para SYSTEM: ${tenantSystem.id}`);
    } else {
      tenantSystem = await prisma.tenant.create({
        data: {
          slug: 'system',
          nome: 'SIMEC Plataforma',
          kind: 'SYSTEM',
          timezone: 'UTC',
          locale: 'pt-BR',
          ativo: true,
        },
      });
      console.log(`[PROVISION] Tenant System criado: ${tenantSystem.id}`);
    }
  }
  console.log(`[PROVISION] Tenant System ativo: ${tenantSystem.id} (slug=${tenantSystem.slug})`);

  // 2. Cria ou atualiza superadmin no Tenant System
  const hash = await bcrypt.hash(SENHA, 10);

  const existente = await prisma.usuario.findFirst({
    where: {
      tenantId: tenantSystem.id,
      OR: [{ email: EMAIL }, { username: USERNAME }],
    },
  });

  let superadminFinal;
  if (existente) {
    superadminFinal = await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        senha: hash,
        role: 'superadmin',
        email: EMAIL,
        username: USERNAME,
        nome: NOME,
      },
    });
    console.log(`[PROVISION] Superadmin existente atualizado: ${superadminFinal.id}`);
  } else {
    superadminFinal = await prisma.usuario.create({
      data: {
        tenantId: tenantSystem.id,
        email: EMAIL,
        username: USERNAME,
        nome: NOME,
        senha: hash,
        role: 'superadmin',
      },
    });
    console.log(`[PROVISION] Superadmin criado: ${superadminFinal.id}`);
  }

  // 3. Rebaixa superadmins legados em tenants CUSTOMER
  const customerTenants = await prisma.tenant.findMany({
    where: { kind: 'CUSTOMER' },
    select: { id: true },
  });
  const customerIds = customerTenants.map((t) => t.id);

  const legados = await prisma.usuario.findMany({
    where: {
      role: 'superadmin',
      tenantId: { in: customerIds },
    },
    select: { id: true, username: true, email: true, tenantId: true },
  });

  if (legados.length > 0) {
    console.log(`[PROVISION] Rebaixando ${legados.length} superadmin(s) legado(s):`);
    legados.forEach((u) =>
      console.log(`           - ${u.username} <${u.email}> (tenant ${u.tenantId})`)
    );
    await prisma.usuario.updateMany({
      where: { id: { in: legados.map((u) => u.id) } },
      data: { role: 'admin' },
    });

    // 4. Encerra sessões ativas dos rebaixados
    const sessoesEncerradas = await prisma.authSession.deleteMany({
      where: { usuarioId: { in: legados.map((u) => u.id) } },
    });
    console.log(`[PROVISION] ${sessoesEncerradas.count} sessão(ões) auth encerradas.`);
  } else {
    console.log('[PROVISION] Nenhum superadmin legado em tenant CUSTOMER.');
  }

  // 5. Confirmação
  const confirmacao = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM "tenants" WHERE "kind" = 'SYSTEM')                                                     AS tenants_system,
      (SELECT COUNT(*)::int FROM "tenants" WHERE "kind" = 'CUSTOMER')                                                   AS tenants_customer,
      (SELECT COUNT(*)::int FROM "usuarios" u JOIN "tenants" t ON u."tenantId"=t."id"
        WHERE u."role"='superadmin' AND t."kind"='SYSTEM')                                                              AS superadmins_no_system,
      (SELECT COUNT(*)::int FROM "usuarios" u JOIN "tenants" t ON u."tenantId"=t."id"
        WHERE u."role"='superadmin' AND t."kind"='CUSTOMER')                                                            AS superadmins_em_customer,
      (SELECT COUNT(*)::int FROM "usuarios" u JOIN "tenants" t ON u."tenantId"=t."id"
        WHERE u."role"='admin' AND t."kind"='CUSTOMER')                                                                 AS admins_em_customer
  `);
  console.log('\n[CONFIRMACAO]', JSON.stringify(confirmacao[0], null, 2));
}

main()
  .catch((err) => {
    console.error('[PROVISION_ERROR]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
