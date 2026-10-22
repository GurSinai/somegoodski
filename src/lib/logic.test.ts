import { describe, expect, it } from 'vitest';
import { newFriend } from '../store/useStore';
import type { PricedTrip, WinterFriend } from '../types';
import { bestWindows, freeForRange } from './availability';
import { buildCombos, hotelPerPerson, shopQuote, transferPerPerson } from './combinations';
import { daysBetween } from './dates';

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
    const h = { pricing: 'per-room', pricePerNight: 200, roomCapacity: 2 } as never;
    expect(hotelPerPerson(h, 4, 7)).toBe(700);
    expect(hotelPerPerson(h, 3, 7)).toBeCloseTo((2 * 200 * 7) / 3);
    expect(hotelPerPerson({ pricing: 'per-person', pricePerNight: 90 } as never, 3, 7)).toBe(630);
  });

  const flight = (id: string, direction: 'outbound' | 'return', airport: string, price: number, trolley: number, checked: number) => ({
    id, direction, airport, airline: id, homeCity: 'TLV', when: '', pricePerPerson: price, trolleyPrice: trolley, checkedPrice: checked, link: '', notes: '',
  });
  const shop = (id: string, basis: 'per-day' | 'whole-stay', prices: object, groupLessonPerDay = 0) => ({
    id, name: id, basis, prices, groupLessonPerDay, privateLessonPerDay: 0, link: '', notes: '',
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
      { id: 't1', airport: 'GVA', type: 'shuttle', provider: '', pricing: 'per-person', price: 100, vehicleCapacity: 1, link: '', notes: '' },
      { id: 't2', airport: 'LYS', type: 'bus', provider: '', pricing: 'per-person', price: 80, vehicleCapacity: 1, link: '', notes: '' },
    ],
    hotels: [{ id: 'h1', name: 'A', pricePerNight: 200, pricing: 'per-room', roomCapacity: 2, board: 'BB', skiInOut: true, walkToLiftMin: 0, link: '', notes: '' }],
    skiPasses: [
      { id: 'p1', name: 'Local', basis: 'whole-stay', price: 300, notes: '' },
      { id: 'p2', name: 'Full area', basis: 'per-day', price: 70, notes: '' },
    ],
    shops: [
      shop('s1', 'per-day', { 'skis:sport': 20, skiBoots: 8, helmet: 5 }, 60),
      shop('s2', 'whole-stay', { 'skis:sport': 100, skiBoots: 50 }), // no helmets, no lessons
    ],
    expenses: [
      { id: 'gas', name: 'Gas', split: 'shared', amount: { min: 400, max: 400 }, per: 'trip', friendIds: null, notes: '' },
      { id: 'food', name: 'Food', split: 'individual', amount: { min: 30, max: 50 }, per: 'day', friendIds: null, notes: '' },
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
    friend('a', [], { budget: 2100, gear: { skis: 'sport', snowboard: null, pieces: ['skiBoots', 'helmet'] } }),
    friend('b', [], { lessons: { wanted: true, type: 'group', days: 3, budgetPerDay: 50 } }),
    friend('c', []),
    friend('d', []),
  ];

  it('quotes shops per item and falls back to the lesson budget', () => {
    expect(shopQuote(trip.shops[0], riders[0], 6)).toMatchObject({ rental: 198, missing: [] });
    expect(shopQuote(trip.shops[1], riders[0], 6)).toMatchObject({ rental: 150, missing: ['helmet'] });
    expect(shopQuote(trip.shops[1], riders[1], 6)).toMatchObject({ lessons: 150 }); // 3 days × own budget
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
    // b: trolley alone outbound (40) + half the return trolley (20); lessons at s2 on own budget (150)
    expect(cost('b')).toMatchObject({ luggage: 60, lessons: 150, total: { min: 1970, max: 2130 } });
    // c: return flight only, half a trolley, no pass
    expect(cost('c')).toMatchObject({ flights: 170, luggage: 20, skiPass: 0, total: { min: 1330, max: 1490 } });
    // d: full-area pass, 70 × 6 days
    expect(cost('d')).toMatchObject({ skiPass: 420, total: { min: 1880, max: 2040 } });
    expect(c.groupTotal).toEqual({ min: 7258, max: 7898 });
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

describe('migration', () => {
  it('upgrades v1 data all the way to v3', async () => {
    const { migrate } = await import('../store/migrate');
    const d = migrate({
      settings: { currency: 'USD' },
      season: { start: '2026-12-01', end: '2027-04-18', chosenDates: { start: '2027-01-09', end: '2027-01-16' } },
      friends: [{ id: 'a', name: 'A', sport: 'ski', availability: ['2027-01-09'], budget: 1500, needsRental: true, rentalPerDay: 30, lessons: {} }],
      trips: [{
        id: 't', resortId: 'val-thorens', attendeeIds: ['a'], dates: null, status: 'draft', liftPassPerPerson: 350,
        flights: [{ id: 'f', airport: 'GVA', airline: 'X', fromCity: 'TLV', pricePerPerson: 300, outbound: 'Sat 06:10', inbound: 'Sat 18:00' }],
        transfers: [{ id: 'x' }], hotels: [{ id: 'h', distanceToLiftM: 400 }], selectedComboId: 'f|x|h',
      }],
    }, 1);
    expect(d.friends[0]).toMatchObject({ id: 'a', defaultBudget: 1500, gear: { skis: 'sport', pieces: ['skiBoots', 'helmet'] } });
    expect(d.friends[0]).not.toHaveProperty('availability');
    expect(d.winters[0]).toMatchObject({ year: 2027, participants: [{ friendId: 'a', availability: ['2027-01-09'], budget: 1500 }] });
    expect(d.vacations[0]).toMatchObject({ attendeeIds: ['a'], dates: { start: '2027-01-09' }, selectedTripId: 't', luggage: [] });
    const t = d.trips[0];
    expect(t.flights.map((f) => [f.id, f.direction, f.pricePerPerson, f.when])).toEqual([
      ['f-o', 'outbound', 150, 'Sat 06:10'],
      ['f-r', 'return', 150, 'Sat 18:00'],
    ]);
    expect(t.hotels[0]).toMatchObject({ walkToLiftMin: 5 });
    expect(t.skiPasses).toMatchObject([{ basis: 'whole-stay', price: 350 }]);
    expect(t.selectedComboId).toBe('f-o|f-r|x|h');
    expect(d.settings).toMatchObject({ currency: 'USD', activeWinterId: d.winters[0].id });
  });
});
