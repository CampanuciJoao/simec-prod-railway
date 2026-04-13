// Ficheiro: backend-simec/seed.js
// Versão: 3.0 (Multi-tenant ready)
// Descrição: Cria Tenant padrão + Admin + Unidade inicial

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Iniciando seed do SIMEC...');

  // ==============================
  // 1. TENANT PADRÃO
  // ==============================
  const tenantSlug = 'simec-default';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      nome: 'SIMEC Default',
      slug: tenantSlug,
      timezone: 'America/Campo_Grande',
      locale: 'pt-BR',
      ativo: true,
    },
  });

  console.log(`🏢 Tenant OK: ${tenant.nome}`);

  // ==============================
  // 2. ADMIN
  // ==============================
  const adminUsername = 'admin';
  const adminNome = 'Administrador do Sistema';
  const adminSenhaPlana = '751953';

  const senhaCriptografada = await bcrypt.hash(adminSenhaPlana, 10);

  const adminExistente = await prisma.usuario.findFirst({
    where: {
      username: adminUsername.toLowerCase(),
      tenantId: tenant.id,
    },
  });

  let admin;

  if (adminExistente) {
    admin = await prisma.usuario.update({
      where: { id: adminExistente.id },
      data: {
        nome: adminNome,
        senha: senhaCriptografada,
        role: 'admin',
      },
    });

    console.log('🔄 Admin atualizado');
  } else {
    admin = await prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        username: adminUsername.toLowerCase(),
        nome: adminNome,
        senha: senhaCriptografada,
        role: 'admin',
      },
    });

    console.log('✅ Admin criado');
  }

  // ==============================
  // 3. UNIDADE PADRÃO
  // ==============================
  const unidadeNome = 'Unidade Matriz';

  const unidadeExistente = await prisma.unidade.findFirst({
    where: {
      nomeSistema: unidadeNome,
      tenantId: tenant.id,
    },
  });

  let unidade;

  if (unidadeExistente) {
    unidade = await prisma.unidade.update({
      where: { id: unidadeExistente.id },
      data: {
        nomeFantasia: 'SIMEC Matriz',
        cidade: 'Campo Grande',
        estado: 'MS',
        timezone: 'America/Campo_Grande',
      },
    });

    console.log('🔄 Unidade atualizada');
  } else {
    unidade = await prisma.unidade.create({
      data: {
        tenantId: tenant.id,
        nomeSistema: unidadeNome,
        nomeFantasia: 'SIMEC Matriz',
        cidade: 'Campo Grande',
        estado: 'MS',
        timezone: 'America/Campo_Grande',
      },
    });

    console.log('✅ Unidade criada');
  }

  console.log('----------------------------------------------------');
  console.log('🎉 Seed executado com sucesso!');
  console.log(`Tenant: ${tenant.nome}`);
  console.log(`Admin: ${admin.username}`);
  console.log(`Unidade: ${unidade.nomeSistema}`);
  console.log('----------------------------------------------------');
}

seed()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });