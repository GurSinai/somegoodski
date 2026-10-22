import type {
  Expense, FlightOption, GearPriceKey, HotelOption, Leg, PricedTrip, Range, RentalShop, SkiPassOption, TransferOption, WinterFriend,
} from '../types';
import { nightsOf, skiDaysOf } from './dates';
import { addRange, range, scaleRange } from './util';

export interface ShopQuote {
  shop: RentalShop;
  rental: number;
  lessons: number;
  missing: GearPriceKey[]; // needed items this shop doesn't list
}

export interface FriendCost {
  friendId: string;
  outbound: FlightOption | null; // the flights this friend actually takes
  ret: FlightOption | null;
  flights: number; // both legs, backpack price
  luggage: number; // their share of trolleys / checked bags
  transfer: number;
  hotel: number;
  pass: SkiPassOption | null;
  skiPass: number;
  quote: ShopQuote | null; // null = no shops entered yet
  rental: number;
  lessons: number;
  expenseLines: { expense: Expense; amount: Range }[];
  expenses: Range;
  total: Range;
  budget: number;
  overBy: number; // > 0 when even the low estimate is over budget
  mayExceed: boolean; // the high estimate is over budget
}

export interface Combo {
  id: string;
  airport: string; // resort-side airport the transfer leaves from
  outbound: FlightOption | null;
  ret: FlightOption | null;
  transfer: TransferOption | null;
  hotel: HotelOption | null;
  costs: FriendCost[];
  groupTotal: Range;
  perPerson: Range; // average per person
  /** Average per-person split, for the stacked bar. */
  parts: { flight: number; transfer: number; hotel: number; liftPass: number; extras: number };
  /** Some category has no option entered yet. */
  incomplete: boolean;
}

export const comboId = (o: FlightOption | null, r: FlightOption | null, t: TransferOption | null, h: HotelOption | null) =>
  [o?.id ?? '-', r?.id ?? '-', t?.id ?? '-', h?.id ?? '-'].join('|');

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

/** Vacation days for per-day expenses: arrival and departure days both count. */
export const vacationDaysOf = (trip: PricedTrip) => (trip.dates ? nightsOf(trip.dates) + 1 : 1);

export const passPrice = (p: SkiPassOption, skiDays: number) => (p.basis === 'per-day' ? p.price * skiDays : p.price);

/** The friend's chosen pass; by default the cheapest option. */
export function passFor(trip: PricedTrip, friendId: string): SkiPassOption | null {
  const choice = trip.passChoice[friendId];
  if (choice === 'none') return null;
  const chosen = trip.skiPasses.find((p) => p.id === choice);
  if (chosen) return chosen;
  const days = skiDaysOf(trip.dates);
  return [...trip.skiPasses].sort((a, b) => passPrice(a, days) - passPrice(b, days))[0] ?? null;
}

/** Price keys of everything a friend needs to rent. */
export function gearKeys(f: WinterFriend): GearPriceKey[] {
  const keys: GearPriceKey[] = [];
  if (f.gear.skis) keys.push(`skis:${f.gear.skis}`);
  if (f.gear.snowboard) keys.push(`snowboard:${f.gear.snowboard}`);
  return [...keys, ...f.gear.pieces];
}

const lessonDays = (f: WinterFriend, skiDays: number) => (f.lessons.wanted ? Math.min(f.lessons.days, skiDays) : 0);

export function shopQuote(shop: RentalShop, f: WinterFriend, skiDays: number): ShopQuote {
  const mult = shop.basis === 'per-day' ? skiDays : 1;
  const missing: GearPriceKey[] = [];
  let rental = 0;
  for (const key of gearKeys(f)) {
    const p = shop.prices[key];
    if (p === undefined || p === null) missing.push(key);
    else rental += p * mult;
  }
  const rate = f.lessons.type === 'group' ? shop.groupLessonPerDay : shop.privateLessonPerDay;
  // shops without that kind of lesson fall back to the friend's own lesson budget
  const lessons = lessonDays(f, skiDays) * (rate || f.lessons.budgetPerDay);
  return { shop, rental, lessons, missing };
}

/** The friend's chosen shop; by default the cheapest one that has everything they need. */
export function quoteFor(trip: PricedTrip, f: WinterFriend): ShopQuote | null {
  const days = skiDaysOf(trip.dates);
  const quotes = trip.shops.map((s) => shopQuote(s, f, days));
  const chosen = quotes.find((q) => q.shop.id === trip.shopChoice[f.id]);
  if (chosen) return chosen;
  const cost = (q: ShopQuote) => q.rental + q.lessons;
  const complete = quotes.filter((q) => q.missing.length === 0);
  return [...(complete.length ? complete : quotes)].sort((a, b) => cost(a) - cost(b))[0] ?? null;
}

/** What one friend pays for an expense (zero if they're not part of it). */
export function expenseShare(e: Expense, friendId: string, attendeeIds: string[], days: number): Range {
  const people = (e.friendIds ?? attendeeIds).filter((id) => attendeeIds.includes(id));
  if (!people.includes(friendId)) return range(0);
  const amount = scaleRange(e.amount, e.per === 'day' ? days : 1);
  return e.split === 'shared' ? scaleRange(amount, 1 / people.length) : amount;
}

/** The flight a friend takes on a leg: their own choice, else the group's default. */
function legFlight(trip: PricedTrip, friendId: string, leg: Leg, groupDefault: FlightOption | null): FlightOption | null {
  const choice = trip.flightChoice[friendId]?.[leg];
  if (choice === 'none') return null;
  return trip.flights.find((f) => f.id === choice && f.direction === leg) ?? groupDefault;
}

