/**
 * Roda prisma migrate deploy com suporte a baseline automatico.
 *
 * Quando o banco existe mas nao tem a tabela _prisma_migrations (criado via
 * db push), o migrate deploy retorna P3005. Nesse caso este script:
 *   1. Marca todas as migrations EXCETO a ultima como "ja aplicadas" (baseline)
 *   2. Roda migrate deploy, que executa APENAS o SQL da ultima migration
 *
 * Nas proximas implantacoes, _prisma_migrations ja existe e o deploy funciona
 * normalmente na primeira tentativa.
 */

import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations');

function run(cmd, { silent = false } = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (!silent) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  return result;
}

function getMigrationNames() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// Recovery do erro P3009 pra migrations especificas que sabemos como
// desfazer. Cada entrada: nome da migration + ARRAY de statements SQL
// (um por entrada — Prisma usa prepared statements e rejeita 'multiple
// commands into a prepared statement'). O array roda inteiro dentro de
// uma transacao do Prisma — tudo ou nada. Depois do recovery, o SQL
// corrigido da migration e aplicado no proximo migrate deploy.
const RECOVERY_SQL_POR_MIGRATION = {
  '20261105000001_solar_falhas_e_agregados': [
    'DROP TABLE IF EXISTS "solar_agregados_mensais" CASCADE',
    'DROP TABLE IF EXISTS "solar_agregados_diarios" CASCADE',
    'DROP TABLE IF EXISTS "solar_falhas" CASCADE',
    'ALTER TABLE "solar_plants" DROP COLUMN IF EXISTS "alerta_offline_minutos"',
    `DELETE FROM "_prisma_migrations"
       WHERE migration_name = '20261105000001_solar_falhas_e_agregados'`,
  ],
  '20261111000001_telegram_foxess_energia': [
    'ALTER TABLE "telegram_notificacoes" DROP COLUMN IF EXISTS "recebeAlertasFoxessEnergia"',
    `DELETE FROM "_prisma_migrations"
       WHERE migration_name = '20261111000001_telegram_foxess_energia'`,
  ],
  '20261107000003_controle_manutencoes': [
    'DROP TABLE IF EXISTS "rotinas_prediais" CASCADE',
    'ALTER TABLE "equipamentos" DROP COLUMN IF EXISTS "frequencia_preventiva_meses"',
    `DELETE FROM "_prisma_migrations"
       WHERE migration_name = '20261107000003_controle_manutencoes'`,
  ],
  '20261107000001_simplificar_tipos_prediais': [
    // Caso fique "meio no caminho" com o enum antigo renomeado:
    // restaura o nome, dropando o novo se existir. Se a migration nem
    // chegou a renomear, isso e no-op.
    `DO $do$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoServicoPredial_old') THEN
           ALTER TABLE "manutencoes" ALTER COLUMN "tipo_servico_predial" TYPE text;
           IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoServicoPredial') THEN
             DROP TYPE "TipoServicoPredial";
           END IF;
           ALTER TYPE "TipoServicoPredial_old" RENAME TO "TipoServicoPredial";
           ALTER TABLE "manutencoes" ALTER COLUMN "tipo_servico_predial" TYPE "TipoServicoPredial"
             USING "tipo_servico_predial"::"TipoServicoPredial";
         END IF;
       END
     $do$`,
    `DELETE FROM "_prisma_migrations"
       WHERE migration_name = '20261107000001_simplificar_tipos_prediais'`,
  ],
  '20261106000001_manutencao_predial': [
    `ALTER TABLE "manutencoes"
      DROP CONSTRAINT IF EXISTS "manutencoes_unidade_predial_fkey"`,
    'DROP INDEX IF EXISTS "manutencoes_tenantId_categoria_idx"',
    'ALTER TABLE "manutencoes" DROP COLUMN IF EXISTS "categoria"',
    'ALTER TABLE "manutencoes" DROP COLUMN IF EXISTS "tipo_servico_predial"',
    'ALTER TABLE "manutencoes" DROP COLUMN IF EXISTS "unidade_predial_id"',
    // Restaura NOT NULL em equipamento_id (safe — ja era NOT NULL antes)
    `DO $do$
       BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'manutencoes'
                      AND column_name = 'equipamento_id'
                      AND is_nullable = 'YES') THEN
           ALTER TABLE "manutencoes" ALTER COLUMN "equipamento_id" SET NOT NULL;
         END IF;
       END
     $do$`,
    'DROP TYPE IF EXISTS "TipoServicoPredial"',
    'DROP TYPE IF EXISTS "CategoriaManutencao"',
    `DELETE FROM "_prisma_migrations"
       WHERE migration_name = '20261106000001_manutencao_predial'`,
  ],
};

