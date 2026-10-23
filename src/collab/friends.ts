import { uid } from '../lib/util';
import type { AppData, Friend, Trip, Vacation, WinterParticipant } from '../types';

type Collections = Pick<AppData, 'friends' | 'winters' | 'vacations' | 'trips'>;

const swap = (ids: string[], from: string, to: string) => [...new Set(ids.map((x) => (x === from ? to : x)))];
const swapKey = <V,>(rec: Record<string, V>, from: string, to: string): Record<string, V> => {
  if (!(from in rec)) return rec;
  const { [from]: v, ...rest } = rec;
  return { ...rest, [to]: rest[to] ?? v };
};

const reIdVacation = (v: Vacation, from: string, to: string): Vacation => ({
  ...v,
  attendeeIds: swap(v.attendeeIds, from, to),
  luggage: v.luggage.map((l) => ({ ...l, friendIds: swap(l.friendIds, from, to) })),
});

const reIdTrip = (t: Trip, from: string, to: string): Trip => ({
  ...t,
  flightChoice: swapKey(t.flightChoice, from, to),
  passChoice: swapKey(t.passChoice, from, to),
  shopChoice: swapKey(t.shopChoice, from, to),
  shops: t.shops.map((s) => ({ ...s, lessons: s.lessons.map((l) => ({ ...l, friendIds: swap(l.friendIds, from, to) })) })),
  expenses: t.expenses.map((e) => ({ ...e, friendIds: e.friendIds && swap(e.friendIds, from, to) })),
});

/**
 * Rewrites a friend id everywhere it is referenced. `inScope` limits which vacations
 * (and their trips) are rewritten; winters are rewritten only when no scope is given.
 */
export function reIdFriend<D extends Collections>(d: D, from: string, to: string, inScope?: (vacationId: string) => boolean): D {
  const ok = (vacationId: string) => !inScope || inScope(vacationId);
  return {
    ...d,
    friends: inScope ? d.friends : d.friends.map((f) => (f.id === from ? { ...f, id: to } : f)),
    winters: inScope ? d.winters : d.winters.map((w) => ({ ...w, participants: w.participants.map((p) => (p.friendId === from ? { ...p, friendId: to } : p)) })),
    vacations: d.vacations.map((v) => (ok(v.id) ? reIdVacation(v, from, to) : v)),
    trips: d.trips.map((t) => (ok(t.vacationId) ? reIdTrip(t, from, to) : t)),
  };
}

/** The profile fields a planner picks between when linking two friends. */
export const PROFILE_FIELDS = ['name', 'color', 'skillLevel', 'sport', 'gear', 'lessons', 'defaultBudget', 'defaultBudgetCurrency', 'notes'] as const;

/**
 * "Same person": the local friend takes the shared id and the chosen profile. Availability for a
 * winter both appear in is combined; otherwise each winter keeps whichever entry it has.
 */
export function linkFriend<D extends Collections>(d: D, localId: string, sharedId: string, profile: Friend): D {
  const sharedEntries = new Map<string, WinterParticipant>();
  for (const w of d.winters) {
    const p = w.participants.find((x) => x.friendId === sharedId);
    if (p) sharedEntries.set(w.id, p);
  }
  const cleared: D = {
    ...d,
    friends: d.friends.filter((f) => f.id !== sharedId),
    winters: d.winters.map((w) => ({ ...w, participants: w.participants.filter((p) => p.friendId !== sharedId) })),
  };
  const moved = reIdFriend(cleared, localId, sharedId);
  return {
    ...moved,
    friends: moved.friends.map((f) => (f.id === sharedId ? { ...profile, id: sharedId } : f)),
    winters: moved.winters.map((w) => {
      const theirs = sharedEntries.get(w.id);
      if (!theirs) return w;
      const mine = w.participants.find((p) => p.friendId === sharedId);
      if (!mine) return { ...w, participants: [...w.participants, theirs] };
      const availability = [...new Set([...mine.availability, ...theirs.availability])].sort();
      return { ...w, participants: w.participants.map((p) => (p.friendId === sharedId ? { ...p, availability } : p)) };
    }),
  };
}

/**
 * Splits a linked friend: the shared one stays in the shared vacations, and a copy with a new id
 * replaces it everywhere else. Returns the data and the copy's id.
 */
export function unlinkFriend<D extends Collections>(d: D, sharedId: string, sharedVacationIds: string[]): { data: D; id: string } {
  const shared = new Set(sharedVacationIds);
  const friend = d.friends.find((f) => f.id === sharedId);
  if (!friend) return { data: d, id: sharedId };
  const id = uid();
  const sharedWinters = new Set(d.vacations.filter((v) => shared.has(v.id) && v.attendeeIds.includes(sharedId)).map((v) => v.winterId));
  const rewritten = reIdFriend(d, sharedId, id, (vacationId) => !shared.has(vacationId));
  return {
    id,
    data: {
      ...rewritten,
      friends: [...rewritten.friends, { ...friend, id }],
      winters: rewritten.winters.map((w) => {
        const p = w.participants.find((x) => x.friendId === sharedId);
        if (!p) return w;
        // winters with a shared vacation keep the shared friend too; elsewhere the copy takes over
        return sharedWinters.has(w.id)
          ? { ...w, participants: [...w.participants, { ...p, friendId: id }] }
          : { ...w, participants: w.participants.map((x) => (x.friendId === sharedId ? { ...x, friendId: id } : x)) };
      }),
    },
  };
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, '').trim();

/** A local friend whose name looks like `name` (same first word), if any. */
export function similarFriend(friends: Friend[], name: string, exceptIds: Set<string>): Friend | undefined {
  const first = norm(name).split(/\s+/)[0];
  if (!first) return undefined;
  return friends.find((f) => !exceptIds.has(f.id) && norm(f.name).split(/\s+/)[0] === first);
}
