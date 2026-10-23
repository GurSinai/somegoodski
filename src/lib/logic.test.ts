import { describe, expect, it } from 'vitest';
import { newFriend } from '../store/useStore';
import type { PricedTrip, WinterFriend } from '../types';
import { bestWindows, freeForRange } from './availability';
import { buildCombos, hotelPerPerson, lessonShare, shopQuote, transferPerPerson } from './combinations';
import { daysBetween } from './dates';
import { convertTrip, makeConverter } from './fx';

const friend = (id: string, days: string[], extra: Partial<WinterFriend> = {}): WinterFriend => ({ ...newFriend(0, { id, name: id }), availability: days, budget: 0, ...extra });

describe('availability', () => {
  const a = friend('a', daysBetween('2027-01-01', '2027-01-20'));
  const b = friend('b', daysBetween('2027-01-05', '2027-01-15'));
  const c = friend('c', daysBetween('2027-01-10', '2027-01-30'));

  it('finds who is free for a whole range', () => {
    expect(freeForRange([a, b, c], { start: '2027-01-10', end: '2027-01-15' })).toEqual(['a', 'b', 'c']);
    expect(freeForRange([a, b, c], { start: '2027-01-10', end: '2027-01-16' })).toEqual(['a', 'c']);
  });

  it('ranks windows by headcount and merges flexible starts', () => {
    const w = bestWindows([a, b, c], '2027-01-01', '2027-01-31', 5);
    expect(w[0]).toMatchObject({ start: '2027-01-10', end: '2027-01-15', attendeeIds: ['a', 'b', 'c'], flexDays: 1 });
    // a+b free for starts Jan 5..9, a+c for starts Jan 11..15; ties go to the earlier date
    expect(w[1]).toMatchObject({ start: '2027-01-05', attendeeIds: ['a', 'b'], flexDays: 5 });
    expect(w[2]).toMatchObject({ start: '2027-01-11', attendeeIds: ['a', 'c'], flexDays: 5 });
  });

  it('honours must-come people', () => {
    const w = bestWindows([a, b, c], '2027-01-01', '2027-01-31', 3, ['c']);
    expect(w.every((x) => x.attendeeIds.includes('c'))).toBe(true);
  });
});

