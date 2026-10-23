/**
 * Keeps shared vacations in sync with the GitHub repo.
 *
 * Pull (cheap conditional GET) on start, focus, every 30 s and before each push; push about
 * 2 s after local edits settle. Each sync is a three-way merge of the last agreed version
 * (base), the local data and the file on GitHub, so both planners' edits are kept.
 */
import { useMemo } from 'react';
import { CURRENT_VERSION, migrate } from '../store/migrate';
import { useStore } from '../store/useStore';
import type { AppData } from '../types';
import { applyShared, extractShared, filePath, makeFile, type SharedData, type SharedVacationFile } from './bundle';
import { linkFriend, similarFriend, unlinkFriend } from './friends';
import { deleteFile, getJson, GitHubError, listJson, putJson, type Conn } from './github';
import { deepEqual, merge3, type Conflict } from './merge';
import { isConnected, useCollab } from './useCollab';

const PUSH_DELAY_MS = 2000;
const POLL_MS = 30_000;

const conn = (): Conn => {
  const { repo, token } = useCollab.getState();
  return { repo: repo.trim(), token: token.trim() };
};
const me = () => useCollab.getState().displayName.trim() || 'A planner';
const vacationName = (id: string) => useStore.getState().vacations.find((v) => v.id === id)?.name ?? 'a vacation';

