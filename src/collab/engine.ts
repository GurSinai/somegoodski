/**
 * Keeps shared vacations in sync with the backend (Firebase in the app, a fake in tests).
 *
 * The backend tells us when a vacation changes; local edits are saved about 2 s after they
 * settle. Each sync is a three-way merge of the last agreed version (base), the local data and
 * the stored version, so both planners' edits are kept. A save only succeeds on top of the
 * latest version; otherwise we fetch, merge again and retry.
 */
import { CURRENT_VERSION, migrate } from '../store/migrate';
import { useStore } from '../store/useStore';
import { applyShared, extractShared, makeFile, type SharedData, type SharedVacationFile } from './bundle';
import { deepEqual, merge3, type Conflict } from './merge';
import { currentMe, useCollab } from './useCollab';

const PUSH_DELAY_MS = 2000;

/** A save was based on an old version: someone saved first. */
export class ConflictError extends Error {
  constructor() {
    super('Someone saved this vacation first');
  }
}

/** Where shared vacations are stored. */
export interface Backend {
  get(vacationId: string): Promise<{ file: SharedVacationFile; version: number } | null>;
  /** Saves on top of `expectedVersion`; resolves with the new version or throws ConflictError. */
  save(vacationId: string, file: SharedVacationFile, expectedVersion: number): Promise<number>;
  create(vacationId: string, file: SharedVacationFile): Promise<void>;
  remove(vacationId: string): Promise<void>;
  /** Calls back whenever the stored vacation changes (also once right away). */
  watch(vacationId: string, onChange: () => void): () => void;
}

let backend: Backend | null = null;
export const setBackend = (b: Backend | null) => {
  backend = b;
  refreshWatches();
};
export const hasBackend = () => backend !== null;

const vacationName = (id: string) => useStore.getState().vacations.find((v) => v.id === id)?.name ?? 'a vacation';

/** Shared data as stored locally right now, in a canonical order so comparisons ignore list order. */
export function localShared(vacationId: string) {
  const ex = extractShared(useStore.getState(), vacationId, currentMe());
  return ex && { winter: ex.winter, data: canonical(ex.data) };
}
const byKey = <T,>(key: (t: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
export function canonical(d: SharedData): SharedData {
  return {
    ...d,
    people: [...d.people].sort(byKey((p) => p.id)),
    trips: [...d.trips].sort(byKey((t) => `${t.createdAt}|${t.id}`)),
    resorts: [...d.resorts].sort(byKey((r) => r.id)),
    airports: [...d.airports].sort(byKey((a) => a.iata)),
  };
}

/** Brings a file from an older app version up to this one's data model. */
export function upgrade(file: SharedVacationFile): SharedData {
  if (file.appVersion >= CURRENT_VERSION) return file.data;
  const d = file.data;
  // run the regular migrations on a throwaway copy holding just this vacation
  const tmp = {
    version: file.appVersion,
    settings: useStore.getState().settings,
    friends: [],
    winters: [{ id: 'shared', ...file.winter, participants: [], createdAt: '' }],
    vacations: [{ ...d.vacation, winterId: 'shared', guests: d.people }],
    trips: d.trips,
    resorts: d.resorts,
    airports: d.airports,
  };
  return extractShared(migrate(tmp, file.appVersion), d.vacation.id, currentMe())?.data ?? d;
}

// ---------------------------------------------------------------- status

let inFlight = 0;
let lastError: { offline: boolean; message: string } | null = null;
function refreshStatus() {
  const c = useCollab.getState();
  if (!backend || !Object.keys(c.shared).length) return c.setStatus('off', null, 0);
  const waiting = Object.entries(c.shared).filter(([id, e]) => {
    const l = localShared(id);
    return l && !deepEqual(l.data, e.base);
  }).length;
  if (inFlight) return c.setStatus('syncing', null, waiting);
  if (lastError) return c.setStatus(lastError.offline ? 'offline' : 'error', lastError.message, waiting);
  c.setStatus('idle', null, waiting);
}

const isOffline = (e: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  /unavailable|offline|network/i.test(String((e as { code?: string })?.code ?? (e as Error)?.message));

// ---------------------------------------------------------------- the sync cycle

const queues = new Map<string, Promise<void>>();
/** Runs syncs of one vacation one after another. */
function enqueue(vacationId: string, task: () => Promise<void>): Promise<void> {
  const next = (queues.get(vacationId) ?? Promise.resolve()).then(async () => {
    inFlight++;
    refreshStatus();
    try {
      await task();
      lastError = null;
    } catch (e) {
      const offline = isOffline(e);
      lastError = { offline, message: offline ? 'You’re offline. Changes will sync when you reconnect.' : (e as Error).message };
      console.warn('[sync]', e);
    } finally {
      inFlight--;
      refreshStatus();
    }
  });
  queues.set(vacationId, next);
  return next;
}

let applying = false;
/** Writes shared data into the local store without it counting as a local edit. */
export const applyLocal = (winter: SharedVacationFile['winter'], data: SharedData) => {
  applying = true;
  try {
    useStore.setState((s) => applyShared(s, winter, data, currentMe()));
  } finally {
    applying = false;
  }
};

export function syncNow(vacationId: string): Promise<void> {
  return enqueue(vacationId, () => cycle(vacationId));
}

async function cycle(vacationId: string, attempt = 0): Promise<void> {
  const collab = useCollab.getState();
  const entry = collab.shared[vacationId];
  if (!backend || !entry || entry.paused) return;
  if (!localShared(vacationId)) return; // vacation removed locally; the UI decides whether to delete it for both

  const got = await backend.get(vacationId);
  if (!got) {
    collab.setShared(vacationId, null);
    collab.addNotice(vacationId, `“${vacationName(vacationId)}” is no longer shared: it was deleted for everyone. Your copy stays here.`);
    return;
  }
  const changedRemotely = got.version !== entry.version;
  if (changedRemotely && got.file.appVersion > CURRENT_VERSION) {
    collab.patchShared(vacationId, { paused: `${got.file.updatedBy} is on a newer SomeGoodSki. Reload the page to update and keep syncing.` });
    return;
  }
  const remote = changedRemotely ? canonical(upgrade(got.file)) : entry.base;

  // Read local data only now, after the await: edits made while we waited must be part of the
  // merge, and nothing below may await before the merge is written back.
  const local = localShared(vacationId);
  if (!local) return;
  const conflicts: Conflict[] = [];
  const merged = canonical(merge3(entry.base, local.data, remote, conflicts));
  const peopleBefore = new Set(local.data.people.map((p) => p.id));
  if (!deepEqual(merged, local.data)) applyLocal(got.file.winter, merged);
  const final = localShared(vacationId)!; // the merge as stored locally

  if (changedRemotely && !deepEqual(remote, entry.base)) {
    const who = got.file.updatedBy;
    const added = final.data.people.filter((p) => !peopleBefore.has(p.id));
    for (const p of added) collab.addNotice(vacationId, `${who} added ${p.profile.name || 'someone'} to “${final.data.vacation.name}”.`);
    if (!added.length) collab.addNotice(vacationId, `${who} updated “${final.data.vacation.name}”.`);
  }
  reportConflicts(vacationId, conflicts, changedRemotely ? got.file.updatedBy : 'your partner');

  if (deepEqual(final.data, remote)) {
    collab.patchShared(vacationId, { base: final.data, version: got.version, lastSyncAt: new Date().toISOString() });
    return;
  }
  try {
    const version = await backend.save(vacationId, makeFile(final.winter, final.data, currentMe().name), got.version);
    collab.patchShared(vacationId, { base: final.data, version, lastSyncAt: new Date().toISOString() });
  } catch (e) {
    // someone saved in between: fetch again and merge on top
    if (e instanceof ConflictError && attempt < 3) return cycle(vacationId, attempt + 1);
    throw e;
  }
}

const FIELD_LABELS: Record<string, string> = {
  skillLevel: 'skill', defaultBudget: 'budget', liftMin: 'minutes to the lift', pricePerPerson: 'price per person', availability: 'availability',
  hotels: 'hotels', flights: 'flights', transfers: 'transfers', skiPasses: 'ski passes', shops: 'ski stores', expenses: 'expenses', vacation: 'vacation',
};
const show = (v: unknown) => (v === undefined ? 'nothing' : typeof v === 'object' ? 'their version' : JSON.stringify(v));
function reportConflicts(vacationId: string, conflicts: Conflict[], partner: string) {
  const collab = useCollab.getState();
  for (const c of conflicts.slice(0, 5)) {
    const where = c.path.filter((p) => !/^(data|trips|people|profile)$/.test(p)).map((p) => FIELD_LABELS[p] ?? p).join(' › ');
    collab.addNotice(
      vacationId,
      c.kind === 'kept-deleted'
        ? `${where}: one of you removed it while the other edited it, so it was kept.`
        : `You and ${partner} both changed ${where}. Kept ${show(c.kept)}, replaced ${show(c.replaced)}.`,
    );
  }
  if (conflicts.length > 5) collab.addNotice(vacationId, `…and ${conflicts.length - 5} more overlapping edits.`);
}

// ---------------------------------------------------------------- triggers

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const watches = new Map<string, () => void>();

/** One live listener per shared vacation. */
function refreshWatches() {
  const ids = backend ? Object.keys(useCollab.getState().shared) : [];
  for (const [id, stop] of watches) {
    if (!ids.includes(id)) {
      stop();
      watches.delete(id);
    }
  }
  for (const id of ids) if (!watches.has(id)) watches.set(id, backend!.watch(id, () => void syncNow(id)));
  refreshStatus();
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;
  useStore.subscribe(() => {
    if (applying) return;
    for (const [id, entry] of Object.entries(useCollab.getState().shared)) {
      const l = localShared(id);
      if (!l || deepEqual(l.data, entry.base)) continue;
      clearTimeout(timers.get(id));
      timers.set(id, setTimeout(() => void syncNow(id), PUSH_DELAY_MS));
    }
    refreshStatus();
  });
  useCollab.subscribe((s, prev) => {
    if (Object.keys(s.shared).join() !== Object.keys(prev.shared).join()) refreshWatches();
  });
  if (typeof window !== 'undefined') window.addEventListener('online', () => Object.keys(useCollab.getState().shared).forEach((id) => void syncNow(id)));
  refreshWatches();
}

// ---------------------------------------------------------------- actions for the UI

/** Starts sharing a local vacation. */
export async function shareVacation(vacationId: string): Promise<void> {
  if (!backend) throw new Error('Sign in first');
  const local = localShared(vacationId);
  if (!local) throw new Error('Vacation not found');
  await backend.create(vacationId, makeFile(local.winter, local.data, currentMe().name));
  useCollab.getState().setShared(vacationId, { version: 1, base: local.data, lastSyncAt: new Date().toISOString() });
}

/** Imports a shared vacation you're a member of (after joining, or on another device). */
export async function openShared(vacationId: string): Promise<{ vacationId: string; winterId: string }> {
  if (!backend) throw new Error('Sign in first');
  const got = await backend.get(vacationId);
  if (!got) throw new Error('That vacation no longer exists.');
  if (got.file.appVersion > CURRENT_VERSION) throw new Error(`${got.file.updatedBy} is on a newer SomeGoodSki. Reload the page to update first.`);
  applyLocal(got.file.winter, canonical(upgrade(got.file)));
  const final = localShared(vacationId)!;
  useCollab.getState().setShared(vacationId, { version: got.version, base: final.data, lastSyncAt: new Date().toISOString() });
  return { vacationId, winterId: useStore.getState().vacations.find((v) => v.id === vacationId)!.winterId };
}

/** Stops syncing a vacation; with `deleteForBoth` it is deleted for every collaborator. */
export async function stopSharing(vacationId: string, deleteForBoth: boolean): Promise<void> {
  if (deleteForBoth && backend) await backend.remove(vacationId);
  clearTimeout(timers.get(vacationId));
  useCollab.getState().setShared(vacationId, null);
}