describe('cost math', () => {
  it('splits per-vehicle transfers across the group', () => {
    const t = { pricing: 'per-vehicle', price: 400, vehicleCapacity: 4 } as never;
    expect(transferPerPerson(t, 4)).toBe(100);
    expect(transferPerPerson(t, 5)).toBe(160); // 2 vehicles
  });

  it('prices per-room hotels by occupancy and nights', () => {
    const h = { pricing: 'per-room', price: 200, per: 'night', roomCapacity: 2 } as never;
    expect(hotelPerPerson(h, 4, 7)).toBe(700);
    expect(hotelPerPerson(h, 3, 7)).toBeCloseTo((2 * 200 * 7) / 3);
    expect(hotelPerPerson({ pricing: 'per-person', price: 90, per: 'night' } as never, 3, 7)).toBe(630);
    // a total for the whole stay isn't multiplied by nights
    expect(hotelPerPerson({ pricing: 'per-room', price: 2800, per: 'stay', roomCapacity: 2 } as never, 4, 7)).toBe(1400);
  });

  const flight = (id: string, direction: 'outbound' | 'return', airport: string, price: number, trolley: number, checked: number) => ({
    id, direction, airport, airline: id, homeCity: 'TLV', when: '', currency: 'EUR' as const, pricePerPerson: price, trolleyPrice: trolley, checkedPrice: checked, link: '', notes: '',
  });
  const shop = (id: string, basis: 'per-day' | 'whole-stay', prices: object, lessons: object[] = []) => ({
    id, name: id, basis, currency: 'EUR' as const, prices, lessons: lessons as never[], link: '', notes: '',
  });
  const lesson = (type: 'group' | 'private', days: number, pricePerPerson: number, friendIds: string[], people = 0) => ({
    id: type + days, type, dates: daysBetween('2027-01-10', '2027-01-15').slice(0, days), people, pricePerPerson, level: null, friendIds, notes: '',
  });

  // 4 riders, 7 nights → 6 ski days, 8 vacation days
  const trip: PricedTrip = {
    id: 't', name: 'VT', vacationId: 'v', resortId: 'val-thorens', createdAt: '', selectedComboId: null,
    dates: { start: '2027-01-09', end: '2027-01-16' },
    attendeeIds: ['a', 'b', 'c', 'd'],
    flights: [
      flight('o1', 'outbound', 'GVA', 150, 40, 60),
      flight('o2', 'outbound', 'LYS', 120, 30, 50),
      flight('r1', 'return', 'GVA', 170, 40, 60),
    ],
    transfers: [
      { id: 't1', airport: 'GVA', type: 'shuttle', provider: '', pricing: 'per-person', currency: 'EUR', price: 100, vehicleCapacity: 1, link: '', notes: '' },
      { id: 't2', airport: 'LYS', type: 'bus', provider: '', pricing: 'per-person', currency: 'EUR', price: 80, vehicleCapacity: 1, link: '', notes: '' },
    ],
    hotels: [{ id: 'h1', name: 'A', currency: 'EUR', price: 200, per: 'night', pricing: 'per-room', roomCapacity: 2, board: 'BB', skiInOut: true, walkToLiftMin: 0, link: '', notes: '' }],
    skiPasses: [
      { id: 'p1', name: 'Local', basis: 'whole-stay', currency: 'EUR', price: 300, notes: '' },
      { id: 'p2', name: 'Full area', basis: 'per-day', currency: 'EUR', price: 70, notes: '' },
    ],
    shops: [
      shop('s1', 'per-day', { 'equipment:intermediate': 20, boots: 8, helmet: 5 }, [lesson('group', 3, 60, ['b'])]),
      shop('s2', 'whole-stay', { 'equipment:intermediate': 100, boots: 50 }), // no helmets
    ],
    expenses: [
      { id: 'gas', name: 'Gas', split: 'shared', currency: 'EUR', amount: { min: 400, max: 400 }, per: 'trip', friendIds: null, notes: '' },
      { id: 'food', name: 'Food', split: 'individual', currency: 'EUR', amount: { min: 30, max: 50 }, per: 'day', friendIds: null, notes: '' },
    ],
    flightChoice: { c: { outbound: 'none' } }, // c drives there
    passChoice: { c: 'none', d: 'p2' },
    shopChoice: {},
    luggage: [
      { id: 'bag1', type: 'checked', friendIds: ['a'] },
      { id: 'bag2', type: 'trolley', friendIds: ['b', 'c'] },
    ],
  };
  const riders = [
    friend('a', [], { budget: 2100, gear: { equipment: 'intermediate', pieces: ['boots', 'helmet'] } }),
    friend('b', [], { lessons: { wanted: true, type: 'group', days: 3 } }),
    friend('c', []),
    friend('d', []),
  ];

  it('quotes store rental per item and flags what a store does not rent', () => {
    expect(shopQuote(trip.shops[0], riders[0], 6)).toMatchObject({ rental: 198, missing: [] });
    expect(shopQuote(trip.shops[1], riders[0], 6)).toMatchObject({ rental: 150, missing: ['helmet'] });
  });

  it('prices group lessons per rider and splits private lessons between riders', () => {
    const group = lesson('group', 3, 60, []);
    expect(lessonShare(group, 1)).toBe(180);
    expect(lessonShare(group, 4)).toBe(180);
    // private lesson for 2 at 110 pp/day, 2 days: 440 in total
    const priv = lesson('private', 2, 110, [], 2);
    expect(lessonShare(priv, 2)).toBe(220); // shared: 220 each
    expect(lessonShare(priv, 1)).toBe(440); // alone: pays the whole lesson
    expect(lessonShare(priv, 3)).toBe(220); // more than planned: per-person price each
    expect(lessonShare(priv, 0)).toBe(0);
  });

  it('combines legs, transfers by airport, and prices every friend individually', () => {
    const combos = buildCombos(trip, riders);
    expect(combos.map((c) => c.id)).toEqual(['o1|r1|t1|h1', 'o2|r1|t2|h1']);
    const c = combos[0];
    const cost = (id: string) => c.costs.find((x) => x.friendId === id)!;

    // a: 320 flights + 120 checked bag both ways + 100 + 700 + 300 pass + 198 rental (s1: only shop with helmets)
    //    + 100 gas share + food 240–400
    expect(cost('a')).toMatchObject({ flights: 320, luggage: 120, rental: 198, total: { min: 2078, max: 2238 }, overBy: 0, mayExceed: true });
    expect(cost('a').quote?.shop.id).toBe('s1');
    // b: trolley alone outbound (40) + half the return trolley (20); assigned to s1's 3-day group lesson (180)
    expect(cost('b')).toMatchObject({ luggage: 60, lessons: 180, total: { min: 2000, max: 2160 } });
    expect(cost('b').lessonLines.map((l) => l.shop.id)).toEqual(['s1']);
    // c: return flight only, half a trolley, no pass
    expect(cost('c')).toMatchObject({ flights: 170, luggage: 20, skiPass: 0, total: { min: 1330, max: 1490 } });
    // d: full-area pass, 70 × 6 days
    expect(cost('d')).toMatchObject({ skiPass: 420, total: { min: 1880, max: 2040 } });
    expect(c.groupTotal).toEqual({ min: 7288, max: 7928 });
    expect(c.incomplete).toBe(false);
  });

  it('marks combos without transfers or hotels as incomplete', () => {
    const bare: PricedTrip = {
      ...trip, attendeeIds: ['c'], flights: [trip.flights[0]], transfers: [], hotels: [], skiPasses: [], shops: [], expenses: [],
      luggage: [], flightChoice: {}, passChoice: {},
    };
    const [c] = buildCombos(bare, [riders[2]]);
    expect(c.incomplete).toBe(true);
    expect(c.perPerson).toEqual({ min: 150, max: 150 });
  });
});

describe('currency conversion', () => {
  const fx = { rates: { EUR: 1, USD: 1.1, ILS: 4 }, date: '', fetchedAt: null };

  it('converts between any two currencies through EUR', () => {
    const toIls = makeConverter(fx, 'ILS');
    expect(toIls(100, 'EUR')).toBe(400);
    expect(toIls(110, 'USD')).toBeCloseTo(400);
    expect(toIls(50, 'ILS')).toBe(50);
    expect(makeConverter(fx, 'USD')(400, 'ILS')).toBeCloseTo(110);
  });

  it('converts every price in a trip from its own currency', () => {
    const t = convertTrip({
      flights: [{ currency: 'EUR', pricePerPerson: 100, trolleyPrice: 10, checkedPrice: 20 }],
      transfers: [{ currency: 'USD', price: 110 }],
      hotels: [{ currency: 'ILS', price: 500 }],
      skiPasses: [{ currency: 'EUR', price: 50 }],
      shops: [{ currency: 'EUR', prices: { helmet: 5 }, lessons: [{ pricePerPerson: 60 }] }],
      expenses: [{ currency: 'EUR', amount: { min: 30, max: 50 } }],
    } as never, makeConverter(fx, 'ILS'));
    expect(t.flights[0]).toMatchObject({ pricePerPerson: 400, trolleyPrice: 40, checkedPrice: 80 });
    expect(t.transfers[0].price).toBeCloseTo(400);
    expect(t.hotels[0].price).toBe(500);
    expect(t.shops[0]).toMatchObject({ prices: { helmet: 20 }, lessons: [{ pricePerPerson: 240 }] });
    expect(t.expenses[0].amount).toEqual({ min: 120, max: 200 });
  });
});

