import { addDays, differenceInCalendarDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import type { DateRange, ISODate } from '../types';

export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const fromISO = (s: ISODate): Date => parseISO(s);

export const addDaysISO = (s: ISODate, n: number): ISODate => toISO(addDays(fromISO(s), n));

export function daysBetween(start: ISODate, end: ISODate): ISODate[] {
  if (end < start) [start, end] = [end, start];
  return eachDayOfInterval({ start: fromISO(start), end: fromISO(end) }).map(toISO);
}

export const nightsOf = (r: DateRange | null): number =>
  r ? Math.max(0, differenceInCalendarDays(fromISO(r.end), fromISO(r.start))) : 0;

// Ski days for a trip: arrival day is lost to travel, so nights - 1, at least 1
export const skiDaysOf = (r: DateRange | null): number => Math.max(1, nightsOf(r) - 1);

export function formatRange(r: DateRange | null): string {
  if (!r) return 'No dates';
  const s = fromISO(r.start);
  const e = fromISO(r.end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${format(s, sameYear ? 'EEE d MMM' : 'EEE d MMM yyyy')} → ${format(e, 'EEE d MMM yyyy')}`;
}