async function executarRecoverySql(statements) {
  // Lazy import pra nao pagar o custo quando nao precisa de recovery.
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  try {
    // $transaction com array de executeRawUnsafe = tudo ou nada. Prisma
    // nao aceita BEGIN/COMMIT embutido no SQL (prepared statements),
    // mas trata a lista como transacao automaticamente.
    await client.$transaction(
      statements.map((sql) => client.$executeRawUnsafe(sql))
    );
  } finally {
    await client.$disconnect();
  }
}

// Consulta _prisma_migrations pra achar qual migration esta com
// finished_at NULL (= failed). Usado quando o output do Prisma nao
// explicita o nome da migration que falhou.
async function obterMigrationFalhada() {
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  try {
    const rows = await client.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1'
    );
    return rows?.[0]?.migration_name || null;
  } catch {
    return null;
  } finally {
    await client.$disconnect();
  }
}

console.log('[migrate] Iniciando prisma migrate deploy...');

let first = run('npx prisma migrate deploy');
let firstOutput = (first.stdout ?? '') + (first.stderr ?? '');

if (first.status === 0) {
  console.log('[migrate] Deploy concluido com sucesso.');
  process.exit(0);
}

// P3009 = migration anterior ficou com finished_at NULL (crashou no meio).
// Tenta recovery para migrations conhecidas, depois re-aplica.
if (firstOutput.includes('P3009')) {
  // Primeiro tenta pegar o nome do stdout; se Prisma nao informou,
  // consulta _prisma_migrations direto no banco.
  const matchFalha = firstOutput.match(/The `([^`]+)` migration started at [^ ]+ UTC failed/);
  let migrationFalhada = matchFalha?.[1];
  if (!migrationFalhada) {
    migrationFalhada = await obterMigrationFalhada();
    if (migrationFalhada) {
      console.log(`[migrate] Migration falhada detectada via DB: ${migrationFalhada}`);
    }
  }
  const statements = migrationFalhada ? RECOVERY_SQL_POR_MIGRATION[migrationFalhada] : null;

  if (statements) {
    console.log(`[migrate] P3009 detectado para ${migrationFalhada}. Executando recovery SQL (${statements.length} statements)...`);
    try {
      await executarRecoverySql(statements);
      console.log('[migrate] Recovery concluido. Reaplicando migrate deploy...');
      const retry = run('npx prisma migrate deploy');
      if (retry.status === 0) {
        console.log('[migrate] Deploy concluido com sucesso apos recovery.');
        process.exit(0);
      }
      console.error('[migrate] Deploy falhou mesmo apos recovery.');
      process.exit(retry.status ?? 1);
    } catch (err) {
      console.error('[migrate] Recovery falhou:', err?.message || err);
      process.exit(1);
    }
  } else {
    console.error(`[migrate] P3009 sem recovery conhecido para: ${migrationFalhada || '<sem nome>'}`);
    console.error('[migrate] Rode manualmente: npx prisma migrate resolve --rolled-back <nome>');
    process.exit(1);
  }
}

if (!firstOutput.includes('P3005')) {
  process.exit(first.status ?? 1);
}

// P3005 significa que o banco foi criado via db push (sem _prisma_migrations).
// Nesse caso o schema já está atualizado, então fazemos baseline de TODAS as
// migrations para registrar o histórico. O migrate deploy seguinte não encontra
// nada pendente e encerra com sucesso.
console.log('[migrate] P3005 detectado — realizando baseline de todas as migrations...');

const migrations = getMigrationNames();

for (const name of migrations) {
  const r = run(`npx prisma migrate resolve --applied "${name}"`, { silent: true });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  if (r.status === 0 || out.includes('already recorded')) {
    console.log(`[migrate] baseline: ${name}`);
  } else {
    console.warn(`[migrate] aviso (${name}):`, out.trim());
  }
}

console.log('[migrate] Baseline concluido. Verificando migrations pendentes...');

const second = run('npx prisma migrate deploy');
process.exit(second.status ?? 0);
