// Audita a autoria das manutenções existentes, lendo do log de criação.
//
// USO:
//   node scripts/auditarAutoriaManutencoes.mjs                 # todos os tenants
//   node scripts/auditarAutoriaManutencoes.mjs --tenant <id>   # só um tenant
//   node scripts/auditarAutoriaManutencoes.mjs --email <email> # tenant do usuário
//
// O DATABASE_URL precisa estar configurado (mesmo banco em que você está
// vendo as OS no front). Use o .env do backend ou exporte antes de rodar.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = { tenant: null, email: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--tenant' && argv[i + 1]) {
      args.tenant = argv[i + 1];
      i += 1;
    }
    if (argv[i] === '--email' && argv[i + 1]) {
      args.email = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function resolverTenantId({ tenant, email }) {
  if (tenant) return tenant;
  if (!email) return null;
  const usuario = await prisma.usuario.findFirst({
    where: { email },
    select: { tenantId: true, nome: true, email: true },
  });
  if (!usuario) {
    console.error(`Usuário "${email}" não encontrado.`);
    process.exit(1);
  }
  console.log(`Filtrando pelo tenant do usuário ${usuario.nome} <${usuario.email}>`);
  return usuario.tenantId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantId = await resolverTenantId(args);

  const manutencoes = await prisma.manutencao.findMany({
    where: tenantId ? { tenantId } : {},
    select: {
      id: true,
      tenantId: true,
      numeroOS: true,
      tipo: true,
      status: true,
      createdAt: true,
      descricaoProblemaServico: true,
      origemAbertura: true,
      equipamento: { select: { tag: true, modelo: true, unidade: { select: { nomeSistema: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Heurística para flaggar OS provavelmente criadas pelo agente IA:
  // assinatura da descrição padrão do agente (dbManager.montarDescricaoFinal).
  const DESCRICOES_PADRAO_AGENTE = new Set([
    'Manutenção preventiva de rotina',
    'manutenção preventiva de rotina',
  ]);
  function provavelmenteIA(m) {
    if (m.origemAbertura === 'agente' || m.origemAbertura === 'ia') return true;
    if (DESCRICOES_PADRAO_AGENTE.has((m.descricaoProblemaServico || '').trim())) return true;
    return false;
  }

  console.log(`\nTotal de manutenções: ${manutencoes.length}\n`);

  for (const m of manutencoes) {
    const log = await prisma.logAuditoria.findFirst({
      where: {
        tenantId: m.tenantId,
        entidade: 'Manutenção',
        entidadeId: m.id,
        acao: 'CRIAÇÃO',
      },
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        autor: { select: { nome: true, email: true } },
      },
    });

    const autor = log?.autor
      ? `${log.autor.nome} <${log.autor.email}>`
      : '(sem log de criação)';
    const data = log?.timestamp?.toISOString() || m.createdAt.toISOString();
    const unidade = m.equipamento?.unidade?.nomeSistema || '—';
    const equipRotulo = m.equipamento ? `${m.equipamento.modelo} (${m.equipamento.tag})` : '—';

    const flagIA = provavelmenteIA(m) ? '[IA?]' : '     ';

    console.log(
      `${flagIA} OS ${m.numeroOS.padEnd(16)} | ${m.tipo.padEnd(11)} | ${m.status.padEnd(22)} | ` +
      `${unidade.padEnd(28)} | ${equipRotulo.padEnd(36)} | ${data} | ${autor}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
