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
