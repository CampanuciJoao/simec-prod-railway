/**
 * Roda prisma migrate deploy com suporte a baseline automatico.
 *
 * Quando o banco existe mas nao tem a tabela _prisma_migrations (criado via
 * db push), o migrate deploy retorna P3005. Nesse caso este script marca
 * todas as migrations existentes como ja aplicadas (baseline) e depois roda
 * o deploy normalmente — apenas migrations novas serao executadas.
 */

import { execSync, spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations');

function run(cmd, silent = false) {
  return spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    stdio: silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
}

function getMigrationNames() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

console.log('[migrate] Iniciando prisma migrate deploy...');

const first = run('npx prisma migrate deploy');

if (first.status === 0) {
  console.log('[migrate] Deploy concluido com sucesso.');
  process.exit(0);
}

const output = (first.stdout || '') + (first.stderr || '');

if (!output.includes('P3005')) {
  process.stderr.write(output);
  process.exit(first.status ?? 1);
}

console.log('[migrate] P3005 detectado — realizando baseline das migrations existentes...');

const migrations = getMigrationNames();

for (const name of migrations) {
  const result = run(`npx prisma migrate resolve --applied "${name}"`, true);
  if (result.status === 0) {
    console.log(`[migrate] baseline: ${name}`);
  } else {
    const err = (result.stdout || '') + (result.stderr || '');
    if (err.includes('already recorded')) {
      console.log(`[migrate] ja registrada: ${name}`);
    } else {
      console.warn(`[migrate] aviso ao registrar ${name}:`, err.trim());
    }
  }
}

console.log('[migrate] Baseline concluido. Rodando migrate deploy...');

const second = run('npx prisma migrate deploy');
process.exit(second.status ?? 0);
