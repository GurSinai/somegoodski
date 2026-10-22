import type { Trip, Vacation } from '../types';
import { buildCombos, type Combo } from './combinations';
import { pricedTrip } from '../store/useStore';

/** Cheapest complete combo of a trip (falls back to incomplete ones if none are complete). */
export function cheapestCombo(trip: Trip, vacation: Vacation): Combo | null {
  const combos = buildCombos(pricedTrip(trip, vacation));
  const complete = combos.filter((c) => !c.incomplete);
  return (complete.length ? complete : combos).reduce<Combo | null>((best, c) => (!best || c.perPerson.total < best.perPerson.total ? c : best), null);
}

export function selectedCombo(trip: Trip, vacation: Vacation): Combo | null {
  if (!trip.selectedComboId) return null;
  return buildCombos(pricedTrip(trip, vacation)).find((c) => c.id === trip.selectedComboId) ?? null;
}

/** The vacation's final plan: its chosen resort and that resort's chosen combination. */
export function vacationPlan(vacation: Vacation, trips: Trip[]): { trip: Trip; combo: Combo } | null {
  const trip = trips.find((t) => t.id === vacation.selectedTripId);
  const combo = trip && selectedCombo(trip, vacation);
  return trip && combo ? { trip, combo } : null;
}
