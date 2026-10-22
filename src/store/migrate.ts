import { createInitialData } from '../data/seed';
import { uid } from '../lib/util';
import type { AppData, Friend, GearNeeds, Trip, Vacation } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const CURRENT_VERSION = 3;

/** Upgrades persisted data or an imported backup from any earlier version. */
export function migrate(data: any, version: number): AppData {
  let d = data;
  if (version < 2) d = v1ToV2(d);
  if (version < 3) d = v2ToV3(d);
  return d as AppData;
}

/**
 * v1 kept one season with availability/budget on each friend and trips with their own dates.
 * v2 moves those into a Winter (shared by all its vacations) and groups trips under a Vacation.
 */
function v1ToV2(old: any): any {
  const base = createInitialData();
  const oldFriends: any[] = old.friends ?? [];
  const oldTrips: any[] = old.trips ?? [];
  const season = old.season ?? null;

  const friends = oldFriends.map(({ availability: _a, budget, ...f }) => ({ ...f, defaultBudget: budget ?? 0 }));
  const winters: any[] = [];
  const vacations: any[] = [];
  const trips: any[] = [];

  if (season && (oldFriends.length || oldTrips.length)) {
    const winter = {
      id: uid(),
      year: Number(String(season.end).slice(0, 4)),
      start: season.start,
      end: season.end,
      participants: oldFriends.map((f) => ({ friendId: f.id, availability: f.availability ?? [], budget: f.budget ?? 0 })),
      createdAt: new Date().toISOString(),
    };
    winters.push(winter);

    if (oldTrips.length) {
      const vacation = {
        id: uid(),
        winterId: winter.id,
        name: 'Vacation 1',
        dates: season.chosenDates ?? oldTrips[0].dates ?? null,
        attendeeIds: [...new Set(oldTrips.flatMap((t) => t.attendeeIds ?? []))],
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
    version: 2,
    settings: { currency: old.settings?.currency ?? 'EUR', activeWinterId: winters[0]?.id ?? null },
    friends,
    winters,
    vacations,
    airports: old.airports ?? base.airports,
    resorts: old.resorts ?? base.resorts,
    trips,
  };
}

/**
 * v3: flights become one-way legs with luggage prices, friends get per-item gear needs,
 * hotels measure the walk to the lift in minutes, and trips gain ski pass options,
 * rental shops, expenses and per-friend choices.
 */
function v2ToV3(old: any): any {
  const friends: Friend[] = (old.friends ?? []).map(({ needsRental, rentalPerDay: _r, ...f }: any) => {
    const gear: GearNeeds = { skis: null, snowboard: null, pieces: [] };
    if (needsRental) {
      if (f.sport === 'snowboard') {
        gear.snowboard = 'sport';
        gear.pieces.push('boardBoots');
      } else {
        gear.skis = 'sport';
        gear.pieces.push('skiBoots');
      }
      gear.pieces.push('helmet');
    }
    return { ...f, gear };
  });

  const trips: Trip[] = (old.trips ?? []).map(({ liftPassPerPerson, ...t }: any) => ({
    ...t,
    // a round-trip flight becomes two legs, with the price split evenly
    flights: (t.flights ?? []).flatMap((f: any) =>
      (['outbound', 'return'] as const).map((direction) => ({
        id: `${f.id}-${direction === 'outbound' ? 'o' : 'r'}`,
        direction,
        airport: f.airport,
        airline: f.airline ?? '',
        homeCity: f.fromCity ?? '',
        when: (direction === 'outbound' ? f.outbound : f.inbound) ?? '',
        pricePerPerson: (f.pricePerPerson ?? 0) / 2,
        trolleyPrice: 0,
        checkedPrice: 0,
        link: f.link ?? '',
        notes: f.notes ?? '',
      })),
    ),
    hotels: (t.hotels ?? []).map(({ distanceToLiftM, ...h }: any) => ({
      ...h,
      walkToLiftMin: distanceToLiftM ? Math.max(1, Math.round(distanceToLiftM / 80)) : 0, // ~80 m per minute on foot
    })),
    skiPasses: liftPassPerPerson ? [{ id: uid(), name: 'Standard pass', basis: 'whole-stay', price: liftPassPerPerson, notes: '' }] : [],
    shops: [],
    expenses: [],
    flightChoice: {},
    passChoice: {},
    shopChoice: {},
    selectedComboId: t.selectedComboId ? upgradeComboId(t.selectedComboId) : null,
  }));

  const vacations: Vacation[] = (old.vacations ?? []).map((v: any) => ({ ...v, luggage: v.luggage ?? [] }));
  return { ...old, version: 3, friends, trips, vacations };
}

// v2 combo ids were "flight|transfer|hotel"; v3 ids are "outbound|return|transfer|hotel"
const upgradeComboId = (id: string) => {
  const [f, t, h] = id.split('|');
  return [`${f}-o`, `${f}-r`, t, h].join('|');
};
