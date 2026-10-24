import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../lib/util';
import type { SharedData } from './bundle';

/** Sync state of one shared vacation. `base` is the last version both planners agreed on. */
export interface SharedEntry {
  version: number;
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

export interface CollabUser {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

interface CollabState {
  displayName: string;
  plannerId: string; // tags the people you add: your Firebase uid once signed in, a local id before
  myIds: string[]; // every planner id you've used, so older tags still count as yours
  shared: Record<string, SharedEntry>;
  fileBases: Record<string, SharedData>; // last vacation file exchanged by hand, for merging the next one
  signedInBefore: boolean; // load Firebase at startup only for people who use it
  notices: Notice[];
  unread: number;
  // not persisted
  user: CollabUser | null;
  authReady: boolean;
  status: SyncStatus;
  error: string | null;
  waiting: number; // shared vacations with local changes not yet saved
  drawerOpen: boolean;

  setDisplayName: (name: string) => void;
  setUser: (user: CollabUser | null) => void;
  setShared: (vacationId: string, entry: SharedEntry | null) => void;
  patchShared: (vacationId: string, patch: Partial<SharedEntry>) => void;
  setFileBase: (vacationId: string, data: SharedData) => void;
  addNotice: (vacationId: string, text: string) => void;
  markRead: () => void;
  setStatus: (status: SyncStatus, error?: string | null, waiting?: number) => void;
  setDrawerOpen: (open: boolean) => void;
}

const localId = `local-${uid()}`;

export const useCollab = create<CollabState>()(
  persist(
    (set) => ({
      displayName: '',
      plannerId: localId,
      myIds: [localId],
      shared: {},
      fileBases: {},
      signedInBefore: false,
      notices: [],
      unread: 0,
      user: null,
      authReady: false,
      status: 'off',
      error: null,
      waiting: 0,
      drawerOpen: false,

      setDisplayName: (displayName) => set({ displayName }),
      setUser: (user) =>
        set((s) => ({
          user,
          authReady: true,
          signedInBefore: Boolean(user),
          // signing in makes the Firebase uid your planner id; earlier ids stay yours
          ...(user && user.uid !== s.plannerId ? { plannerId: user.uid, myIds: [...new Set([...s.myIds, user.uid])] } : {}),
          displayName: s.displayName || user?.name.split(' ')[0] || '',
        })),
      setShared: (vacationId, entry) =>
        set((s) => {
          const shared = { ...s.shared };
          if (entry) shared[vacationId] = entry;
          else delete shared[vacationId];
          return { shared };
        }),
      patchShared: (vacationId, patch) =>
        set((s) => (s.shared[vacationId] ? { shared: { ...s.shared, [vacationId]: { ...s.shared[vacationId], ...patch } } } : {})),
      setFileBase: (vacationId, data) => set((s) => ({ fileBases: { ...s.fileBases, [vacationId]: data } })),
      addNotice: (vacationId, text) =>
        set((s) => ({ notices: [{ id: uid(), at: new Date().toISOString(), vacationId, text }, ...s.notices].slice(0, 40), unread: s.unread + 1 })),
      markRead: () => set({ unread: 0 }),
      setStatus: (status, error = null, waiting) => set((s) => ({ status, error, waiting: waiting ?? s.waiting })),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
    }),
    {
      name: 'ski-planner-collab',
      version: 1,
      // version 0 was the GitHub-based sync: its shared entries can't carry over
      migrate: (old: any, version) => (version < 1 ? { displayName: old?.displayName ?? '', notices: [], unread: 0, shared: {}, fileBases: {} } : old),
      partialize: ({ displayName, plannerId, myIds, shared, fileBases, signedInBefore, notices, unread }) => ({ displayName, plannerId, myIds, shared, fileBases, signedInBefore, notices, unread }),
    },
  ),
);

/** Who is syncing, for tagging and recognising the people you add. */
export const currentMe = () => {
  const s = useCollab.getState();
  // the Firestore rules cap display names at 80 characters
  return { id: s.plannerId, name: (s.displayName.trim() || s.user?.name || 'A planner').slice(0, 60), ids: s.myIds };
};
