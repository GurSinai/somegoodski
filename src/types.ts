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

export interface Friend {
  id: string;
  name: string;
  color: string;
  skillLevel: SkillLevel;
  sport: Sport;
  needsRental: boolean;
  rentalPerDay: number;
  lessons: Lessons;
  budget: number; // total trip budget per person, in settings.currency
  notes: string;
  availability: ISODate[];
}

export interface DateRange {
  start: ISODate;
  end: ISODate; // inclusive: last day on the mountain / departure day
}

export interface Season {
  start: ISODate;
  end: ISODate;
  chosenDates: DateRange | null;
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

export type TripStatus = 'draft' | 'shortlisted' | 'booked';

export interface Trip {
  id: string;
  name: string;
  resortId: string;
  dates: DateRange | null;
  attendeeIds: string[];
  status: TripStatus;
  flights: FlightOption[];
  transfers: TransferOption[];
  hotels: HotelOption[];
  liftPassPerPerson: number; // whole trip, entered per trip
  selectedComboId: string | null;
  createdAt: string;
}

export interface Settings {
  currency: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  friends: Friend[];
  season: Season;
  airports: Airport[];
  resorts: Resort[];
  trips: Trip[];
}
