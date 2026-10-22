import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Airport, AppData, DateRange, Expense, FlightOption, Friend, HotelOption, ISODate, Leg, LegChoice, LuggageItem, PricedTrip,
  RentalShop, Resort, Settings, SkiPassOption, TransferOption, Trip, Vacation, Winter, WinterFriend, WinterParticipant,
} from '../types';
import { createInitialData, defaultSeason } from '../data/seed';
import { freeForRange } from '../lib/availability';
import { FRIEND_COLORS, uid } from '../lib/util';
import { CURRENT_VERSION, migrate } from './migrate';

export type OptionKind = 'flights' | 'transfers' | 'hotels' | 'skiPasses' | 'shops' | 'expenses';
type OptionMap = { flights: FlightOption; transfers: TransferOption; hotels: HotelOption; skiPasses: SkiPassOption; shops: RentalShop; expenses: Expense };
type OptionOf<K extends OptionKind> = OptionMap[K];

interface Actions {
  // friend profiles (shared across winters)
  addFriend: (f: Friend, joinWinterId?: string) => string;
  updateFriend: (id: string, patch: Partial<Friend>) => void;
  removeFriend: (id: string) => void;
  // winters
  createWinter: (year: number) => string;
  updateWinter: (id: string, patch: Partial<Pick<Winter, 'start' | 'end'>>) => void;
  removeWinter: (id: string) => void;
  setActiveWinter: (id: string | null) => void;
  setInWinter: (winterId: string, friendId: string, inWinter: boolean) => void;
  updateParticipant: (winterId: string, friendId: string, patch: Partial<Omit<WinterParticipant, 'friendId'>>) => void;
  setAvailability: (winterId: string, friendId: string, days: ISODate[], available: boolean) => void;
  // vacations
  createVacation: (winterId: string, dates?: DateRange | null) => string;
  updateVacation: (id: string, patch: Partial<Vacation>) => void;
  removeVacation: (id: string) => void;
  setLuggage: (vacationId: string, luggage: LuggageItem[]) => void;
  // trips (candidate resorts)
  createTrip: (vacationId: string, resortId: string) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
  saveOption: <K extends OptionKind>(tripId: string, kind: K, option: OptionOf<K>) => void;
  removeOption: (tripId: string, kind: OptionKind, optionId: string) => void;
  /** null clears the override (back to the group default). */
  setFlightChoice: (tripId: string, friendId: string, leg: Leg, choice: LegChoice | null) => void;
  setPassChoice: (tripId: string, friendId: string, passId: string | null) => void;
  setShopChoice: (tripId: string, friendId: string, shopId: string | null) => void;
  // resorts & airports
  addResort: (r: Omit<Resort, 'id'>) => string;
  updateResort: (id: string, patch: Partial<Resort>) => void;
  removeResort: (id: string) => void;
  upsertAirport: (a: Airport) => void;
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
  gear: { skis: null, snowboard: null, pieces: [] },
  lessons: { wanted: false, type: 'group', days: 0, budgetPerDay: 0 },
  defaultBudget: 0,
  notes: '',
  ...patch,
});

const mapById = <T extends { id: string }>(list: T[], id: string, fn: (t: T) => T) => list.map((t) => (t.id === id ? fn(t) : t));

/** Sets or (with null) removes a key. */
function withKey(rec: Record<string, string>, key: string, value: string | null): Record<string, string> {
  const next = { ...rec };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
}

