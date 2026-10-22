import { describe, expect, it } from 'vitest';
import { newFriend } from '../store/useStore';
import type { Trip } from '../types';
import { bestWindows, freeForRange } from './availability';
import { buildCombos, friendCosts, hotelPerPerson, transferPerPerson } from './combinations';
import { daysBetween, nightsOf } from './dates';

const friend = (id: string, days: string[], extra = {}) => newFriend(0, { id, name: id, availability: days, ...extra });

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

  it('builds only airport-matching combos and computes totals', () => {
    const trip: Trip = {
      id: 't', name: 'VT', resortId: 'val-thorens', status: 'draft', createdAt: '', selectedComboId: null,
      dates: { start: '2027-01-09', end: '2027-01-16' },
      attendeeIds: ['a', 'b', 'c', 'd'],
      liftPassPerPerson: 350,
      flights: [
        { id: 'f1', airport: 'GVA', airline: 'X', fromCity: '', pricePerPerson: 300, outbound: '', inbound: '', link: '', notes: '' },
        { id: 'f2', airport: 'LYS', airline: 'Y', fromCity: '', pricePerPerson: 250, outbound: '', inbound: '', link: '', notes: '' },
      ],
      transfers: [
        { id: 't1', airport: 'GVA', type: 'shuttle', provider: '', pricing: 'per-person', price: 120, vehicleCapacity: 1, link: '', notes: '' },
        { id: 't2', airport: 'GVA', type: 'private', provider: '', pricing: 'per-vehicle', price: 800, vehicleCapacity: 8, link: '', notes: '' },
        { id: 't3', airport: 'LYS', type: 'bus', provider: '', pricing: 'per-person', price: 90, vehicleCapacity: 1, link: '', notes: '' },
      ],
      hotels: [
        { id: 'h1', name: 'A', pricePerNight: 200, pricing: 'per-room', roomCapacity: 2, board: 'BB', skiInOut: true, distanceToLiftM: 0, link: '', notes: '' },
        { id: 'h2', name: 'B', pricePerNight: 80, pricing: 'per-person', roomCapacity: 2, board: 'HB', skiInOut: false, distanceToLiftM: 300, link: '', notes: '' },
      ],
    };
    expect(nightsOf(trip.dates)).toBe(7);
    const combos = buildCombos(trip);
    expect(combos).toHaveLength(6); // (2 GVA transfers + 1 LYS transfer) × 2 hotels
    const c = combos.find((x) => x.id === 'f1|t2|h1')!;
    expect(c.perPerson).toMatchObject({ flight: 300, transfer: 200, hotel: 700, liftPass: 350, total: 1550 });
    expect(c.groupTotal).toBe(6200);

    const lessonFriend = friend('a', [], {
      budget: 1800, needsRental: true, rentalPerDay: 30,
      lessons: { wanted: true, type: 'group', days: 3, budgetPerDay: 60 },
    });
    const [cost] = friendCosts(c, [lessonFriend], trip);
    // 6 ski days of rental, 3 lesson days
    expect(cost).toMatchObject({ lessons: 180, rental: 180, total: 1910, overBy: 110 });
  });

  it('marks combos without transfers or hotels as incomplete', () => {
    const trip = {
      attendeeIds: ['a'], dates: null, liftPassPerPerson: 0, transfers: [], hotels: [],
      flights: [{ id: 'f', airport: 'GVA', pricePerPerson: 100 }],
    } as unknown as Trip;
    const [c] = buildCombos(trip);
    expect(c.incomplete).toBe(true);
    expect(c.perPerson.total).toBe(100);
  });
});
