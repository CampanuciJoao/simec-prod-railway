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

console.log('[migrate] Iniciando prisma migrate deploy...');

const first = run('npx prisma migrate deploy');
const firstOutput = (first.stdout ?? '') + (first.stderr ?? '');

if (first.status === 0) {
  console.log('[migrate] Deploy concluido com sucesso.');
  process.exit(0);
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