describe('migration', () => {
  it('upgrades v1 data all the way to the current version', async () => {
    const { migrate } = await import('../store/migrate');
    const d = migrate({
      settings: { currency: 'USD' },
      season: { start: '2026-12-01', end: '2027-04-18', chosenDates: { start: '2027-01-09', end: '2027-01-16' } },
      friends: [{ id: 'a', name: 'A', sport: 'ski', availability: ['2027-01-09'], budget: 1500, needsRental: true, rentalPerDay: 30, lessons: { wanted: true, type: 'group', days: 2, budgetPerDay: 50 } }],
      trips: [{
        id: 't', resortId: 'val-thorens', attendeeIds: ['a'], dates: null, status: 'draft', liftPassPerPerson: 350,
        flights: [{ id: 'f', airport: 'GVA', airline: 'X', fromCity: 'TLV', pricePerPerson: 300, outbound: 'Sat 06:10', inbound: 'Sat 18:00' }],
        transfers: [{ id: 'x' }], hotels: [{ id: 'h', distanceToLiftM: 400 }], selectedComboId: 'f|x|h',
      }],
    }, 1);
    expect(d.friends[0]).toMatchObject({
      id: 'a', defaultBudget: 1500, defaultBudgetCurrency: 'USD',
      gear: { equipment: 'intermediate', pieces: ['boots', 'helmet'] },
      lessons: { wanted: true, type: 'group', days: 2 },
    });
    expect(d.friends[0]).not.toHaveProperty('availability');
    expect(d.friends[0].lessons).not.toHaveProperty('budgetPerDay');
    expect(d.winters[0]).toMatchObject({ year: 2027, participants: [{ friendId: 'a', availability: ['2027-01-09'], budget: 1500, budgetCurrency: 'USD' }] });
    expect(d.vacations[0]).toMatchObject({ attendeeIds: ['a'], dates: { start: '2027-01-09' }, selectedTripId: 't', luggage: [] });
    const t = d.trips[0];
    expect(t.flights.map((f) => [f.id, f.direction, f.pricePerPerson, f.when, f.currency])).toEqual([
      ['f-o', 'outbound', 150, 'Sat 06:10', 'USD'],
      ['f-r', 'return', 150, 'Sat 18:00', 'USD'],
    ]);
    expect(t.hotels[0]).toMatchObject({ walkToLiftMin: 5, currency: 'USD', per: 'night' });
    expect(t.skiPasses).toMatchObject([{ basis: 'whole-stay', price: 350, currency: 'USD' }]);
    expect(t.selectedComboId).toBe('f-o|f-r|x|h');
    // existing prices keep their currency; the app now shows everything in ILS
    expect(d.settings).toMatchObject({ currency: 'ILS', entryCurrency: 'USD', activeWinterId: d.winters[0].id });
  });

  it('merges ski and snowboard prices and turns old lesson rates into lesson offers', async () => {
    const { migrate } = await import('../store/migrate');
    const d = migrate({
      version: 3, settings: { currency: 'EUR' }, friends: [], winters: [], vacations: [],
      trips: [{ id: 't', flights: [], transfers: [], hotels: [], skiPasses: [], expenses: [],
        shops: [{ id: 's', prices: { 'skis:sport': 22, 'snowboard:sport': 20, 'skis:premium': 40, skiBoots: 9, boardBoots: 8, helmet: 4 }, groupLessonPerDay: 65, privateLessonPerDay: 0 }] }],
    }, 3);
    expect(d.trips[0].shops[0].prices).toEqual({ 'equipment:intermediate': 22, 'equipment:offpiste': 40, boots: 9, helmet: 4 });
    expect(d.trips[0].shops[0].lessons).toMatchObject([{ type: 'group', pricePerPerson: 65, dates: [], friendIds: [] }]);
    expect(d.trips[0].shops[0]).not.toHaveProperty('groupLessonPerDay');
  });
});