const mapParticipant = (w: Winter, friendId: string, fn: (p: WinterParticipant) => WinterParticipant): Winter => ({
  ...w,
  participants: w.participants.map((p) => (p.friendId === friendId ? fn(p) : p)),
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addFriend: (f, joinWinterId) => {
        set((s) => ({
          friends: [...s.friends, f],
          winters: joinWinterId
            ? mapById(s.winters, joinWinterId, (w) => ({
                ...w,
                participants: [...w.participants, { friendId: f.id, availability: [], budget: f.defaultBudget }],
              }))
            : s.winters,
        }));
        return f.id;
      },
      updateFriend: (id, patch) => set((s) => ({ friends: mapById(s.friends, id, (f) => ({ ...f, ...patch })) })),
      removeFriend: (id) =>
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== id),
          winters: s.winters.map((w) => ({ ...w, participants: w.participants.filter((p) => p.friendId !== id) })),
          vacations: s.vacations.map((v) => ({ ...v, attendeeIds: v.attendeeIds.filter((a) => a !== id) })),
        })),

      createWinter: (year) => {
        const existing = get().winters.find((w) => w.year === year);
        if (existing) {
          set((s) => ({ settings: { ...s.settings, activeWinterId: existing.id } }));
          return existing.id;
        }
        // carry over everyone from the most recent winter; they can be removed on the People page
        const prev = [...get().winters].sort((a, b) => b.year - a.year)[0];
        const friends = get().friends;
        const ids = prev ? prev.participants.map((p) => p.friendId) : friends.map((f) => f.id);
        const winter: Winter = {
          id: uid(),
          year,
          ...defaultSeason(year),
          participants: ids.map((friendId) => ({
            friendId,
            availability: [],
            budget: friends.find((f) => f.id === friendId)?.defaultBudget ?? 0,
          })),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ winters: [...s.winters, winter], settings: { ...s.settings, activeWinterId: winter.id } }));
        return winter.id;
      },
      updateWinter: (id, patch) => set((s) => ({ winters: mapById(s.winters, id, (w) => ({ ...w, ...patch })) })),
      removeWinter: (id) =>
        set((s) => {
          const vacationIds = new Set(s.vacations.filter((v) => v.winterId === id).map((v) => v.id));
          return {
            winters: s.winters.filter((w) => w.id !== id),
            vacations: s.vacations.filter((v) => !vacationIds.has(v.id)),
            trips: s.trips.filter((t) => !vacationIds.has(t.vacationId)),
            settings: { ...s.settings, activeWinterId: s.settings.activeWinterId === id ? null : s.settings.activeWinterId },
          };
        }),
      setActiveWinter: (id) => set((s) => ({ settings: { ...s.settings, activeWinterId: id } })),
      setInWinter: (winterId, friendId, inWinter) =>
        set((s) => ({
          winters: mapById(s.winters, winterId, (w) => {
            const has = w.participants.some((p) => p.friendId === friendId);
            if (inWinter && !has) {
              const budget = s.friends.find((f) => f.id === friendId)?.defaultBudget ?? 0;
              return { ...w, participants: [...w.participants, { friendId, availability: [], budget }] };
            }
            if (!inWinter && has) return { ...w, participants: w.participants.filter((p) => p.friendId !== friendId) };
            return w;
          }),
          vacations: inWinter
            ? s.vacations
            : s.vacations.map((v) => (v.winterId === winterId ? { ...v, attendeeIds: v.attendeeIds.filter((a) => a !== friendId) } : v)),
        })),
      updateParticipant: (winterId, friendId, patch) =>
        set((s) => ({ winters: mapById(s.winters, winterId, (w) => mapParticipant(w, friendId, (p) => ({ ...p, ...patch }))) })),
      setAvailability: (winterId, friendId, days, available) =>
        set((s) => ({
          winters: mapById(s.winters, winterId, (w) =>
            mapParticipant(w, friendId, (p) => {
              const next = new Set(p.availability);
              days.forEach((d) => (available ? next.add(d) : next.delete(d)));
              return { ...p, availability: [...next].sort() };
            }),
          ),
        })),

      createVacation: (winterId, dates = null) => {
        const s = get();
        const winter = s.winters.find((w) => w.id === winterId);
        const people = winter ? winterFriends(s.friends, winter) : [];
        const count = s.vacations.filter((v) => v.winterId === winterId).length;
        const vacation: Vacation = {
          id: uid(),
          winterId,
          name: `Vacation ${count + 1}`,
          dates,
          attendeeIds: dates ? freeForRange(people, dates) : people.map((f) => f.id),
          status: 'planning',
          selectedTripId: null,
          luggage: [],
          createdAt: new Date().toISOString(),
        };
        set((st) => ({ vacations: [...st.vacations, vacation] }));
        return vacation.id;
      },
      updateVacation: (id, patch) => set((s) => ({ vacations: mapById(s.vacations, id, (v) => ({ ...v, ...patch })) })),
      removeVacation: (id) =>
        set((s) => ({ vacations: s.vacations.filter((v) => v.id !== id), trips: s.trips.filter((t) => t.vacationId !== id) })),
      setLuggage: (vacationId, luggage) => set((s) => ({ vacations: mapById(s.vacations, vacationId, (v) => ({ ...v, luggage })) })),

      createTrip: (vacationId, resortId) => {
        const resort = get().resorts.find((r) => r.id === resortId);
        const trip: Trip = {
          id: uid(),
          vacationId,
          resortId,
          name: resort ? resort.name : 'New trip',
          flights: [],
          transfers: [],
          hotels: [],
          skiPasses: [],
          shops: [],
          expenses: [],
          flightChoice: {},
          passChoice: {},
          shopChoice: {},
          selectedComboId: null,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ trips: [...s.trips, trip] }));
        return trip.id;
      },
      updateTrip: (id, patch) => set((s) => ({ trips: mapById(s.trips, id, (t) => ({ ...t, ...patch })) })),
      removeTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          vacations: s.vacations.map((v) => (v.selectedTripId === id ? { ...v, selectedTripId: null } : v)),
        })),
      saveOption: (tripId, kind, option) =>
        set((s) => ({
          trips: mapById(s.trips, tripId, (t) => {
            const list = t[kind] as OptionOf<typeof kind>[];
            const exists = list.some((o) => o.id === option.id);
            return { ...t, [kind]: exists ? list.map((o) => (o.id === option.id ? option : o)) : [...list, option] };
          }),
        })),
      removeOption: (tripId, kind, optionId) =>
        set((s) => ({
          trips: mapById(s.trips, tripId, (t) => ({
            ...t,
            [kind]: (t[kind] as { id: string }[]).filter((o) => o.id !== optionId),
            // a removed option invalidates the chosen combo if it was part of it
            selectedComboId: t.selectedComboId?.split('|').includes(optionId) ? null : t.selectedComboId,
          })),
        })),
      setFlightChoice: (tripId, friendId, leg, choice) =>
        set((s) => ({
          trips: mapById(s.trips, tripId, (t) => {
            const mine = { ...t.flightChoice[friendId] };
            if (choice === null) delete mine[leg];
            else mine[leg] = choice;
            return { ...t, flightChoice: { ...t.flightChoice, [friendId]: mine } };
          }),
        })),
      setPassChoice: (tripId, friendId, passId) =>
        set((s) => ({ trips: mapById(s.trips, tripId, (t) => ({ ...t, passChoice: withKey(t.passChoice, friendId, passId) })) })),
      setShopChoice: (tripId, friendId, shopId) =>
        set((s) => ({ trips: mapById(s.trips, tripId, (t) => ({ ...t, shopChoice: withKey(t.shopChoice, friendId, shopId) })) })),

      addResort: (r) => {
        const id = uid();
        set((s) => ({ resorts: [...s.resorts, { ...r, id }] }));
        return id;
      },
      updateResort: (id, patch) => set((s) => ({ resorts: mapById(s.resorts, id, (r) => ({ ...r, ...patch })) })),
      removeResort: (id) => set((s) => ({ resorts: s.resorts.filter((r) => r.id !== id) })),
      upsertAirport: (a) =>
        set((s) => ({
          airports: s.airports.some((x) => x.iata === a.iata)
            ? s.airports.map((x) => (x.iata === a.iata ? a : x))
            : [...s.airports, a],
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      importData: (d) => set({ ...d }),
      resetAll: () => set(createInitialData()),
    }),
    {
      name: 'ski-planner',
      version: CURRENT_VERSION,
      migrate: (persisted, version) => migrate(persisted, version) as Store,
      partialize: ({ version, settings, friends, winters, vacations, airports, resorts, trips }) =>
        ({ version, settings, friends, winters, vacations, airports, resorts, trips }) as AppData,
    },
  ),
);

