// One-command launch: if SomeGoodSki is already running just open it, otherwise build and serve.
// (Rebuilding while the server runs would fail on Windows: it holds the background videos open.)
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { openBrowser } from './open-browser.mjs';

const PORT = Number(process.env.PORT ?? 4173);

const running = await new Promise((resolve) => {
  const socket = connect(PORT, '127.0.0.1');
  socket.once('connect', () => { socket.end(); resolve(true); });
  socket.once('error', () => resolve(false));
});

if (running) {
  console.log(`SomeGoodSki is already running, opening http://localhost:${PORT}`);
  openBrowser(`http://localhost:${PORT}`);
  process.exit(0);
}

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

await import('./serve.mjs');
