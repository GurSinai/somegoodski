import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/util';
import type { SharedData, SharedVacationFile } from './bundle';

/** Sync state of one shared vacation. `base` is the last version both planners agreed on. */
export interface SharedEntry {
  sha: string;
  etag: string | null;
  base: SharedData;
  lastSyncAt: string;
  paused?: string; // why syncing stopped, e.g. the partner runs a newer app
}

export interface Notice {
  id: string;
  at: string;
  vacationId: string;
  text: string;
}

/** A friend who arrived from the partner and looks like one of yours: "Who's who?" */
export interface PendingMatch {
  vacationId: string;
  friendId: string; // the shared friend
  localId: string; // your friend with a similar name
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

interface CollabState {
  repo: string;
  token: string;
  displayName: string;
  shared: Record<string, SharedEntry>;
  pendingMatches: PendingMatch[];
  notices: Notice[];
  unread: number;
  // not persisted
  status: SyncStatus;
  error: string | null;
  waiting: number; // vacations with local changes not yet on GitHub
  drawerOpen: boolean;

  setConnection: (patch: Partial<Pick<CollabState, 'repo' | 'token' | 'displayName'>>) => void;
  setShared: (vacationId: string, entry: SharedEntry | null) => void;
  patchShared: (vacationId: string, patch: Partial<SharedEntry>) => void;
  addNotice: (vacationId: string, text: string) => void;
  markRead: () => void;
  addPending: (m: PendingMatch[]) => void;
  resolvePending: (friendId: string) => void;
  setStatus: (status: SyncStatus, error?: string | null, waiting?: number) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useCollab = create<CollabState>()(
  persist(
    (set) => ({
      repo: '',
      token: '',
      displayName: '',
      shared: {},
      pendingMatches: [],
      notices: [],
      unread: 0,
      status: 'off',
      error: null,
      waiting: 0,
      drawerOpen: false,

      setConnection: (patch) => set(patch),
      setShared: (vacationId, entry) =>
        set((s) => {
          const shared = { ...s.shared };
          if (entry) shared[vacationId] = entry;
          else delete shared[vacationId];
          return { shared, pendingMatches: entry ? s.pendingMatches : s.pendingMatches.filter((m) => m.vacationId !== vacationId) };
        }),
      patchShared: (vacationId, patch) =>
        set((s) => (s.shared[vacationId] ? { shared: { ...s.shared, [vacationId]: { ...s.shared[vacationId], ...patch } } } : {})),
      addNotice: (vacationId, text) =>
        set((s) => ({ notices: [{ id: uid(), at: new Date().toISOString(), vacationId, text }, ...s.notices].slice(0, 40), unread: s.unread + 1 })),
      markRead: () => set({ unread: 0 }),
      addPending: (m) =>
        set((s) => ({ pendingMatches: [...s.pendingMatches, ...m.filter((x) => !s.pendingMatches.some((p) => p.friendId === x.friendId))] })),
      resolvePending: (friendId) => set((s) => ({ pendingMatches: s.pendingMatches.filter((m) => m.friendId !== friendId) })),
      setStatus: (status, error = null, waiting) => set((s) => ({ status, error, waiting: waiting ?? s.waiting })),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      // kept apart from the planner data so exports never contain the token
      name: 'ski-planner-collab',
      partialize: ({ repo, token, displayName, shared, pendingMatches, notices, unread }) => ({ repo, token, displayName, shared, pendingMatches, notices, unread }),
    },
  ),
);

export const isConnected = (s: Pick<CollabState, 'repo' | 'token'>) => Boolean(s.repo && s.token);
export type { SharedVacationFile };
