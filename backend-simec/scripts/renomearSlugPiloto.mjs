// Renomeia o slug do tenant piloto de 'simec-default' para 'cerdil'.
// Idempotente: se já estiver com slug 'cerdil', confirma e sai.
// Registra a operação em log_admin.
//
// Uso:
//   DATABASE_URL='postgresql://...' AUTOR_ID='uuid-do-superadmin' \
//     node scripts/renomearSlugPiloto.mjs

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SLUG_ANTIGO = 'simec-default';
const SLUG_NOVO = 'cerdil';

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG_NOVO } });
  if (tenant) {
    console.log(`[SLUG] Tenant já está com slug '${SLUG_NOVO}' (id=${tenant.id}). Nada a fazer.`);
    return;
  }

  const piloto = await prisma.tenant.findUnique({ where: { slug: SLUG_ANTIGO } });
  if (!piloto) {
    throw new Error(`Tenant '${SLUG_ANTIGO}' não encontrado.`);
  }

  console.log(`[SLUG] Renomeando tenant ${piloto.id}: '${SLUG_ANTIGO}' → '${SLUG_NOVO}' (nome="${piloto.nome}")`);

  const atualizado = await prisma.tenant.update({
    where: { id: piloto.id },
    data: { slug: SLUG_NOVO },
  });

  if (process.env.AUTOR_ID) {
    await prisma.logAdmin.create({
      data: {
        autorId: process.env.AUTOR_ID,
        acao: 'tenant_slug_renomeado',
        alvoTipo: 'tenant',
        alvoId: piloto.id,
        motivo: 'Cliente piloto Cerdil: padronizar slug com o nome real da empresa.',
        contexto: { slugAntigo: SLUG_ANTIGO, slugNovo: SLUG_NOVO, nome: piloto.nome },
      },
    });
    console.log('[SLUG] log_admin registrado.');
  } else {
    console.log('[SLUG] AUTOR_ID nao informado — pulando registro de log_admin.');
  }

  console.log(`[SLUG] Concluido. Novo slug: ${atualizado.slug}`);
}

main()
  .catch((err) => { console.error('[ERROR]', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
