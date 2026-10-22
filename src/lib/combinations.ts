import type { FlightOption, HotelOption, PricedTrip, TransferOption, WinterFriend } from '../types';
import { nightsOf, skiDaysOf } from './dates';

export interface Combo {
  id: string;
  airport: string;
  flight: FlightOption;
  transfer: TransferOption | null;
  hotel: HotelOption | null;
  /** Shared per-person costs (same for everyone). */
  perPerson: { flight: number; transfer: number; hotel: number; liftPass: number; total: number };
  groupTotal: number;
  /** Some category has no option entered yet. */
  incomplete: boolean;
}

export interface FriendCost {
  friendId: string;
  shared: number;
  lessons: number;
  rental: number;
  total: number;
  budget: number;
  overBy: number; // > 0 when over budget
}

export const comboId = (f: FlightOption, t: TransferOption | null, h: HotelOption | null) =>
  `${f.id}|${t?.id ?? '-'}|${h?.id ?? '-'}`;

export function transferPerPerson(t: TransferOption, people: number): number {
  if (t.pricing === 'per-person') return t.price;
  const vehicles = Math.ceil(people / Math.max(1, t.vehicleCapacity));
  return (vehicles * t.price) / people;
}

export function hotelPerPerson(h: HotelOption, people: number, nights: number): number {
  if (h.pricing === 'per-person') return h.pricePerNight * nights;
  const rooms = Math.ceil(people / Math.max(1, h.roomCapacity));
  return (rooms * h.pricePerNight * nights) / people;
}

/**
 * Every valid flight × transfer × hotel combination for a trip.
 * Transfers must leave from the flight's airport. A category with no options yet
 * still produces combos (marked incomplete) so partial data is visible.
 */
export function buildCombos(trip: PricedTrip): Combo[] {
  const people = Math.max(1, trip.attendeeIds.length);
  const nights = nightsOf(trip.dates);
  const hotels: (HotelOption | null)[] = trip.hotels.length ? trip.hotels : [null];
  const combos: Combo[] = [];

  for (const flight of trip.flights) {
    const matching = trip.transfers.filter((t) => t.airport === flight.airport);
    const transfers: (TransferOption | null)[] = matching.length ? matching : [null];
    for (const transfer of transfers) {
      for (const hotel of hotels) {
        const pp = {
          flight: flight.pricePerPerson,
          transfer: transfer ? transferPerPerson(transfer, people) : 0,
          hotel: hotel ? hotelPerPerson(hotel, people, nights) : 0,
          liftPass: trip.liftPassPerPerson || 0,
          total: 0,
        };
        pp.total = pp.flight + pp.transfer + pp.hotel + pp.liftPass;
        combos.push({
          id: comboId(flight, transfer, hotel),
          airport: flight.airport,
          flight,
          transfer,
          hotel,
          perPerson: pp,
          groupTotal: pp.total * people,
          incomplete: !transfer || !hotel,
        });
      }
    }
  }
  return combos;
}

export function friendExtras(friend: WinterFriend, trip: PricedTrip): { lessons: number; rental: number } {
  const skiDays = skiDaysOf(trip.dates);
  const lessons = friend.lessons.wanted ? Math.min(friend.lessons.days, skiDays) * friend.lessons.budgetPerDay : 0;
  const rental = friend.needsRental ? friend.rentalPerDay * skiDays : 0;
  return { lessons, rental };
}

export function friendCosts(combo: Combo, friends: WinterFriend[], trip: PricedTrip): FriendCost[] {
  return friends
    .filter((f) => trip.attendeeIds.includes(f.id))
    .map((f) => {
      const { lessons, rental } = friendExtras(f, trip);
      const total = combo.perPerson.total + lessons + rental;
      return {
        friendId: f.id,
        shared: combo.perPerson.total,
        lessons,
        rental,
        total,
        budget: f.budget,
        overBy: f.budget > 0 ? Math.max(0, total - f.budget) : 0,
      };
    });
}

export const withinEveryonesBudget = (combo: Combo, friends: WinterFriend[], trip: PricedTrip) =>
  friendCosts(combo, friends, trip).every((c) => c.overBy === 0);