/** Shared data as stored locally right now, in a canonical order so comparisons ignore list order. */
function localShared(vacationId: string) {
  const ex = extractShared(useStore.getState(), vacationId);
  return ex && { winter: ex.winter, data: canonical(ex.data) };
}
const byKey = <T,>(key: (t: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
export function canonical(d: SharedData): SharedData {
  return {
    ...d,
    friends: [...d.friends].sort(byKey((f) => f.id)),
    participants: [...d.participants].sort(byKey((p) => p.friendId)),
    trips: [...d.trips].sort(byKey((t) => `${t.createdAt}|${t.id}`)),
    resorts: [...d.resorts].sort(byKey((r) => r.id)),
    airports: [...d.airports].sort(byKey((a) => a.iata)),
  };
}

/** Brings a file from an older app version up to this one's data model. */
function upgrade(file: SharedVacationFile): SharedData {
  if (file.appVersion >= CURRENT_VERSION) return file.data;
  const d = file.data;
  const tmp = {
    version: file.appVersion,
    settings: useStore.getState().settings,
    friends: d.friends,
    winters: [{ id: 'shared', ...file.winter, participants: d.participants, createdAt: '' }],
    vacations: [{ ...d.vacation, winterId: 'shared' }],
    trips: d.trips,
    resorts: d.resorts,
    airports: d.airports,
  };
  return extractShared(migrate(tmp, file.appVersion), d.vacation.id)?.data ?? d;
}

// ---------------------------------------------------------------- status

let inFlight = 0;
let lastError: GitHubError | null = null;
function refreshStatus() {
  const c = useCollab.getState();
  if (!isConnected(c) || !Object.keys(c.shared).length) return c.setStatus('off', null, 0);
  const waiting = Object.entries(c.shared).filter(([id, e]) => {
    const l = localShared(id);
    return l && !deepEqual(l.data, e.base);
  }).length;
  if (inFlight) return c.setStatus('syncing', null, waiting);
  if (lastError) return c.setStatus(lastError.status === 0 ? 'offline' : 'error', lastError.message, waiting);
  c.setStatus('idle', null, waiting);
}

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
      lastError = e instanceof GitHubError ? e : new GitHubError((e as Error).message, -1);
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

export function syncNow(vacationId: string): Promise<void> {
  return enqueue(vacationId, () => cycle(vacationId));
}

async function cycle(vacationId: string, attempt = 0): Promise<void> {
  const collab = useCollab.getState();
  const entry = collab.shared[vacationId];
  if (!entry || entry.paused || !isConnected(collab)) return;
  const local = localShared(vacationId);
  if (!local) return; // vacation removed locally; the UI decides whether to delete the file

  const path = filePath(vacationId);
  const got = await getJson<SharedVacationFile>(conn(), path, attempt ? null : entry.etag);
  if ('missing' in got) {
    collab.setShared(vacationId, null);
    collab.addNotice(vacationId, `“${vacationName(vacationId)}” is no longer shared: its file was removed from GitHub. Your copy stays here.`);
    return;
  }
  let remote = entry.base;
  let sha = entry.sha;
  let etag = entry.etag;
  if (!got.notModified) {
    if (got.content.appVersion > CURRENT_VERSION) {
      collab.patchShared(vacationId, { paused: `${got.content.updatedBy} is on a newer SomeGoodSki. Update yours to keep syncing.` });
      return;
    }
    remote = canonical(upgrade(got.content));
    sha = got.sha;
    etag = got.etag;
  }

  const conflicts: Conflict[] = [];
  const merged = canonical(merge3(entry.base, local.data, remote, conflicts));

  if (!deepEqual(merged, local.data)) applyMerged(vacationId, merged, got.notModified ? null : got.content.updatedBy);
  const final = localShared(vacationId)!; // what the merge looks like once stored locally
  if (!got.notModified && !deepEqual(remote, entry.base)) {
    collab.addNotice(vacationId, `${got.content.updatedBy} updated “${final.data.vacation.name}”.`);
  }
  reportConflicts(vacationId, conflicts, got.notModified ? 'your partner' : got.content.updatedBy);

  if (deepEqual(final.data, remote)) {
    collab.patchShared(vacationId, { base: final.data, sha, etag, lastSyncAt: new Date().toISOString() });
    return;
  }
  try {
    const res = await putJson(conn(), path, makeFile(final.winter, final.data, me()), commitMessage(entry.base, final.data), sha);
    collab.patchShared(vacationId, { base: final.data, sha: res.sha, etag: null, lastSyncAt: new Date().toISOString() });
  } catch (e) {
    // someone pushed in between: pull again and merge on top
    if (e instanceof GitHubError && e.status === 409 && attempt < 3) return cycle(vacationId, attempt + 1);
    throw e;
  }
}

function applyMerged(vacationId: string, merged: SharedData, from: string | null) {
  const before = new Set(useStore.getState().friends.map((f) => f.id));
  const winterInfo = (() => {
    const s = useStore.getState();
    const v = s.vacations.find((x) => x.id === vacationId);
    const w = s.winters.find((x) => x.id === v?.winterId)!;
    return { year: w.year, start: w.start, end: w.end };
  })();
  applying = true;
  try {
    useStore.setState((s) => applyShared(s, winterInfo, merged));
  } finally {
    applying = false;
  }
  queueMatches(vacationId, merged.friends.filter((f) => !before.has(f.id)).map((f) => f.id), from);
}

/** New friends from the partner: ask "Who's who?" when the name looks like one of yours. */
function queueMatches(vacationId: string, newIds: string[], from: string | null) {
  if (!newIds.length) return;
  const s = useStore.getState();
  const collab = useCollab.getState();
  const sharedFriendIds = new Set(Object.values(collab.shared).flatMap((e) => e.base.friends.map((f) => f.id)));
  const pending = [];
  for (const id of newIds) {
    const f = s.friends.find((x) => x.id === id)!;
    const match = similarFriend(s.friends, f.name, new Set([...sharedFriendIds, ...newIds]));
    if (match) pending.push({ vacationId, friendId: id, localId: match.id });
    else collab.addNotice(vacationId, `${from ?? 'Your partner'} added ${f.name || 'a friend'} to “${vacationName(vacationId)}”.`);
  }
  if (pending.length) collab.addPending(pending);
}

const show = (v: unknown) => (v === undefined ? 'nothing' : typeof v === 'object' ? 'their version' : JSON.stringify(v));
function reportConflicts(vacationId: string, conflicts: Conflict[], partner: string) {
  const collab = useCollab.getState();
  for (const c of conflicts.slice(0, 5)) {
    const where = c.path.filter((p) => !/^(data|trips|friends|participants)$/.test(p)).join(' › ');
    collab.addNotice(
      vacationId,
      c.kind === 'kept-deleted'
        ? `${where}: one of you deleted it while the other edited it, so it was kept.`
        : `You and ${partner} both changed ${where}. Kept ${show(c.kept)}, replaced ${show(c.replaced)}.`,
    );
  }
  if (conflicts.length > 5) collab.addNotice(vacationId, `…and ${conflicts.length - 5} more overlapping edits.`);
}

function commitMessage(base: SharedData, next: SharedData): string {
  const parts: string[] = [];
  const count = (a: { id: string }[], b: { id: string }[]) => b.filter((x) => !a.some((y) => y.id === x.id)).length;
  const newTrips = count(base.trips, next.trips);
  if (newTrips) parts.push(`${newTrips} new trip${newTrips > 1 ? 's' : ''}`);
  for (const t of next.trips) {
    const old = base.trips.find((x) => x.id === t.id);
    if (old && !deepEqual(old, t)) parts.push(t.name);
  }
  if (!deepEqual(base.vacation, next.vacation)) parts.push('vacation details');
  if (!deepEqual(base.friends, next.friends) || !deepEqual(base.participants, next.participants)) parts.push('friends');
  return `${me()}: ${next.vacation.name}${parts.length ? ` (${[...new Set(parts)].slice(0, 4).join(', ')})` : ''}`;
}

// ---------------------------------------------------------------- triggers

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const syncAll = () => Object.keys(useCollab.getState().shared).forEach((id) => void syncNow(id));
let started = false;

export function startSync() {
  if (started) return;
  started = true;
  useStore.subscribe(() => {
    if (applying) return;
    const { shared } = useCollab.getState();
    for (const [id, entry] of Object.entries(shared)) {
      const l = localShared(id);
      if (!l || deepEqual(l.data, entry.base)) continue;
      clearTimeout(timers.get(id));
      timers.set(id, setTimeout(() => void syncNow(id), PUSH_DELAY_MS));
    }
    refreshStatus();
  });
  useCollab.subscribe((s, prev) => {
    if (s.repo !== prev.repo || s.token !== prev.token || Object.keys(s.shared).length !== Object.keys(prev.shared).length) refreshStatus();
  });
  window.addEventListener('focus', syncAll);
  window.addEventListener('online', syncAll);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncAll());
  setInterval(() => document.visibilityState === 'visible' && syncAll(), POLL_MS);
  refreshStatus();
  syncAll();
}

// ---------------------------------------------------------------- actions for the UI

export interface RemoteVacation {
  path: string;
  vacationId: string;
  name: string;
  winterYear: number;
  dates: SharedData['vacation']['dates'];
  updatedBy: string;
  updatedAt: string;
  people: number;
}

export async function listRemote(): Promise<RemoteVacation[]> {
  const paths = await listJson(conn(), 'vacations');
  const out: RemoteVacation[] = [];
  for (const path of paths) {
    const got = await getJson<SharedVacationFile>(conn(), path);
    if (!('content' in got)) continue;
    const f = got.content;
    out.push({ path, vacationId: f.data.vacation.id, name: f.data.vacation.name, winterYear: f.winter.year, dates: f.data.vacation.dates, updatedBy: f.updatedBy, updatedAt: f.updatedAt, people: f.data.friends.length });
  }
  return out;
}

export async function shareVacation(vacationId: string): Promise<void> {
  const local = localShared(vacationId);
  if (!local) throw new Error('Vacation not found');
  const res = await putJson(conn(), filePath(vacationId), makeFile(local.winter, local.data, me()), `${me()} shared “${local.data.vacation.name}”`);
  useCollab.getState().setShared(vacationId, { sha: res.sha, etag: null, base: local.data, lastSyncAt: new Date().toISOString() });
  refreshStatus();
}

/** Imports a vacation the partner shared. Returns its id and winter id. */
export async function joinVacation(path: string): Promise<{ vacationId: string; winterId: string }> {
  const got = await getJson<SharedVacationFile>(conn(), path);
  if (!('content' in got)) throw new Error('That vacation is no longer on GitHub.');
  if (got.content.appVersion > CURRENT_VERSION) throw new Error(`${got.content.updatedBy} is on a newer SomeGoodSki. Update yours first.`);
  const data = canonical(upgrade(got.content));
  const vacationId = data.vacation.id;
  const before = new Set(useStore.getState().friends.map((f) => f.id));
  applying = true;
  try {
    useStore.setState((s) => applyShared(s, got.content.winter, data));
  } finally {
    applying = false;
  }
  const final = localShared(vacationId)!;
  useCollab.getState().setShared(vacationId, { sha: got.sha, etag: got.etag, base: final.data, lastSyncAt: new Date().toISOString() });
  queueMatches(vacationId, data.friends.filter((f) => !before.has(f.id)).map((f) => f.id), got.content.updatedBy);
  refreshStatus();
  return { vacationId, winterId: useStore.getState().vacations.find((v) => v.id === vacationId)!.winterId };
}

/** Stops syncing a vacation; with `deleteForBoth` its file is removed from GitHub too. */
export async function stopSharing(vacationId: string, deleteForBoth: boolean): Promise<void> {
  if (deleteForBoth) {
    const got = await getJson<SharedVacationFile>(conn(), filePath(vacationId));
    if ('content' in got) await deleteFile(conn(), filePath(vacationId), got.sha, `${me()} deleted “${got.content.data.vacation.name}”`);
  }
  clearTimeout(timers.get(vacationId));
  useCollab.getState().setShared(vacationId, null);
  refreshStatus();
}

/** "Same person": merge your friend into the shared one, with the chosen profile. */
export function linkFriends(localId: string, sharedId: string, profile: AppData['friends'][number]) {
  useStore.setState((s) => linkFriend(s, localId, sharedId, profile));
  useCollab.getState().resolvePending(sharedId);
}

/** Splits a shared friend from yours. */
export function unlinkFriendEverywhere(sharedId: string) {
  const shared = Object.keys(useCollab.getState().shared);
  useStore.setState((s) => unlinkFriend(s, sharedId, shared).data);
}

/** Friend ids that are part of a shared vacation (🔗 on the People page). */
export function useSharedFriendIds(): Set<string> {
  const shared = useCollab((c) => c.shared);
  const vacations = useStore((s) => s.vacations);
  return useMemo(() => new Set(vacations.filter((v) => shared[v.id]).flatMap((v) => v.attendeeIds)), [shared, vacations]);
}
