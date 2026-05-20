// Conta quantos registros dependentes o superadmin tem no tenant atual.
// Ajuda a decidir entre migrar (com cleanup) vs criar identidade nova.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sa = await prisma.$queryRawUnsafe(`
    SELECT id, username, email, "tenantId" FROM usuarios WHERE role = 'superadmin'
  `);
  console.log('Superadmins atuais:', sa);

  if (!sa.length) return;
  const id = sa[0].id;

  const tabelas = [
    ['alertas_lidos_por_usuario', 'usuarioId'],
    ['log_auditoria', 'autor_id'],
    ['notas_andamento', 'autorId'],
    ['os_corretivas', 'autorId'],
    ['manutencao_eventos', 'autorId'],
    ['auth_sessions', 'usuarioId'],
    ['password_reset_tokens', 'usuarioId'],
    ['orcamentos', 'criadorId'],
    ['ai_pipeline_estados', 'pausadoPorId'],
    ['aceites_termos', 'usuarioId'],
    ['testes_qualidade', 'autorId'],
    ['alertas_feedback', 'usuarioId'],
  ];

  for (const [tabela, col] of tabelas) {
    try {
      const r = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "${tabela}" WHERE "${col}" = $1`,
        id
      );
      const n = Number(r[0]?.n || 0);
      if (n > 0) console.log(`  ${tabela}.${col}: ${n}`);
    } catch (err) {
      // Coluna ou tabela pode não existir/ter nome diferente. Tudo bem.
      console.log(`  ${tabela}.${col}: (erro: ${err.message.split('\n')[0]})`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
