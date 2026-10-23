import { formatDistanceToNow } from 'date-fns';
import { Loader2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { shareVacation, syncNow } from '../collab/engine';
import { isConnected, useCollab } from '../collab/useCollab';

/** On the vacation hero: share it with your partner, or see that it's syncing. */
export default function ShareControl({ vacationId }: { vacationId: string }) {
  const c = useCollab();
  const entry = c.shared[vacationId];
  const [busy, setBusy] = useState(false);

  // opening a shared vacation pulls the latest right away
  useEffect(() => {
    if (entry) void syncNow(vacationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacationId, Boolean(entry)]);

  if (entry) {
    return (
      <button onClick={() => c.setDrawerOpen(true)} className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/30" title="Collaboration settings">
        <Share2 size={13} /> Shared · {entry.paused ? 'paused' : `synced ${formatDistanceToNow(new Date(entry.lastSyncAt), { addSuffix: true })}`}
      </button>
    );
  }

  const share = async () => {
    if (!isConnected(c)) return c.setDrawerOpen(true);
    setBusy(true);
    try {
      await shareVacation(vacationId);
    } catch (e) {
      alert(`Could not share: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={share} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-sky-50">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Share with partner
    </button>
  );
}
