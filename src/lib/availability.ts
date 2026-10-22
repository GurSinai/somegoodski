import type { DateRange, ISODate } from '../types';
import { addDaysISO, daysBetween } from './dates';

/** Anyone with availability: a WinterFriend, or a bare participant. */
type Available = { id: string; availability: ISODate[] };

/** Map of date -> ids of friends free that day. */
export function availabilityByDay(friends: Available[]): Map<ISODate, string[]> {
  const map = new Map<ISODate, string[]>();
  for (const f of friends) {
    for (const d of f.availability) {
      const list = map.get(d);
      if (list) list.push(f.id);
      else map.set(d, [f.id]);
    }
  }
  return map;
}

/** Friends free on every day of the range (arrival through departure). */
export function freeForRange(friends: Available[], range: DateRange): string[] {
  const days = daysBetween(range.start, range.end);
  return friends
    .filter((f) => {
      const set = new Set(f.availability);
      return days.every((d) => set.has(d));
    })
    .map((f) => f.id);
}

export interface Window {
  start: ISODate;
  end: ISODate;
  attendeeIds: string[];
  /** Number of consecutive alternative start days with the same attendees (1 = no flexibility). */
  flexDays: number;
}

/**
 * Rank every `nights`-night window in the season by how many friends are free for all of it.
 * Consecutive windows with the identical group are merged into one entry with `flexDays`.
 */
export function bestWindows(
  friends: Available[],
  seasonStart: ISODate,
  seasonEnd: ISODate,
  nights: number,
  mustIds: string[] = [],
  limit = 10,
): Window[] {
  if (nights < 1 || friends.length === 0) return [];
  const sets = friends.map((f) => ({ id: f.id, days: new Set(f.availability) }));
  const lastStart = addDaysISO(seasonEnd, -nights);
  if (lastStart < seasonStart) return [];

  const raw: Window[] = [];
  for (const start of daysBetween(seasonStart, lastStart)) {
    const days = daysBetween(start, addDaysISO(start, nights));
    const ids = sets.filter((s) => days.every((d) => s.days.has(d))).map((s) => s.id);
    if (ids.length === 0) continue;
    if (!mustIds.every((m) => ids.includes(m))) continue;
    raw.push({ start, end: days[days.length - 1], attendeeIds: ids, flexDays: 1 });
  }

  const merged: Window[] = [];
  for (const w of raw) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      addDaysISO(prev.start, prev.flexDays) === w.start &&
      prev.attendeeIds.join() === w.attendeeIds.join()
    ) {
      prev.flexDays++;
    } else {
      merged.push({ ...w });
    }
  }

  return merged
    .sort((a, b) => b.attendeeIds.length - a.attendeeIds.length || b.flexDays - a.flexDays || a.start.localeCompare(b.start))
    .slice(0, limit);
}
