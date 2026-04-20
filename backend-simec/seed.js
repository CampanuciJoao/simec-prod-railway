import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertHelpArticle(article) {
  return prisma.helpArticle.upsert({
    where: { slug: article.slug },
    update: article,
    create: article,
  });
}

async function seed() {
  console.log('Iniciando seed do SIMEC...');

  const tenantSlug = 'simec-default';
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      nome: 'SIMEC Default',
      timezone: 'America/Campo_Grande',
      locale: 'pt-BR',
      ativo: true,
      contatoNome: 'Equipe SIMEC',
      contatoEmail: 'suporte@simec.local',
    },
    create: {
      nome: 'SIMEC Default',
      slug: tenantSlug,
      timezone: 'America/Campo_Grande',
      locale: 'pt-BR',
      ativo: true,
      contatoNome: 'Equipe SIMEC',
      contatoEmail: 'suporte@simec.local',
    },
  });

  console.log(`Tenant OK: ${tenant.nome}`);

  const adminSenhaPlana = '751953';
  const senhaCriptografada = await bcrypt.hash(adminSenhaPlana, 10);

  const admin = await prisma.usuario.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'admin',
      },
    },
    update: {
      nome: 'Administrador do Sistema',
      email: 'admin@simec.local',
      senha: senhaCriptografada,
      role: 'superadmin',
    },
    create: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@simec.local',
      nome: 'Administrador do Sistema',
      senha: senhaCriptografada,
      role: 'superadmin',
    },
  });

  console.log('Usuario admin OK');

  const unidade = await prisma.unidade.upsert({
    where: {
      tenantId_nomeSistema: {
        tenantId: tenant.id,
        nomeSistema: 'Unidade Matriz',
      },
    },
    update: {
      nomeFantasia: 'SIMEC Matriz',
      cidade: 'Campo Grande',
      estado: 'MS',
      timezone: 'America/Campo_Grande',
    },
    create: {
      tenantId: tenant.id,
      nomeSistema: 'Unidade Matriz',
      nomeFantasia: 'SIMEC Matriz',
      cidade: 'Campo Grande',
      estado: 'MS',
      timezone: 'America/Campo_Grande',
    },
  });

  console.log('Unidade padrao OK');

  await upsertHelpArticle({
    slug: 'como-funciona-o-historico-do-ativo',
    categoria: 'Operacao',
    titulo: 'Como funciona o historico do ativo',
    resumo: 'Entenda como manutencoes, ocorrencias e alteracoes compoem a linha do tempo do equipamento.',
    conteudoMarkdown:
      'O historico do ativo consolida manutencoes, ocorrencias, transferencias e alteracoes relevantes. Use a aba Historico para leitura completa e a Ficha Tecnica para registrar eventos leves.',
    audience: 'all',
    published: true,
  });

  await upsertHelpArticle({
    slug: 'como-gerenciar-tenants-no-simec',
    categoria: 'Backoffice',
    titulo: 'Como gerenciar tenants no SIMEC',
    resumo: 'Visao geral da area superadmin para operacao do SaaS.',
    conteudoMarkdown:
      'A area Superadmin permite criar clientes, ativar ou inativar tenants, definir timezone e locale e preparar o administrador inicial de cada empresa.',
    audience: 'superadmin',
    published: true,
  });

  console.log('Artigos de ajuda OK');
  console.log('----------------------------------------');
  console.log(`Tenant: ${tenant.nome}`);
  console.log(`Admin: ${admin.username}`);
  console.log(`Unidade: ${unidade.nomeSistema}`);
  console.log('Seed executado com sucesso.');
  console.log('----------------------------------------');
}

seed()
  .catch((error) => {
    console.error('Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
