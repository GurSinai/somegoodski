import { CURRENT_VERSION } from '../store/migrate';
import { uid } from '../lib/util';
import type { Airport, AppData, ISODate, Resort, Trip, Vacation, VacationGuest, Winter } from '../types';

/** Someone going on a shared vacation, tagged with the collaborator who added them. */
export type SharedPerson = VacationGuest;

/** Who is syncing: the current planner id plus any earlier ones (e.g. before signing in). */
export interface Me {
  id: string;
  name: string;
  ids: string[];
}

/** What collaborators share about one vacation. Everything is matched by id. */
export interface SharedData {
  vacation: Omit<Vacation, 'guests'>; // winterId is '': each planner files it under their own winter of the same year
  people: SharedPerson[]; // everyone going, each with the collaborator who added them
  trips: Trip[];
  resorts: Resort[]; // custom resorts the trips use (indexed ones are built into the app)
  airports: Airport[]; // catalog entries for those resorts' airports
}

/** A shared vacation as stored in Firebase or exchanged as a file. */
export interface SharedVacationFile {
  format: 2;
  appVersion: number;
  updatedBy: string;
  updatedAt: string;
  winter: { year: number; start: ISODate; end: ISODate };
  data: SharedData;
}

type Collections = Pick<AppData, 'friends' | 'winters' | 'vacations' | 'trips' | 'resorts' | 'airports'>;

/**
 * The shared part of a vacation, built from local data (null if the vacation is gone).
 * `known` is the last agreed version: people already in it keep their "added by" tag, so two of
 * your devices with different display names (or ids) don't keep relabelling each other's saves.
 */
export function extractShared(d: Collections, vacationId: string, me: Me, known?: SharedData): { winter: Winter; data: SharedData } | null {
  const vacation = d.vacations.find((v) => v.id === vacationId);
  const winter = vacation && d.winters.find((w) => w.id === vacation.winterId);
  if (!vacation || !winter) return null;
  const guestIds = new Set(vacation.guests.map((g) => g.id));
  const mine: SharedPerson[] = vacation.attendeeIds.flatMap((id) => {
    if (guestIds.has(id)) return [];
    const f = d.friends.find((x) => x.id === id);
    const p = winter.participants.find((x) => x.friendId === id);
    if (!f || !p) return [];
    const { id: _id, ...profile } = f;
    const prev = known?.people.find((x) => x.id === id && me.ids.includes(x.addedBy));
    const tag = prev ? { addedBy: prev.addedBy, addedByName: prev.addedByName } : { addedBy: me.id, addedByName: me.name };
    return [{ id, profile, availability: p.availability, budget: p.budget, budgetCurrency: p.budgetCurrency, ...tag }];
  });
  const trips = d.trips.filter((t) => t.vacationId === vacationId);
  const resortIds = new Set(trips.map((t) => t.resortId));
  const resorts = d.resorts.filter((r) => resortIds.has(r.id) && !r.indexSlug);
  const iatas = new Set(resorts.flatMap((r) => r.airports.map((a) => a.iata)));
  const { guests, ...rest } = vacation;
  return {
    winter,
    data: {
      vacation: { ...rest, winterId: '' },
      people: [...mine, ...guests],
      trips,
      resorts,
      airports: d.airports.filter((a) => iatas.has(a.iata)),
    },
  };
}

export function makeFile(winter: Winter, data: SharedData, updatedBy: string): SharedVacationFile {
  return {
    format: 2,
    appVersion: CURRENT_VERSION,
    updatedBy,
    updatedAt: new Date().toISOString(),
    winter: { year: winter.year, start: winter.start, end: winter.end },
    data,
  };
}

const upsert = <T,>(list: T[], items: T[], key: (t: T) => string) => {
  const incoming = new Map(items.map((i) => [key(i), i]));
  const kept = list.map((x) => incoming.get(key(x)) ?? x);
  const known = new Set(list.map(key));
  return [...kept, ...items.filter((i) => !known.has(key(i)))];
};

/**
 * Writes shared data into local data. The vacation goes into the local winter of the same year
 * (created if missing) and its trips are replaced. People you added go back into your roster and
 * that winter (so a collaborator's edits reach your friends); everyone else becomes a guest of
 * the vacation. Your roster never loses anyone.
 */
export function applyShared<D extends Collections>(d: D, winterInfo: SharedVacationFile['winter'], data: SharedData, me: Me): D {
  const existing = d.vacations.find((v) => v.id === data.vacation.id);
  let winter = d.winters.find((w) => w.id === existing?.winterId) ?? d.winters.find((w) => w.year === winterInfo.year);
  const winters = winter ? d.winters : [...d.winters, (winter = { id: uid(), ...winterInfo, participants: [], createdAt: new Date().toISOString() })];
  const winterId = winter.id;
  const isMine = (p: SharedPerson) => me.ids.includes(p.addedBy);
  const mine = data.people.filter(isMine);
  const vacation: Vacation = { ...data.vacation, winterId, guests: data.people.filter((p) => !isMine(p)) };
  return {
    ...d,
    friends: upsert(d.friends, mine.map((p) => ({ ...p.profile, id: p.id })), (f) => f.id),
    winters: winters.map((w) =>
      w.id === winterId
        ? { ...w, participants: upsert(w.participants, mine.map((p) => ({ friendId: p.id, availability: p.availability, budget: p.budget, budgetCurrency: p.budgetCurrency })), (p) => p.friendId) }
        : w,
    ),
    vacations: upsert(d.vacations, [vacation], (v) => v.id),
    trips: [...d.trips.filter((t) => t.vacationId !== vacation.id), ...data.trips],
    resorts: upsert(d.resorts, data.resorts, (r) => r.id),
    airports: upsert(d.airports, data.airports, (a) => a.iata),
  };
}
