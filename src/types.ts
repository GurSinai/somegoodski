// ISO date string, e.g. "2027-01-14"
export type ISODate = string;

export type SkillLevel = 'never' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Sport = 'ski' | 'snowboard' | 'both';
export type LessonType = 'group' | 'private';
export type Currency = 'ILS' | 'USD' | 'EUR';

/** What a rider would like; actual lessons are assigned per ski store on each resort. */
export interface Lessons {
  wanted: boolean;
  type: LessonType;
  days: number;
}

export type GearTier = 'basic' | 'intermediate' | 'advanced' | 'offpiste';
/** Rentable items that have no tiers. */
export type GearPiece = 'boots' | 'helmet' | 'gloves' | 'jacket' | 'pants' | 'goggles';

/** What a friend needs to rent. `equipment: null` = brings their own skis / snowboard. */
export interface GearNeeds {
  equipment: GearTier | null; // skis or snowboard, whichever they ride
  pieces: GearPiece[];
}

/** A friend's profile, shared across winters. */
export interface Friend {
  id: string;
  name: string;
  color: string;
  skillLevel: SkillLevel;
  sport: Sport;
  gear: GearNeeds;
  lessons: Lessons;
  defaultBudget: number; // pre-fills the budget when the friend joins a new winter
  defaultBudgetCurrency: Currency;
  notes: string;
}

export interface DateRange {
  start: ISODate;
  end: ISODate; // inclusive: departure day
}

/** A friend's data for one winter. Shared by every vacation in that winter. */
export interface WinterParticipant {
  friendId: string;
  availability: ISODate[];
  budget: number; // total per-vacation budget
  budgetCurrency: Currency;
}

export interface Winter {
  id: string;
  year: number; // the year the season ends, e.g. 2027 for Dec 2026 – Apr 2027
  start: ISODate;
  end: ISODate;
  participants: WinterParticipant[];
  createdAt: string;
}

export type VacationStatus = 'planning' | 'decided' | 'booked';

/** A trolley or checked bag. One owner = personal; several = shared, cost split between them. */
export interface LuggageItem {
  id: string;
  type: 'trolley' | 'checked';
  friendIds: string[];
  shared?: boolean; // created as a shared bag (kept in the shared list even with one owner)
}

/** A concrete getaway within a winter: dates + people, comparing candidate resorts (trips). */
export interface Vacation {
  id: string;
  winterId: string;
  name: string;
  dates: DateRange | null;
  attendeeIds: string[];
  status: VacationStatus;
  selectedTripId: string | null;
  luggage: LuggageItem[]; // anyone without an item travels with a backpack only
  createdAt: string;
}

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export interface ResortAirport {
  iata: string;
  distanceKm: number;
  driveTimeMin: number;
}

export interface ResortInfo {
  altitudeBase?: number;
  altitudeTop?: number;
  pisteKm?: number;
  lifts?: number;
  levels?: { beginner?: number; intermediate?: number; advanced?: number }; // % of pistes
  skiArea?: string;
  website?: string;
  notes?: string;
}

export interface Resort {
  id: string;
  indexSlug?: string; // key into the bundled skiresort.com index (src/data/resortIndex.ts)
  name: string;
  country: string;
  region: string;
  info: ResortInfo;
  airports: ResortAirport[];
}

export type Leg = 'outbound' | 'return';

/** One direction of a flight. */
export interface FlightOption {
  id: string;
  direction: Leg;
  airport: string; // IATA of the resort-side airport (arrival for outbound, departure for return)
  airline: string;
  homeCity: string; // the other end, e.g. "TLV"
  when: string; // free text, e.g. "Sat 9 Jan 06:10 → 09:45"
  currency: Currency; // of every price on this option (same for all options below)
  pricePerPerson: number; // with a backpack only
  trolleyPrice: number; // per trolley
  checkedPrice: number; // per checked bag
  link: string;
  notes: string;
}

export type TransferType = 'shuttle' | 'private' | 'train' | 'rental-car' | 'bus' | 'other';

export interface TransferOption {
  id: string;
  airport: string; // IATA
  type: TransferType;
  provider: string;
  pricing: 'per-person' | 'per-vehicle';
  currency: Currency;
  price: number; // round trip
  vehicleCapacity: number; // seats per vehicle: splits per-vehicle prices and gas
  gas?: GasEstimate; // rental cars: fuel on top of the rental price
  link: string;
  notes: string;
}

