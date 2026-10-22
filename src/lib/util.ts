import type { Range } from '../types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function money(n: number, currency: string, digits = 0): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(n);
  } catch {
    return `${Math.round(n)} ${currency}`;
  }
}

export const FRIEND_COLORS = [
  '#0ea5e9', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308',
  '#14b8a6', '#ec4899', '#6366f1', '#84cc16', '#f43f5e', '#06b6d4',
];

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const range = (min: number, max = min): Range => ({ min, max });
export const addRange = (a: Range, b: Range): Range => ({ min: a.min + b.min, max: a.max + b.max });
export const scaleRange = (r: Range, k: number): Range => ({ min: r.min * k, max: r.max * k });
export const isRange = (r: Range) => Math.round(r.max) !== Math.round(r.min);
export const mid = (r: Range) => (r.min + r.max) / 2;

/** "€1,200" or "€1,200–1,350" */
export function moneyRange(r: Range, currency: string): string {
  if (!isRange(r)) return money(r.min, currency);
  const max = money(r.max, currency).replace(/^[^\d-]+/, '');
  return `${money(r.min, currency)}–${max}`;
}