/**
 * Splits each bag's price between its owners, per leg. A shared bag is priced on the flight of
 * the first owner taking that leg and split between the owners on that leg.
 */
function luggageShares(trip: PricedTrip, legs: Map<string, Record<Leg, FlightOption | null>>): Map<string, number> {
  const shares = new Map<string, number>();
  for (const bag of trip.luggage) {
    for (const leg of ['outbound', 'return'] as Leg[]) {
      const flying = bag.friendIds.filter((id) => legs.get(id)?.[leg]);
      if (!flying.length) continue;
      const flight = legs.get(flying[0])![leg]!;
      const price = bag.type === 'trolley' ? flight.trolleyPrice : flight.checkedPrice;
      for (const id of flying) shares.set(id, (shares.get(id) ?? 0) + price / flying.length);
    }
  }
  return shares;
}

/**
 * Every combination of the group's default departure × return flight × transfer × hotel.
 * Transfers must serve the airport the group lands at. Personal flight choices, luggage,
 * ski passes, rental shops and expenses are applied per friend on top. A category with
 * no options yet still produces combos (marked incomplete) so partial data is visible.
 */
export function buildCombos(trip: PricedTrip, friends: WinterFriend[]): Combo[] {
  const going = friends.filter((f) => trip.attendeeIds.includes(f.id));
  const people = Math.max(1, going.length);
  const nights = nightsOf(trip.dates);
  const skiDays = skiDaysOf(trip.dates);
  const days = vacationDaysOf(trip);

  const outs = trip.flights.filter((f) => f.direction === 'outbound');
  const rets = trip.flights.filter((f) => f.direction === 'return');
  if (!outs.length && !rets.length) return [];

  // per-friend costs that don't depend on the combination
  const fixed = new Map(
    going.map((f) => {
      const pass = passFor(trip, f.id);
      const quote = quoteFor(trip, f);
      const expenseLines = trip.expenses
        .map((expense) => ({ expense, amount: expenseShare(expense, f.id, trip.attendeeIds, days) }))
        .filter((l) => l.amount.max > 0);
      return [f.id, {
        pass,
        skiPass: pass ? passPrice(pass, skiDays) : 0,
        quote,
        rental: quote?.rental ?? 0,
        lessons: quote ? quote.lessons : lessonDays(f, skiDays) * f.lessons.budgetPerDay,
        expenseLines,
        expenses: expenseLines.reduce((s, l) => addRange(s, l.amount), range(0)),
      }];
    }),
  );

  const combos: Combo[] = [];
  for (const outbound of outs.length ? outs : [null]) {
    for (const ret of rets.length ? rets : [null]) {
      const airport = (outbound ?? ret)!.airport;
      const matching = trip.transfers.filter((t) => t.airport === airport);
      for (const transfer of matching.length ? matching : [null]) {
        for (const hotel of trip.hotels.length ? trip.hotels : [null]) {
          const legs = new Map(going.map((f) => [f.id, {
            outbound: legFlight(trip, f.id, 'outbound', outbound),
            return: legFlight(trip, f.id, 'return', ret),
          }]));
          const bags = luggageShares(trip, legs);
          const transferPP = transfer ? transferPerPerson(transfer, people) : 0;
          const hotelPP = hotel ? hotelPerPerson(hotel, people, nights) : 0;

          const costs: FriendCost[] = going.map((f) => {
            const l = legs.get(f.id)!;
            const x = fixed.get(f.id)!;
            const flights = (l.outbound?.pricePerPerson ?? 0) + (l.return?.pricePerPerson ?? 0);
            const luggage = bags.get(f.id) ?? 0;
            const certain = flights + luggage + transferPP + hotelPP + x.skiPass + x.rental + x.lessons;
            const total = addRange(range(certain), x.expenses);
            return {
              friendId: f.id,
              outbound: l.outbound,
              ret: l.return,
              flights,
              luggage,
              transfer: transferPP,
              hotel: hotelPP,
              pass: x.pass,
              skiPass: x.skiPass,
              quote: x.quote,
              rental: x.rental,
              lessons: x.lessons,
              expenseLines: x.expenseLines,
              expenses: x.expenses,
              total,
              budget: f.budget,
              overBy: f.budget > 0 ? Math.max(0, total.min - f.budget) : 0,
              mayExceed: f.budget > 0 && total.max > f.budget,
            };
          });

          const groupTotal = costs.reduce((s, c) => addRange(s, c.total), range(0));
          const avg = (fn: (c: FriendCost) => number) => costs.reduce((s, c) => s + fn(c), 0) / people;
          combos.push({
            id: comboId(outbound, ret, transfer, hotel),
            airport,
            outbound,
            ret,
            transfer,
            hotel,
            costs,
            groupTotal,
            perPerson: scaleRange(groupTotal, 1 / people),
            parts: {
              flight: avg((c) => c.flights + c.luggage),
              transfer: avg((c) => c.transfer),
              hotel: avg((c) => c.hotel),
              liftPass: avg((c) => c.skiPass),
              extras: avg((c) => c.rental + c.lessons + (c.expenses.min + c.expenses.max) / 2),
            },
            incomplete: !outbound || !ret || !transfer || !hotel,
          });
        }
      }
    }
  }
  return combos;
}

export const withinEveryonesBudget = (combo: Combo) => combo.costs.every((c) => c.overBy === 0);
