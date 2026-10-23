import { CURRENCIES } from '../lib/fx';
import { cx } from '../lib/util';
import type { Currency } from '../types';

/** Compact ₪ / $ / € switch for the currency a price is entered in. */
export default function CurrencyPicker({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="inline-flex rounded-full border border-slate-100 bg-slate-100/70 p-0.5" role="radiogroup" aria-label="Currency">
      {CURRENCIES.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={value === c.value}
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cx(
            'rounded-full px-2.5 py-0.5 text-xs font-bold transition',
            value === c.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700',
          )}
        >
          {c.symbol} {c.value}
        </button>
      ))}
    </div>
  );
}
