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

/** A friend's profile, shared across winters. */
export interface Friend {
  id: string;
  name: string;
  color: string;
  skillLevel: SkillLevel;
  sport: Sport;
  needsRental: boolean;
  rentalPerDay: number;
  lessons: Lessons;
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

/** A concrete getaway within a winter: dates + people, comparing candidate resorts (trips). */
export interface Vacation {
  id: string;
  winterId: string;
  name: string;
  dates: DateRange | null;
  attendeeIds: string[];
  status: VacationStatus;
  selectedTripId: string | null;
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

export interface FlightOption {
  id: string;
  airport: string; // IATA
  airline: string;
  fromCity: string;
  pricePerPerson: number;
  outbound: string; // free text, e.g. "Sat 07:10 → 10:30"
  inbound: string;
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
  distanceToLiftM: number;
  link: string;
  notes: string;
}

/** A candidate resort for a vacation, with its price options. */
export interface Trip {
  id: string;
  vacationId: string;
  resortId: string;
  name: string;
  flights: FlightOption[];
  transfers: TransferOption[];
  hotels: HotelOption[];
  liftPassPerPerson: number; // whole trip
  selectedComboId: string | null;
  createdAt: string;
}

/** A friend as seen in a winter: profile + that winter's availability and budget. */
export type WinterFriend = Friend & { availability: ISODate[]; budget: number };

/** A trip with dates and attendees resolved from its vacation, ready for pricing. */
export type PricedTrip = Trip & { dates: DateRange | null; attendeeIds: string[] };

export interface Settings {
  currency: string;
  activeWinterId: string | null;
}

export interface AppData {
  version: 2;
  settings: Settings;
  friends: Friend[];
  winters: Winter[];
  vacations: Vacation[];
  airports: Airport[];
  resorts: Resort[];
  trips: Trip[];
}
