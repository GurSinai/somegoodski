/**
 * Firebase: Google sign-in, shared vacations in Firestore, invite links.
 * The SDK is loaded on demand so the app stays light for people who never collaborate.
 *
 * Firestore layout (see /firestore.rules):
 *   vacations/{vacationId}               { json, version, members[], names{}, updatedBy, updatedAt, joinCode? }
 *   vacations/{vacationId}/invites/{code} { vacationName, winterYear, fromName, createdBy, createdAt, expiresAt }
 */
import type { SharedVacationFile } from './bundle';
import { ConflictError, setBackend, type Backend } from './engine';
import { appCheckSiteKey, firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import { currentMe, useCollab } from './useCollab';

type Sdk = {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  fa: typeof import('firebase/auth');
  fs: typeof import('firebase/firestore');
};

const INVITE_DAYS = 14;
let sdk: Promise<Sdk> | null = null;

/** Loads Firebase once and starts following the signed-in user. */
export function loadFirebase(): Promise<Sdk> {
  if (!isFirebaseConfigured) return Promise.reject(new Error('Collaboration isn’t set up yet (missing Firebase config).'));
  sdk ??= (async () => {
    const [{ initializeApp }, fa, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(firebaseConfig);
    // App Check first: every Firestore and Auth request then carries proof it came from this site
    if (appCheckSiteKey) {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    }
    const auth = fa.getAuth(app);
    const db = fs.getFirestore(app);
    const loaded = { auth, db, fa, fs };
    fa.onAuthStateChanged(auth, (u) => {
      useCollab.getState().setUser(u ? { uid: u.uid, name: u.displayName ?? u.email ?? 'Planner', email: u.email ?? '', photo: u.photoURL } : null);
      setBackend(u ? firestoreBackend(loaded) : null);
    });
    return loaded;
  })();
  return sdk;
}

/** Loads Firebase at startup only if this person has collaborated before. */
export function initCollab() {
  const c = useCollab.getState();
  if (isFirebaseConfigured && (c.signedInBefore || Object.keys(c.shared).length)) void loadFirebase().catch((e) => console.warn('[firebase]', e));
  else useCollab.setState({ authReady: true });
}

export async function signIn(): Promise<void> {
  const { auth, fa } = await loadFirebase();
  const provider = new fa.GoogleAuthProvider();
  try {
    await fa.signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return fa.signInWithRedirect(auth, provider);
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (code === 'auth/unauthorized-domain') throw new Error(`This site (${location.hostname}) isn’t an authorized domain in Firebase Authentication yet.`);
    throw e;
  }
}

export async function signOut(): Promise<void> {
  const { auth, fa } = await loadFirebase();
  await fa.signOut(auth);
}

const uidOrThrow = (s: Sdk) => {
  const u = s.auth.currentUser;
  if (!u) throw new Error('Sign in first');
  return u.uid;
};
const isDenied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';

// mirrors the size cap in firestore.rules
const MAX_JSON = 290_000;
const serialize = (file: SharedVacationFile) => {
  const json = JSON.stringify(file);
  if (json.length > MAX_JSON) throw new Error('This vacation is too big to share (over 290 KB). Remove some notes or links and try again.');
  return json;
};

function firestoreBackend(s: Sdk): Backend {
  const { db, fs } = s;
  const ref = (vid: string) => fs.doc(db, 'vacations', vid);
  return {
    async get(vid) {
      try {
        const snap = await fs.getDoc(ref(vid));
        if (!snap.exists()) return null;
        const d = snap.data();
        return { file: JSON.parse(d.json) as SharedVacationFile, version: d.version as number };
      } catch (e) {
        if (isDenied(e)) return null; // deleted, or you were removed from it
        throw e;
      }
    },
    async save(vid, file, expectedVersion) {
      const uid = uidOrThrow(s);
      return fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref(vid));
        if (!snap.exists()) throw new Error('This vacation was deleted for everyone.');
        if (snap.data().version !== expectedVersion) throw new ConflictError();
        tx.update(ref(vid), {
          json: serialize(file),
          version: expectedVersion + 1,
          updatedBy: file.updatedBy,
          updatedAt: fs.serverTimestamp(),
          [`names.${uid}`]: file.updatedBy,
        });
        return expectedVersion + 1;
      });
    },
    async create(vid, file) {
      const uid = uidOrThrow(s);
      await fs.setDoc(ref(vid), { json: serialize(file), version: 1, members: [uid], names: { [uid]: file.updatedBy }, updatedBy: file.updatedBy, updatedAt: fs.serverTimestamp() });
    },
    async remove(vid) {
      await fs.deleteDoc(ref(vid));
    },
    watch(vid, onChange) {
      return fs.onSnapshot(ref(vid), () => onChange(), (e) => {
        if (!isDenied(e)) console.warn('[firebase] watch', e);
        onChange(); // let the sync cycle notice it's gone
      });
    },
  };
}

