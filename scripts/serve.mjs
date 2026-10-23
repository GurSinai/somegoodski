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
const DIST = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
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

/** Streams a file; a read error (e.g. the file is locked or vanished) just ends this response. */
function send(res, file, options) {
  const stream = createReadStream(file, options);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

function handle(req, res) {
  lastRequest = Date.now();
  let path;
  try {
    path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  if (path === '/__heartbeat') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    return res.end();
  }

  let file = normalize(join(DIST, path));
  const found = file.startsWith(DIST) && existsSync(file) && !statSync(file).isDirectory();
  if (!found) {
    // a missing build file is a real error (e.g. a tab still open from an older build); anything else is the app
    if (path.startsWith('/assets/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      return res.end('Not found. Reload the page to get the latest version.');
    }
    file = join(DIST, 'index.html');
  }

  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const { size, mtimeMs } = statSync(file);
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);

  // Browsers re-check every file (cheap: unchanged files get a 304), so a wrong answer can
  // never get stuck in their cache, as long-lived "immutable" caching once allowed.
  const etag = `"${size.toString(36)}-${Math.round(mtimeMs).toString(36)}"`;
  if (!range && req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
    return res.end();
  }

  // range requests let background videos stream and loop smoothly
  if (range && type.startsWith('video/')) {
    let start = range[1] ? Number(range[1]) : NaN;
    let end = range[2] ? Number(range[2]) : NaN;
    if (Number.isNaN(start)) { start = Math.max(0, size - (Number.isNaN(end) ? size : end)); end = size - 1; } // "bytes=-N": last N bytes
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return send(res, file, { start, end });
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': size,
    'Cache-Control': 'no-cache',
    ETag: etag,
    ...(type.startsWith('video/') ? { 'Accept-Ranges': 'bytes' } : {}),
  });
  send(res, file);
}

const server = createServer((req, res) => {
  try {
    handle(req, res);
  } catch (err) {
    // never let one bad request take the whole app down
    console.error('Request failed:', req.url, err.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

// last line of defence: log and keep serving
process.on('uncaughtException', (err) => console.error('Unexpected error (still running):', err.message));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // most likely SomeGoodSki is already running: just open it
    console.log(`Port ${PORT} is busy (SomeGoodSki probably already running). Opening ${URL_}`);
    openBrowser(URL_);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`\n  ❄  SomeGoodSki is running at ${URL_}`);
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
