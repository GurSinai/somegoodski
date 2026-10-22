// ISO date string, e.g. "2027-01-14"
export type ISODate = string;

export type SkillLevel = 'never' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Sport = 'ski' | 'snowboard' | 'both';
export type LessonType = 'group' | 'private';

export interface Lessons {
  wanted: boolean;
  type: LessonType;
  days: number;
  budgetPerDay: number;
}

export type SkiTier = 'basic' | 'sport' | 'performance' | 'premium';
export type BoardTier = 'basic' | 'sport' | 'performance';
/** Rentable items that have no tiers. */
export type GearPiece = 'skiBoots' | 'boardBoots' | 'helmet' | 'gloves' | 'jacket' | 'pants' | 'goggles';

/** What a friend needs to rent. `null` tier = brings their own. */
export interface GearNeeds {
  skis: SkiTier | null;
  snowboard: BoardTier | null;
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
  lessons: Lessons; // budgetPerDay is the fallback when no shop lists lesson prices
  defaultBudget: number; // pre-fills the budget when the friend joins a new winter
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
  budget: number; // total per-vacation budget, in settings.currency
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
  price: number; // round trip
  vehicleCapacity: number; // used when pricing is per-vehicle
  link: string;
  notes: string;
}

export type Board = 'RO' | 'BB' | 'HB' | 'FB' | 'AI' | 'SC';

export interface HotelOption {
  id: string;
  name: string;
  pricePerNight: number;
  pricing: 'per-room' | 'per-person';
  roomCapacity: number; // used when pricing is per-room
  board: Board;
  skiInOut: boolean;
  walkToLiftMin: number;
  link: string;
  notes: string;
}

export type PriceBasis = 'whole-stay' | 'per-day'; // per-day = × ski days

/** e.g. "Local area" vs "Full area incl. expert zones". */
export interface SkiPassOption {
  id: string;
  name: string;
  basis: PriceBasis;
  price: number; // per person
  notes: string;
}

/** Price keys a shop can list: "skis:sport", "snowboard:basic", "helmet", … */
export type GearPriceKey = `skis:${SkiTier}` | `snowboard:${BoardTier}` | GearPiece;

export interface RentalShop {
  id: string;
  name: string;
  basis: PriceBasis;
  prices: Partial<Record<GearPriceKey, number>>; // missing = not offered
  groupLessonPerDay: number; // 0 = not offered
  privateLessonPerDay: number;
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

/** A friend as seen in a winter: profile + that winter's availability and budget. */
export type WinterFriend = Friend & { availability: ISODate[]; budget: number };

/** A trip with its vacation's dates, attendees and luggage resolved, ready for pricing. */
export type PricedTrip = Trip & { dates: DateRange | null; attendeeIds: string[]; luggage: LuggageItem[] };

export interface Settings {
  currency: string;
  activeWinterId: string | null;
}

export interface AppData {
  version: 3;
  settings: Settings;
  friends: Friend[];
  winters: Winter[];
  vacations: Vacation[];
  airports: Airport[];
  resorts: Resort[];
  trips: Trip[];
}
