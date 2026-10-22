import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Airport, AppData, DateRange, FlightOption, Friend, HotelOption, ISODate, Resort, Season, Settings,
  TransferOption, Trip,
} from '../types';
import { createInitialData } from '../data/seed';
import { freeForRange } from '../lib/availability';
import { FRIEND_COLORS, uid } from '../lib/util';

type OptionKind = 'flights' | 'transfers' | 'hotels';
type OptionOf<K extends OptionKind> = K extends 'flights' ? FlightOption : K extends 'transfers' ? TransferOption : HotelOption;

interface Actions {
  // friends
  addFriend: (f?: Partial<Friend>) => string;
  updateFriend: (id: string, patch: Partial<Friend>) => void;
  removeFriend: (id: string) => void;
  setAvailability: (id: string, days: ISODate[], available: boolean) => void;
  // season
  updateSeason: (patch: Partial<Season>) => void;
  setChosenDates: (r: DateRange | null) => void;
  // resorts & airports
  addResort: (r: Omit<Resort, 'id'>) => string;
  updateResort: (id: string, patch: Partial<Resort>) => void;
  removeResort: (id: string) => void;
  upsertAirport: (a: Airport) => void;
  // trips
  createTrip: (resortId: string) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
  saveOption: <K extends OptionKind>(tripId: string, kind: K, option: OptionOf<K>) => void;
  removeOption: (tripId: string, kind: OptionKind, optionId: string) => void;
  // misc
  updateSettings: (patch: Partial<Settings>) => void;
  importData: (d: AppData) => void;
  resetAll: () => void;
}

export type Store = AppData & Actions;

export const newFriend = (existingCount: number, patch: Partial<Friend> = {}): Friend => ({
  id: uid(),
  name: '',
  color: FRIEND_COLORS[existingCount % FRIEND_COLORS.length],
  skillLevel: 'intermediate',
  sport: 'ski',
  needsRental: false,
  rentalPerDay: 0,
  lessons: { wanted: false, type: 'group', days: 0, budgetPerDay: 0 },
  budget: 0,
  notes: '',
  availability: [],
  ...patch,
});

const mapTrip = (trips: Trip[], id: string, fn: (t: Trip) => Trip) => trips.map((t) => (t.id === id ? fn(t) : t));

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addFriend: (patch) => {
        const f = newFriend(get().friends.length, patch);
        set((s) => ({ friends: [...s.friends, f] }));
        return f.id;
      },
      updateFriend: (id, patch) =>
        set((s) => ({ friends: s.friends.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFriend: (id) =>
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== id),
          trips: s.trips.map((t) => ({ ...t, attendeeIds: t.attendeeIds.filter((a) => a !== id) })),
        })),
      setAvailability: (id, days, available) =>
        set((s) => ({
          friends: s.friends.map((f) => {
            if (f.id !== id) return f;
            const next = new Set(f.availability);
            days.forEach((d) => (available ? next.add(d) : next.delete(d)));
            return { ...f, availability: [...next].sort() };
          }),
        })),

      updateSeason: (patch) => set((s) => ({ season: { ...s.season, ...patch } })),
      setChosenDates: (r) => set((s) => ({ season: { ...s.season, chosenDates: r } })),

      addResort: (r) => {
        const id = uid();
        set((s) => ({ resorts: [...s.resorts, { ...r, id }] }));
        return id;
      },
      updateResort: (id, patch) =>
        set((s) => ({ resorts: s.resorts.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeResort: (id) => set((s) => ({ resorts: s.resorts.filter((r) => r.id !== id) })),
      upsertAirport: (a) =>
        set((s) => ({
          airports: s.airports.some((x) => x.iata === a.iata)
            ? s.airports.map((x) => (x.iata === a.iata ? a : x))
            : [...s.airports, a],
        })),

      createTrip: (resortId) => {
        const { resorts, season, friends } = get();
        const resort = resorts.find((r) => r.id === resortId);
        const dates = season.chosenDates;
        const trip: Trip = {
          id: uid(),
          name: resort ? resort.name : 'New trip',
          resortId,
          dates,
          attendeeIds: dates ? freeForRange(friends, dates) : friends.map((f) => f.id),
          status: 'draft',
          flights: [],
          transfers: [],
          hotels: [],
          liftPassPerPerson: 0,
          selectedComboId: null,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ trips: [...s.trips, trip] }));
        return trip.id;
      },
      updateTrip: (id, patch) => set((s) => ({ trips: mapTrip(s.trips, id, (t) => ({ ...t, ...patch })) })),
      removeTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
      saveOption: (tripId, kind, option) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => {
            const list = t[kind] as OptionOf<typeof kind>[];
            const exists = list.some((o) => o.id === option.id);
            return { ...t, [kind]: exists ? list.map((o) => (o.id === option.id ? option : o)) : [...list, option] };
          }),
        })),
      removeOption: (tripId, kind, optionId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            [kind]: (t[kind] as { id: string }[]).filter((o) => o.id !== optionId),
            // a removed option invalidates the chosen combo if it was part of it
            selectedComboId: t.selectedComboId?.split('|').includes(optionId) ? null : t.selectedComboId,
          })),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      importData: (d) => set({ ...d }),
      resetAll: () => set(createInitialData()),
    }),
    {
      name: 'ski-planner',
      version: 1,
      partialize: ({ version, settings, friends, season, airports, resorts, trips }) =>
        ({ version, settings, friends, season, airports, resorts, trips }) as AppData,
    },
  ),
);

export const useResort = (id: string | undefined) => useStore((s) => s.resorts.find((r) => r.id === id));
export const useTrip = (id: string | undefined) => useStore((s) => s.trips.find((t) => t.id === id));
