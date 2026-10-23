/** Minimal GitHub Contents API client for one private repo. Runs in the browser with a fine-grained token. */

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface Conn {
  repo: string; // "owner/name"
  token: string;
}

export type GetResult<T> = { notModified: true } | { notModified: false; content: T; sha: string; etag: string | null } | { missing: true };

const API = 'https://api.github.com';

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function call(conn: Conn, path: string, init: RequestInit = {}, extraHeaders: Record<string, string> = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}/repos/${conn.repo}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${conn.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...extraHeaders,
      },
    });
  } catch {
    throw new GitHubError('Can’t reach GitHub. Check your internet connection.', 0);
  }
  if (res.status === 401) throw new GitHubError('GitHub rejected the token. Create a new one and paste it again.', 401);
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') throw new GitHubError('GitHub rate limit reached. Sync resumes in a few minutes.', 403);
  return res;
}

async function fail(res: Response, what: string): Promise<never> {
  let detail = '';
  try {
    detail = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    /* no body */
  }
  throw new GitHubError(`${what} failed (${res.status}${detail ? `: ${detail}` : ''})`, res.status);
}

/** Checks the token can write to the repo. */
export async function checkRepo(conn: Conn): Promise<{ fullName: string; private: boolean }> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(conn.repo)) throw new GitHubError('Repo should look like owner/name.', 0);
  const res = await call(conn, '');
  if (res.status === 404) throw new GitHubError('Repo not found, or the token has no access to it.', 404);
  if (!res.ok) await fail(res, 'Checking the repo');
  const repo = (await res.json()) as { full_name: string; private: boolean; permissions?: { push?: boolean } };
  if (repo.permissions && !repo.permissions.push) throw new GitHubError('The token can read this repo but not write to it. Give it “Contents: Read and write”.', 403);
  return { fullName: repo.full_name, private: repo.private };
}

/** Reads and parses a JSON file. Pass the last ETag to get a cheap "not modified". */
export async function getJson<T>(conn: Conn, path: string, etag?: string | null): Promise<GetResult<T>> {
  const res = await call(conn, `/contents/${path}`, {}, etag ? { 'If-None-Match': etag } : {});
  if (res.status === 304) return { notModified: true };
  if (res.status === 404) return { missing: true };
  if (!res.ok) await fail(res, `Reading ${path}`);
  const body = (await res.json()) as { content: string; sha: string };
  return { notModified: false, content: JSON.parse(decodeBase64(body.content)) as T, sha: body.sha, etag: res.headers.get('etag') };
}

/** Creates or updates a file. Without the current sha GitHub refuses an update (409/422): someone pushed first. */
export async function putJson(conn: Conn, path: string, content: unknown, message: string, sha?: string): Promise<{ sha: string }> {
  const res = await call(conn, `/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: encodeBase64(`${JSON.stringify(content, null, 2)}\n`), ...(sha ? { sha } : {}) }),
  });
  if (res.status === 409 || res.status === 422) throw new GitHubError('The file changed on GitHub', 409);
  if (!res.ok) await fail(res, `Saving ${path}`);
  const body = (await res.json()) as { content: { sha: string } };
  return { sha: body.content.sha };
}

export async function deleteFile(conn: Conn, path: string, sha: string, message: string): Promise<void> {
  const res = await call(conn, `/contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message, sha }) });
  if (res.status === 404) return;
  if (!res.ok) await fail(res, `Deleting ${path}`);
}

/** Paths of the JSON files in a folder ([] if it doesn't exist yet). */
export async function listJson(conn: Conn, dir: string): Promise<string[]> {
  const res = await call(conn, `/contents/${dir}`);
  if (res.status === 404) return [];
  if (!res.ok) await fail(res, `Listing ${dir}`);
  const items = (await res.json()) as { type: string; path: string; name: string }[];
  return items.filter((i) => i.type === 'file' && i.name.endsWith('.json')).map((i) => i.path);
}
