// Serves the built app (dist/) locally, opens the browser, and shuts itself down
// after IDLE_MINUTES without any request. While the app is open, the page pings
// /__heartbeat every minute (see src/main.tsx), so closing the tab starts the countdown.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './open-browser.mjs';

const PORT = Number(process.env.PORT ?? 4173);
const IDLE_MINUTES = Number(process.env.IDLE_MINUTES ?? 10);
const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const URL_ = `http://localhost:${PORT}`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.woff2': 'font/woff2',
};


if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No build found. Run "npm run build" first (or use "npm run release").');
  process.exit(1);
}

let lastRequest = Date.now();

const server = createServer((req, res) => {
  lastRequest = Date.now();
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);

  if (path === '/__heartbeat') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    return res.end();
  }

  // stay inside dist/; unknown paths fall back to the app (it uses hash routing anyway)
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');

  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const { size } = statSync(file);
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);

  // range requests let background videos stream and loop smoothly
  if (range && type.startsWith('video/')) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return createReadStream(file, { start, end }).pipe(res);
  }

  const immutable = path.startsWith('/assets/'); // hashed file names
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...(type.startsWith('video/') ? { 'Accept-Ranges': 'bytes' } : {}),
  });
  createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // most likely SkiPlanner is already running: just open it
    console.log(`Port ${PORT} is busy (SkiPlanner probably already running). Opening ${URL_}`);
    openBrowser(URL_);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`\n  ❄  SkiPlanner is running at ${URL_}`);
  console.log(`     It stops by itself ${IDLE_MINUTES} minutes after you close the app, or close this window to stop now.\n`);
  openBrowser(URL_);
});

setInterval(() => {
  if (Date.now() - lastRequest > IDLE_MINUTES * 60_000) {
    console.log(`No activity for ${IDLE_MINUTES} minutes, shutting down. Bye! ⛷️`);
    server.close();
    process.exit(0);
  }
}, 30_000);
