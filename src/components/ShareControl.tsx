import { formatDistanceToNowStrict } from 'date-fns';
import { FileDown, Loader2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { shareVacation, syncNow } from '../collab/engine';
import { exportVacationFile } from '../collab/fileShare';
import { preloadFirebase, signIn } from '../collab/firebase';
import { isFirebaseConfigured } from '../collab/firebaseConfig';
import { useCollab } from '../collab/useCollab';
import InviteButton from './InviteButton';

/** On the vacation hero: share it with your partner (live, or as a file). */
export default function ShareControl({ vacationId }: { vacationId: string }) {
  const c = useCollab();
  const entry = c.shared[vacationId];
  const [busy, setBusy] = useState(false);

  // ready Firebase before "Share with partner" is tapped (phones block popups opened after a delay)
  useEffect(() => {
    if (!entry && !c.user && isFirebaseConfigured) preloadFirebase();
  }, [entry, c.user]);

  // opening a shared vacation pulls the latest right away
  useEffect(() => {
    if (entry) void syncNow(vacationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacationId, Boolean(entry)]);

  const fileButton = (
    <button onClick={() => exportVacationFile(vacationId)} className="rounded-full p-2 text-white/70 hover:bg-white/20 hover:text-white" title="Export vacation file (send it to a partner who imports it)">
      <FileDown size={16} />
    </button>
  );

  if (entry) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => c.setDrawerOpen(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/30" title="Shared vacations">
          <Share2 size={13} /> <span className="hidden sm:inline">Shared · </span>{entry.paused ? 'paused' : `synced ${formatDistanceToNowStrict(new Date(entry.lastSyncAt), { addSuffix: true })}`}
        </button>
        {c.user && <InviteButton vacationId={vacationId} light />}
        {fileButton}
      </div>
    );
  }

  const share = async () => {
    if (!isFirebaseConfigured) return c.setDrawerOpen(true);
    setBusy(true);
    try {
      if (!useCollab.getState().user) await signIn();
      if (!useCollab.getState().user) return; // sign-in closed or redirected
      await shareVacation(vacationId);
    } catch (e) {
      alert(`Could not share: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={share} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-sky-50">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Share with partner
      </button>
      {fileButton}
    </div>
  );
}
