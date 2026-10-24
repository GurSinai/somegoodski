/**
 * Three-way merge of JSON-like values: what changed on each side since the common base.
 *
 * - Only one side changed a value → that side wins.
 * - Both changed it: objects merge key by key, lists of records (with `id` or `friendId`)
 *   merge record by record, lists of strings merge as sets, anything else → local wins
 *   and a conflict is reported.
 * - A record deleted on one side but edited on the other is kept (with a conflict).
 */

export interface Conflict {
  path: string[]; // human-readable trail, e.g. ['Tignes', 'Hotels', 'Old Chalet', 'price']
  kept: unknown; // the local value that won
  replaced: unknown; // the remote value it replaced (undefined = remote deleted it)
  kind: 'value' | 'kept-deleted';
}

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

const keyOf = (item: Json): string | null => {
  if (!isObj(item)) return null;
  if (typeof item.id === 'string') return item.id;
  if (typeof item.friendId === 'string') return item.friendId;
  return null;
};
const isRecordList = (...lists: Json[][]) => lists.every((l) => l.every((x) => keyOf(x) !== null)) && lists.some((l) => l.length);
const isStringList = (...lists: Json[][]) => lists.every((l) => l.every((x) => typeof x === 'string'));
/** A readable name for a record in conflict notices: its name, or its profile's (people). */
const labelOf = (item: Json, fallback: string) => {
  if (!isObj(item)) return fallback;
  const name = typeof item.name === 'string' ? item.name : isObj(item.profile) && typeof item.profile.name === 'string' ? item.profile.name : '';
  return name || fallback;
};

export function merge3<T>(base: T, local: T, remote: T, conflicts: Conflict[] = [], path: string[] = []): T {
  if (deepEqual(local, remote)) return local;
  if (deepEqual(base, local)) return remote;
  if (deepEqual(base, remote)) return local;

  if (Array.isArray(local) && Array.isArray(remote)) {
    const b = Array.isArray(base) ? base : [];
    if (isRecordList(b, local, remote)) return mergeRecords(b, local, remote, conflicts, path) as T;
    if (isStringList(b, local, remote)) return mergeSet(b as string[], local as string[], remote as string[]) as T;
  }
  if (isObj(local) && isObj(remote)) {
    const b: Record<string, Json> = isObj(base) ? base : {};
    const out: Record<string, Json> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(b[k], local[k], remote[k], conflicts, [...path, k]);
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }
  conflicts.push({ path, kept: local, replaced: remote, kind: 'value' });
  return local;
}

function mergeRecords(base: Json[], local: Json[], remote: Json[], conflicts: Conflict[], path: string[]): Json[] {
  const map = (l: Json[]) => new Map(l.map((x) => [keyOf(x)!, x]));
  const B = map(base), L = map(local), R = map(remote);
  // local order first, then records only the remote has
  const keys = [...L.keys(), ...[...R.keys()].filter((k) => !L.has(k))];
  for (const k of B.keys()) if (!keys.includes(k)) keys.push(k);
  const out: Json[] = [];
  for (const k of keys) {
    const b = B.get(k), l = L.get(k), r = R.get(k);
    const label = labelOf(l ?? r ?? b, k);
    if (l !== undefined && r !== undefined) out.push(merge3(b, l, r, conflicts, [...path, label]));
    else if (l !== undefined) {
      // missing remotely: new here, or deleted there
      if (b === undefined) out.push(l);
      else if (!deepEqual(b, l)) {
        conflicts.push({ path: [...path, label], kept: l, replaced: undefined, kind: 'kept-deleted' });
        out.push(l);
      }
    } else if (r !== undefined) {
      if (b === undefined) out.push(r);
      else if (!deepEqual(b, r)) {
        conflicts.push({ path: [...path, label], kept: r, replaced: undefined, kind: 'kept-deleted' });
        out.push(r);
      }
    }
  }
  return out;
}

function mergeSet(base: string[], local: string[], remote: string[]): string[] {
  const B = new Set(base), L = new Set(local), R = new Set(remote);
  const keep = (x: string) => (L.has(x) && R.has(x)) || (L.has(x) && !B.has(x)) || (R.has(x) && !B.has(x));
  const out = [...new Set([...local, ...remote])].filter(keep);
  const sorted = local.every((x, i) => i === 0 || local[i - 1] <= x);
  return sorted ? out.sort() : out;
}
