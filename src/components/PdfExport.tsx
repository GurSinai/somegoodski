import { AlertTriangle, Check, ExternalLink, FileDown, Loader2 } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { downloadPdf, type SavedPdf } from '../lib/pdf';
import type { Combo } from '../lib/combinations';
import { useStore } from '../store/useStore';
import type { Trip, Vacation, WinterFriend } from '../types';
import type { ReportData } from './Reports';
import { Button } from './ui';

/** Everything the PDF reports need for a vacation's chosen plan. */
export function useReportData(vacation: Vacation, plan: { trip: Trip; combo: Combo } | null, friends: WinterFriend[]): ReportData | null {
  const resorts = useStore((s) => s.resorts);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  if (!plan) return null;
  return {
    vacation,
    resort: resorts.find((r) => r.id === plan.trip.resortId),
    airport: airports.find((a) => a.iata === plan.combo.airport),
    combo: plan.combo,
    costs: plan.combo.costs,
    friends,
    currency,
  };
}

/** Runs one export at a time and remembers how the last one went. */
export function usePdfExport() {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, pages: ReactElement[], filename: string) => {
    setBusy(key);
    setError(null);
    try {
      setSaved(await downloadPdf(pages, filename));
    } catch (e) {
      setSaved(null);
      const msg = (e as Error).message || 'Unknown error';
      // the release server stops after 10 idle minutes; the page can't load code it hasn't fetched yet
      setError(/dynamically imported module|Failed to fetch|Importing a module script failed/i.test(msg)
        ? 'SomeGoodSki’s local server has stopped (it shuts down after 10 minutes without use). Double-click the SomeGoodSki shortcut to restart it, reload this page and try again.'
        : msg);
    }
    setBusy(null);
  };
  return { busy, saved, error, run };
}

export function PdfButton({ id, exporter, onClick, children, variant = 'secondary', size = 'md', className }: {
  id: string;
  exporter: ReturnType<typeof usePdfExport>;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'accent' | 'secondary' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <Button variant={variant} size={size} className={className} disabled={!!exporter.busy} onClick={onClick}>
      {exporter.busy === id ? <Loader2 size={size === 'sm' ? 13 : 15} className="animate-spin" /> : <FileDown size={size === 'sm' ? 13 : 15} />} {children}
    </Button>
  );
}

/** Confirms the download and always offers a direct link, in case the browser held the download back. */
export function PdfStatus({ exporter }: { exporter: ReturnType<typeof usePdfExport> }) {
  const { saved, error, busy } = exporter;
  if (busy) return <p className="text-xs text-slate-500">Creating the PDF…</p>;
  if (error) {
    return (
      <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Couldn’t create the PDF. {error}
      </p>
    );
  }
  if (!saved) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
      <Check size={13} /> Downloaded <b className="truncate">{saved.filename}</b>
      <a href={saved.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline">
        Open PDF <ExternalLink size={11} />
      </a>
    </p>
  );
}