/** Profiles of the friends in a winter, merged with that winter's availability and budget. */
export function winterFriends(friends: Friend[], winter: Winter): WinterFriend[] {
  return winter.participants.flatMap((p) => {
    const f = friends.find((x) => x.id === p.friendId);
    return f ? [{ ...f, availability: p.availability, budget: p.budget }] : [];
  });
}

export const pricedTrip = (trip: Trip, vacation: Vacation | undefined): PricedTrip => ({
  ...trip,
  dates: vacation?.dates ?? null,
  attendeeIds: vacation?.attendeeIds ?? [],
  luggage: vacation?.luggage ?? [],
});

export const useWinter = (id: string | undefined) => useStore((s) => s.winters.find((w) => w.id === id));
export const useVacation = (id: string | undefined) => useStore((s) => s.vacations.find((v) => v.id === id));
export const useResort = (id: string | undefined) => useStore((s) => s.resorts.find((r) => r.id === id));
export const useTrip = (id: string | undefined) => useStore((s) => s.trips.find((t) => t.id === id));
export const useActiveWinter = () => useStore((s) => s.winters.find((w) => w.id === s.settings.activeWinterId));

export function useWinterFriends(winter: Winter | undefined): WinterFriend[] {
  const friends = useStore((s) => s.friends);
  return useMemo(() => (winter ? winterFriends(friends, winter) : []), [friends, winter]);
}

export function useVacationsOf(winterId: string | undefined): Vacation[] {
  const vacations = useStore((s) => s.vacations);
  return useMemo(() => vacations.filter((v) => v.winterId === winterId), [vacations, winterId]);
}

export function useTripsOf(vacationId: string | undefined): Trip[] {
  const trips = useStore((s) => s.trips);
  return useMemo(() => trips.filter((t) => t.vacationId === vacationId), [trips, vacationId]);
}
