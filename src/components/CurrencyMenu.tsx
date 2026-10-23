import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CURRENCIES, fetchRates, makeConverter, RATES_MAX_AGE_MS, symbolOf } from '../lib/fx';
import { cx } from '../lib/util';
import { useStore } from '../store/useStore';

/** Refreshes exchange rates when the app opens if they're missing or stale. */
export function useFxAutoRefresh() {
  const fx = useStore((s) => s.settings.fx);
  const updateSettings = useStore((s) => s.updateSettings);
  useEffect(() => {
    const age = fx.fetchedAt ? Date.now() - new Date(fx.fetchedAt).getTime() : Infinity;
    if (age < RATES_MAX_AGE_MS) return;
    fetchRates().then((next) => updateSettings({ fx: next })).catch(() => {}); // offline: keep the last known rates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Header control: pick the display currency, see the rates in use, refresh them. */
export default function CurrencyMenu() {
  const currency = useStore((s) => s.settings.currency);
  const fx = useStore((s) => s.settings.fx);
  const updateSettings = useStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const toDisplay = makeConverter(fx, currency);

  const refresh = async () => {
    setBusy(true);
    setError(false);
    try {
      updateSettings({ fx: await fetchRates() });
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-300"
        title="Display currency and exchange rates"
      >
        {symbolOf(currency)} {currency} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-lift">
            <div className="label">Show prices in</div>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateSettings({ currency: c.value })}
                  className={cx(
                    'rounded-xl border py-2 text-sm font-bold transition',
                    currency === c.value ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-100 text-slate-500 hover:border-slate-200',
                  )}
                >
                  {c.symbol} {c.value}
                </button>
              ))}
            </div>
            <div className="label">Exchange rates</div>
            <div className="space-y-1 text-sm">
              {CURRENCIES.filter((c) => c.value !== currency).map((c) => (
                <div key={c.value} className="flex justify-between">
                  <span className="text-slate-500">1 {c.symbol} {c.value}</span>
                  <span className="font-semibold">{symbolOf(currency)}{toDisplay(1, c.value).toFixed(3)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
              <span>
                {fx.fetchedAt ? `Updated ${formatDistanceToNow(new Date(fx.fetchedAt), { addSuffix: true })}` : 'Approximate built-in rates'}
                {error && <span className="block text-rose-500">Couldn’t reach the rate service</span>}
              </span>
              <button onClick={refresh} disabled={busy} className="flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-sky-600 hover:bg-sky-50 disabled:opacity-50">
                <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
