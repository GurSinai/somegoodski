import { exec } from 'node:child_process';

export function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}
