import type { Currency, FxRates, Trip } from '../types';

export const CURRENCIES: { value: Currency; symbol: string; label: string }[] = [
  { value: 'ILS', symbol: '₪', label: 'Shekel' },
  { value: 'USD', symbol: '$', label: 'US dollar' },
  { value: 'EUR', symbol: '€', label: 'Euro' },
];
export const symbolOf = (c: Currency) => CURRENCIES.find((x) => x.value === c)?.symbol ?? c;

/** Used until the first successful fetch (approximate, Oct 2026). */
export const FALLBACK_RATES: FxRates = { rates: { EUR: 1, USD: 1.12, ILS: 3.49 }, date: '2026-10-23', fetchedAt: null };

/** Rates older than this are refreshed when the app opens. */
export const RATES_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type Converter = (amount: number, from: Currency) => number;

export function makeConverter(fx: FxRates, to: Currency): Converter {
  return (amount, from) => (from === to ? amount : (amount / fx.rates[from]) * fx.rates[to]);
}

/** A copy of the trip with every price converted to the converter's currency. */
export function convertTrip(trip: Trip, cv: Converter): Trip {
  return {
    ...trip,
    flights: trip.flights.map((f) => ({
      ...f,
      pricePerPerson: cv(f.pricePerPerson, f.currency),
      trolleyPrice: cv(f.trolleyPrice, f.currency),
      checkedPrice: cv(f.checkedPrice, f.currency),
    })),
    transfers: trip.transfers.map((t) => ({
      ...t,
      price: cv(t.price, t.currency),
      gas: t.gas && { ...t.gas, pricePerLiter: cv(t.gas.pricePerLiter, t.currency) },
    })),
    hotels: trip.hotels.map((h) => ({ ...h, price: cv(h.price, h.currency) })),
    skiPasses: trip.skiPasses.map((p) => ({ ...p, price: cv(p.price, p.currency) })),
    shops: trip.shops.map((s) => ({
      ...s,
      prices: Object.fromEntries(Object.entries(s.prices).map(([k, v]) => [k, cv(v as number, s.currency)])),
      lessons: s.lessons.map((l) => ({ ...l, pricePerPerson: cv(l.pricePerPerson, s.currency) })),
    })),
    expenses: trip.expenses.map((e) => ({ ...e, amount: { min: cv(e.amount.min, e.currency), max: cv(e.amount.max, e.currency) } })),
  };
}

/** Latest rates per 1 EUR, from open.er-api.com with Frankfurter (ECB) as a backup. */
export async function fetchRates(): Promise<FxRates> {
  const pick = (rates: Record<string, number>): Record<Currency, number> => {
    if (!rates.USD || !rates.ILS) throw new Error('rates missing');
    return { EUR: 1, USD: rates.USD, ILS: rates.ILS };
  };
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/EUR');
    const j = await r.json();
    return { rates: pick(j.rates), date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10), fetchedAt: new Date().toISOString() };
  } catch {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,ILS');
    const j = await r.json();
    return { rates: pick(j.rates), date: j.date, fetchedAt: new Date().toISOString() };
  }
}