// ---------------------------------------------------------------- invites & members

export interface Invite {
  code: string;
  link: string;
  expiresAt: Date;
}

const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return Array.from(bytes, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
};
export const inviteLink = (vacationId: string, code: string) => `${location.origin}${location.pathname}#/join/${vacationId}/${code}`;

export async function createInvite(vacationId: string, vacationName: string, winterYear: number): Promise<Invite> {
  const s = await loadFirebase();
  const uid = uidOrThrow(s);
  const code = randomCode();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  await s.fs.setDoc(s.fs.doc(s.db, 'vacations', vacationId, 'invites', code), {
    vacationName, winterYear, fromName: currentMe().name, createdBy: uid, createdAt: s.fs.serverTimestamp(), expiresAt: s.fs.Timestamp.fromDate(expiresAt),
  });
  return { code, link: inviteLink(vacationId, code), expiresAt };
}

export async function listInvites(vacationId: string): Promise<Invite[]> {
  const s = await loadFirebase();
  const snap = await s.fs.getDocs(s.fs.collection(s.db, 'vacations', vacationId, 'invites'));
  return snap.docs
    .map((d) => ({ code: d.id, link: inviteLink(vacationId, d.id), expiresAt: (d.data().expiresAt as import('firebase/firestore').Timestamp).toDate() }))
    .filter((i) => i.expiresAt > new Date());
}

export async function revokeInvite(vacationId: string, code: string): Promise<void> {
  const s = await loadFirebase();
  await s.fs.deleteDoc(s.fs.doc(s.db, 'vacations', vacationId, 'invites', code));
}

export interface InvitePreview {
  vacationName: string;
  winterYear: number;
  fromName: string;
  expired: boolean;
}

export async function readInvite(vacationId: string, code: string): Promise<InvitePreview | null> {
  const s = await loadFirebase();
  const snap = await s.fs.getDoc(s.fs.doc(s.db, 'vacations', vacationId, 'invites', code));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { vacationName: d.vacationName, winterYear: d.winterYear, fromName: d.fromName, expired: (d.expiresAt as import('firebase/firestore').Timestamp).toMillis() < Date.now() };
}

/** Adds you to a shared vacation with an invite code (a no-op if you're already a member). */
export async function joinWithInvite(vacationId: string, code: string): Promise<void> {
  const s = await loadFirebase();
  const uid = uidOrThrow(s);
  try {
    await s.fs.getDoc(s.fs.doc(s.db, 'vacations', vacationId)); // readable = already a member
    return;
  } catch (e) {
    if (!isDenied(e)) throw e;
  }
  await s.fs.updateDoc(s.fs.doc(s.db, 'vacations', vacationId), {
    members: s.fs.arrayUnion(uid),
    [`names.${uid}`]: currentMe().name,
    joinCode: code,
  });
}

export interface Membership {
  vacationId: string;
  name: string;
  winterYear: number;
  updatedBy: string;
  members: { uid: string; name: string }[];
}

const membershipOf = (id: string, d: import('firebase/firestore').DocumentData): Membership => {
  const file = JSON.parse(d.json) as SharedVacationFile;
  const names = (d.names ?? {}) as Record<string, string>;
  return { vacationId: id, name: file.data.vacation.name, winterYear: file.winter.year, updatedBy: d.updatedBy, members: (d.members as string[]).map((uid) => ({ uid, name: names[uid] ?? 'Planner' })) };
};

/** Shared vacations you're a member of (to open them on another device). */
export async function myMemberships(): Promise<Membership[]> {
  const s = await loadFirebase();
  const uid = uidOrThrow(s);
  const snap = await s.fs.getDocs(s.fs.query(s.fs.collection(s.db, 'vacations'), s.fs.where('members', 'array-contains', uid)));
  return snap.docs.map((d) => membershipOf(d.id, d.data()));
}

export async function removeMember(vacationId: string, memberUid: string): Promise<void> {
  const s = await loadFirebase();
  await s.fs.updateDoc(s.fs.doc(s.db, 'vacations', vacationId), { members: s.fs.arrayRemove(memberUid) });
}
