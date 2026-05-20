// Seed/backfill da Fase 0 do plano de controle.
//
// Garante a existência do Tenant System (kind=SYSTEM, slug=system) e migra
// todos os usuários com role=superadmin que estejam em tenants de cliente
// para ele.
//
// Idempotente: pode ser executado várias vezes sem efeito colateral.
//
// Uso:
//   node --env-file=.env scripts/seedTenantSystem.js
//
// Depois de rodar:
//   - Confira em log: "[SEED] Tenant System pronto: <id>"
//   - Confira em log: "[SEED] N superadmins migrados para Tenant System"
//   - O tenant-piloto deixa de conter superadmins (auditoria limpa).

import prisma from '../services/prismaService.js';

const TENANT_SYSTEM_SLUG = 'system';
const TENANT_SYSTEM_NOME = 'SIMEC Plataforma';

async function garantirTenantSystem() {
  const existente = await prisma.tenant.findUnique({
    where: { slug: TENANT_SYSTEM_SLUG },
  });

  if (existente) {
    if (existente.kind !== 'SYSTEM') {
      // Tenant 'system' existia mas como CUSTOMER — promove pra SYSTEM.
      await prisma.tenant.update({
        where: { id: existente.id },
        data: { kind: 'SYSTEM' },
      });
      console.log(`[SEED] Tenant 'system' existente promovido para SYSTEM: ${existente.id}`);
    } else {
      console.log(`[SEED] Tenant System já existe: ${existente.id}`);
    }
    return existente.id;
  }

  const criado = await prisma.tenant.create({
    data: {
      slug: TENANT_SYSTEM_SLUG,
      nome: TENANT_SYSTEM_NOME,
      kind: 'SYSTEM',
      timezone: 'UTC',
      locale: 'pt-BR',
      ativo: true,
    },
  });
  console.log(`[SEED] Tenant System criado: ${criado.id}`);
  return criado.id;
}

async function migrarSuperadmins(tenantSystemId) {
  // Lista superadmins que estão FORA do Tenant System.
  const superadminsForaDoSystem = await prisma.usuario.findMany({
    where: {
      role: 'superadmin',
      tenantId: { not: tenantSystemId },
    },
    select: { id: true, username: true, email: true, tenantId: true },
  });

  if (superadminsForaDoSystem.length === 0) {
    console.log('[SEED] Nenhum superadmin precisa ser migrado.');
    return 0;
  }

  console.log(`[SEED] ${superadminsForaDoSystem.length} superadmin(s) a migrar:`);
  superadminsForaDoSystem.forEach((u) =>
    console.log(`         - ${u.username} <${u.email}> (tenant origem: ${u.tenantId})`)
  );

  // Atualiza um a um para preservar @@unique([tenantId, username]) e
  // @@unique([tenantId, email]) — caso já exista um homônimo no Tenant
  // System (improvável, mas possível em ambientes de teste).
  let migrados = 0;
  for (const su of superadminsForaDoSystem) {
    const conflitoUsername = await prisma.usuario.findUnique({
      where: {
        tenantId_username: {
          tenantId: tenantSystemId,
          username: su.username,
        },
      },
    });
    const conflitoEmail = await prisma.usuario.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenantSystemId,
          email: su.email,
        },
      },
    });

    if (conflitoUsername || conflitoEmail) {
      console.warn(
        `[SEED] PULADO: ${su.username} já existe no Tenant System (conflito de ${
          conflitoUsername ? 'username' : 'email'
        }). Migre manualmente revisando duplicidade.`
      );
      continue;
    }

    await prisma.usuario.update({
      where: { id: su.id },
      data: { tenantId: tenantSystemId },
    });
    migrados += 1;
  }

  console.log(`[SEED] ${migrados} superadmin(s) migrados para Tenant System.`);
  return migrados;
}

async function main() {
  console.log('[SEED] Iniciando setup do Tenant System.');
  const tenantSystemId = await garantirTenantSystem();
  await migrarSuperadmins(tenantSystemId);
  console.log('[SEED] Concluído.');
}

main()
  .catch((err) => {
    console.error('[SEED_ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