/** Fuel for one car: km × litres/100 km × price per litre (in the transfer's currency). */
export interface GasEstimate {
  km: number; // total driving, e.g. airport ↔ resort round trip
  litersPer100: number;
  pricePerLiter: number;
}

export type StayType = 'dorm' | 'apartment' | 'hotel';

export interface HotelOption {
  id: string;
  name: string;
  currency: Currency;
  price: number;
  per: 'night' | 'stay'; // a nightly rate, or the total for the whole stay
  pricing: 'per-room' | 'per-person';
  roomCapacity: number; // used when pricing is per-room
  type: StayType;
  rating: number | null; // stars, 1–5
  skiInOut: boolean;
  walkable: boolean; // within walking distance of a lift; otherwise you drive (or take the ski bus)
  liftMin: number; // minutes to the lift: on foot when walkable, by car otherwise
  link: string;
  notes: string;
}

export type PriceBasis = 'whole-stay' | 'per-day'; // per-day = × ski days

/** e.g. "Local area" vs "Full area incl. expert zones". */
export interface SkiPassOption {
  id: string;
  name: string;
  basis: PriceBasis;
  currency: Currency;
  price: number; // per person
  notes: string;
}

/** Price keys a shop can list: "equipment:intermediate", "boots", "helmet", … */
export type GearPriceKey = `equipment:${GearTier}` | GearPiece;

/**
 * A lesson a ski store offers. Group lessons cost each rider the per-person price.
 * A private lesson is priced for `people` riders; its full cost is split between
 * whoever is assigned, so friends can share one.
 */
export interface LessonOffer {
  id: string;
  type: LessonType;
  dates: ISODate[]; // lesson days
  people: number; // private only: how many riders the price is for
  pricePerPerson: number; // per lesson day, in the store's currency
  level: SkillLevel | null;
  friendIds: string[]; // riders attending
  notes: string;
}

/** A ski store: gear rental prices plus the lessons it offers. */
export interface RentalShop {
  id: string;
  name: string;
  basis: PriceBasis;
  currency: Currency;
  prices: Partial<Record<GearPriceKey, number>>; // missing = not offered
  lessons: LessonOffer[];
  link: string;
  notes: string;
}

/** A price that may be a range, e.g. food €30–50 a day. */
export interface Range {
  min: number;
  max: number;
}

export interface Expense {
  id: string;
  name: string;
  split: 'shared' | 'individual'; // shared = total split between people; individual = each pays the amount
  currency: Currency;
  amount: Range;
  per: 'trip' | 'day'; // day = × vacation days (nights + 1)
  friendIds: string[] | null; // null = everyone going
  notes: string;
}

/** A friend's own choice for one leg: a specific flight, or 'none' (not flying with the group). */
export type LegChoice = string | 'none';

/** A candidate resort for a vacation, with its price options. */
export interface Trip {
  id: string;
  vacationId: string;
  resortId: string;
  name: string;
  flights: FlightOption[];
  transfers: TransferOption[];
  hotels: HotelOption[];
  skiPasses: SkiPassOption[];
  shops: RentalShop[];
  expenses: Expense[];
  /** Per-friend overrides of the group's default flights. */
  flightChoice: Record<string, Partial<Record<Leg, LegChoice>>>;
  /** Per-friend ski pass (option id or 'none'); missing = cheapest option. */
  passChoice: Record<string, string>;
  /** Per-friend rental shop; missing = cheapest shop for them. */
  shopChoice: Record<string, string>;
  selectedComboId: string | null;
  createdAt: string;
}

/** A friend as seen in a winter: profile + that winter's availability and budget (in the display currency). */
export type WinterFriend = Friend & { availability: ISODate[]; budget: number };

/**
 * A trip with its vacation's dates, attendees and luggage resolved and every price
 * converted to the display currency, ready for pricing.
 */
export type PricedTrip = Trip & { dates: DateRange | null; attendeeIds: string[]; luggage: LuggageItem[] };

/** Units of each currency per 1 EUR. */
export interface FxRates {
  rates: Record<Currency, number>;
  date: string; // as published by the rate source
  fetchedAt: string | null; // null = built-in fallback rates
}

export interface Settings {
  currency: Currency; // everything is shown converted to this
  entryCurrency: Currency; // default for newly entered prices (the last one used)
  fx: FxRates;
  activeWinterId: string | null;
}

export interface AppData {
  version: 7;
  settings: Settings;
  friends: Friend[];
  winters: Winter[];
  vacations: Vacation[];
  airports: Airport[];
  resorts: Resort[];
  trips: Trip[];
}
