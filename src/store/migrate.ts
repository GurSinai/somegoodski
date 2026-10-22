import { createInitialData } from '../data/seed';
import { uid } from '../lib/util';
import type { AppData, Friend, Trip, Vacation, Winter } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * v1 kept one season with availability/budget on each friend and trips with their own dates.
 * v2 moves those into a Winter (shared by all its vacations) and groups trips under a Vacation.
 */
export function migrateV1(old: any): AppData {
  const base = createInitialData();
  const oldFriends: any[] = old.friends ?? [];
  const oldTrips: any[] = old.trips ?? [];
  const season = old.season ?? null;

  const friends: Friend[] = oldFriends.map(({ availability: _a, budget, ...f }) => ({ ...f, defaultBudget: budget ?? 0 }));
  const winters: Winter[] = [];
  const vacations: Vacation[] = [];
  const trips: Trip[] = [];

  if (season && (oldFriends.length || oldTrips.length)) {
    const winter: Winter = {
      id: uid(),
      year: Number(String(season.end).slice(0, 4)),
      start: season.start,
      end: season.end,
      participants: oldFriends.map((f) => ({ friendId: f.id, availability: f.availability ?? [], budget: f.budget ?? 0 })),
      createdAt: new Date().toISOString(),
    };
    winters.push(winter);

    if (oldTrips.length) {
      const vacation: Vacation = {
        id: uid(),
        winterId: winter.id,
        name: 'Vacation 1',
        dates: season.chosenDates ?? oldTrips[0].dates ?? null,
        attendeeIds: [...new Set(oldTrips.flatMap((t) => t.attendeeIds ?? []))] as string[],
        status: 'planning',
        selectedTripId: oldTrips.find((t) => t.selectedComboId)?.id ?? null,
        createdAt: new Date().toISOString(),
      };
      vacations.push(vacation);
      for (const { dates: _d, attendeeIds: _at, status: _s, ...t } of oldTrips) {
        trips.push({ ...t, vacationId: vacation.id, liftPassPerPerson: t.liftPassPerPerson ?? 0 });
      }
    }
  }

  return {
    ...base,
    settings: { currency: old.settings?.currency ?? 'EUR', activeWinterId: winters[0]?.id ?? null },
    friends,
    winters,
    vacations,
    airports: old.airports ?? base.airports,
    resorts: old.resorts ?? base.resorts,
    trips,
  };
}
