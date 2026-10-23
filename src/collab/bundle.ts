import { CURRENT_VERSION } from '../store/migrate';
import { uid } from '../lib/util';
import type { Airport, AppData, Friend, ISODate, Resort, Trip, Vacation, Winter, WinterParticipant } from '../types';

/** What two planners share about one vacation. Everything is matched by id. */
export interface SharedData {
  vacation: Vacation; // winterId is '' here: each planner files it under their own winter of the same year
  trips: Trip[];
  friends: Friend[]; // the attendees' profiles
  participants: WinterParticipant[]; // the attendees' availability and budget for that winter
  resorts: Resort[]; // custom resorts the trips use (indexed ones are built into the app)
  airports: Airport[]; // catalog entries for those resorts' airports
}

/** The file in the repo: vacations/<vacationId>.json */
export interface SharedVacationFile {
  format: 1;
  appVersion: number;
  updatedBy: string;
  updatedAt: string;
  winter: { year: number; start: ISODate; end: ISODate };
  data: SharedData;
}

type Collections = Pick<AppData, 'friends' | 'winters' | 'vacations' | 'trips' | 'resorts' | 'airports'>;

export const filePath = (vacationId: string) => `vacations/${vacationId}.json`;

/** The shared part of a vacation, built from local data (null if the vacation is gone). */
export function extractShared(d: Collections, vacationId: string): { winter: Winter; data: SharedData } | null {
  const vacation = d.vacations.find((v) => v.id === vacationId);
  const winter = vacation && d.winters.find((w) => w.id === vacation.winterId);
  if (!vacation || !winter) return null;
  const attendees = new Set(vacation.attendeeIds);
  const trips = d.trips.filter((t) => t.vacationId === vacationId);
  const resortIds = new Set(trips.map((t) => t.resortId));
  const resorts = d.resorts.filter((r) => resortIds.has(r.id) && !r.indexSlug);
  const iatas = new Set(resorts.flatMap((r) => r.airports.map((a) => a.iata)));
  return {
    winter,
    data: {
      vacation: { ...vacation, winterId: '' },
      trips,
      friends: d.friends.filter((f) => attendees.has(f.id)),
      participants: winter.participants.filter((p) => attendees.has(p.friendId)),
      resorts,
      airports: d.airports.filter((a) => iatas.has(a.iata)),
    },
  };
}

export function makeFile(winter: Winter, data: SharedData, updatedBy: string): SharedVacationFile {
  return {
    format: 1,
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
 * Writes shared data into local data: the vacation goes into the local winter of the same year
 * (created if missing), its trips are replaced, and profiles, availability, resorts and airports
 * are upserted. Profiles of people dropped from the vacation stay in the roster.
 */
export function applyShared<D extends Collections>(d: D, winterInfo: SharedVacationFile['winter'], data: SharedData): D {
  const existingVacation = d.vacations.find((v) => v.id === data.vacation.id);
  let winter =
    d.winters.find((w) => w.id === existingVacation?.winterId) ?? d.winters.find((w) => w.year === winterInfo.year);
  const winters = winter ? d.winters : [...d.winters, (winter = { id: uid(), ...winterInfo, participants: [], createdAt: new Date().toISOString() })];
  const winterId = winter.id;
  const vacation = { ...data.vacation, winterId };
  return {
    ...d,
    friends: upsert(d.friends, data.friends, (f) => f.id),
    winters: winters.map((w) => (w.id === winterId ? { ...w, participants: upsert(w.participants, data.participants, (p) => p.friendId) } : w)),
    vacations: upsert(d.vacations, [vacation], (v) => v.id),
    trips: [...d.trips.filter((t) => t.vacationId !== vacation.id), ...data.trips],
    resorts: upsert(d.resorts, data.resorts, (r) => r.id),
    airports: upsert(d.airports, data.airports, (a) => a.iata),
  };
}
