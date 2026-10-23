import { createInitialData } from '../data/seed';
import { FALLBACK_RATES } from '../lib/fx';
import { uid } from '../lib/util';
import type { AppData, Currency, GearPiece, GearTier } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const CURRENT_VERSION = 5;

/** Upgrades persisted data or an imported backup from any earlier version. */
export function migrate(data: any, version: number): AppData {
  let d = data;
  if (version < 2) d = v1ToV2(d);
  if (version < 3) d = v2ToV3(d);
  if (version < 4) d = v3ToV4(d);
  if (version < 5) d = v4ToV5(d);
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
  const friends: any[] = (old.friends ?? []).map(({ needsRental, rentalPerDay: _r, ...f }: any) => {
    const gear: any = { skis: null, snowboard: null, pieces: [] };
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

  const trips: any[] = (old.trips ?? []).map(({ liftPassPerPerson, ...t }: any) => ({
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

  const vacations: any[] = (old.vacations ?? []).map((v: any) => ({ ...v, luggage: v.luggage ?? [] }));
  return { ...old, version: 3, friends, trips, vacations };
}

// v2 combo ids were "flight|transfer|hotel"; v3 ids are "outbound|return|transfer|hotel"
const upgradeComboId = (id: string) => {
  const [f, t, h] = id.split('|');
  return [`${f}-o`, `${f}-r`, t, h].join('|');
};

const TIER_V4: Record<string, GearTier> = { basic: 'basic', sport: 'intermediate', performance: 'advanced', premium: 'offpiste' };
const PIECE_V4: Record<string, GearPiece> = { skiBoots: 'boots', boardBoots: 'boots' };

/** Renames v3 shop price keys; when two merge (e.g. ski + snowboard boots) the first price wins. */
function v4Prices(prices: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, price] of Object.entries(prices ?? {})) {
    const [kind, tier] = key.split(':');
    const next = kind === 'skis' || kind === 'snowboard' ? `equipment:${TIER_V4[tier] ?? tier}` : PIECE_V4[key] ?? key;
    if (!(next in out)) out[next] = price;
  }
  return out;
}

/**
 * v4: every price carries its own currency (converted for display), skis and snowboards
 * become one tiered "equipment" item with shared boots, and lesson prices come only from shops.
 */
function v3ToV4(old: any): any {
  // prices so far were all entered in the single app currency
  const was: Currency = ['ILS', 'USD', 'EUR'].includes(old.settings?.currency) ? old.settings.currency : 'EUR';
  const withCurrency = (list: any[] = []) => list.map((o) => ({ ...o, currency: o.currency ?? was }));

  const friends = (old.friends ?? []).map((f: any) => {
    const g = f.gear ?? {};
    const tier = g.skis ?? g.snowboard ?? null;
    const pieces = [...new Set((g.pieces ?? []).map((p: string) => PIECE_V4[p] ?? p))];
    const { budgetPerDay: _b, ...lessons } = f.lessons ?? { wanted: false, type: 'group', days: 0 };
    return {
      ...f,
      gear: { equipment: tier ? TIER_V4[tier] ?? null : null, pieces },
      lessons,
      defaultBudgetCurrency: f.defaultBudgetCurrency ?? was,
    };
  });

  const winters = (old.winters ?? []).map((w: any) => ({
    ...w,
    participants: (w.participants ?? []).map((p: any) => ({ ...p, budgetCurrency: p.budgetCurrency ?? was })),
  }));

  const trips = (old.trips ?? []).map((t: any) => ({
    ...t,
    flights: withCurrency(t.flights),
    transfers: withCurrency(t.transfers),
    hotels: withCurrency(t.hotels).map(({ pricePerNight, ...h }: any) => ({ ...h, price: h.price ?? pricePerNight ?? 0, per: h.per ?? 'night' })),
    skiPasses: withCurrency(t.skiPasses),
    shops: withCurrency(t.shops).map((s: any) => ({ ...s, prices: v4Prices(s.prices) })),
    expenses: withCurrency(t.expenses),
  }));

  return {
    ...old,
    version: 4,
    settings: { ...old.settings, currency: 'ILS', entryCurrency: was, fx: old.settings?.fx ?? FALLBACK_RATES },
    friends,
    winters,
    trips,
  };
}

/**
 * v5: stores list concrete lesson offers (group or private, with days, size and riders)
 * instead of one group and one private day rate. Old rates become offers to fill in.
 */
function v4ToV5(old: any): any {
  const offer = (type: 'group' | 'private', price: number) => ({
    id: uid(), type, dates: [], people: type === 'private' ? 1 : 0, pricePerPerson: price, level: null, friendIds: [],
    notes: 'Converted from the old per-day lesson price: pick the days and riders.',
  });
  const trips = (old.trips ?? []).map((t: any) => ({
    ...t,
    shops: (t.shops ?? []).map(({ groupLessonPerDay, privateLessonPerDay, ...s }: any) => ({
      ...s,
      lessons: s.lessons ?? [
        ...(groupLessonPerDay ? [offer('group', groupLessonPerDay)] : []),
        ...(privateLessonPerDay ? [offer('private', privateLessonPerDay)] : []),
      ],
    })),
  }));
  return { ...old, version: 5, trips };
}
