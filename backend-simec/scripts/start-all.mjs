import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function launch(file, restartOnExit = false) {
  const child = spawn(process.execPath, [join(root, file)], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (file === 'server.js') {
      console.error(`[LAUNCHER] server.js encerrou (code=${code}, signal=${signal}) — encerrando container.`);
      process.exit(code ?? 1);
    }
    const delay = 3000;
    console.warn(`[LAUNCHER] worker.js encerrou (code=${code}, signal=${signal}) — reiniciando em ${delay / 1000}s...`);
    setTimeout(() => launch(file, true), delay);
  });

  return child;
}

launch('server.js');
launch('worker.js');
