import { format } from 'date-fns';
import { Check, Link2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createInvite, type Invite } from '../collab/firebase';
import { useStore } from '../store/useStore';
import { cx } from '../lib/util';

/** Creates a fresh invite link for a shared vacation and copies it. */
export default function InviteButton({ vacationId, className, light }: { vacationId: string; className?: string; light?: boolean }) {
  const vacation = useStore((s) => s.vacations.find((v) => v.id === vacationId));
  const winter = useStore((s) => s.winters.find((w) => w.id === vacation?.winterId));
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);

  const make = async () => {
    if (!vacation || !winter) return;
    setBusy(true);
    try {
      const inv = await createInvite(vacationId, vacation.name, winter.year);
      setInvite(inv);
      try {
        await navigator.clipboard.writeText(inv.link);
        setCopied(true);
      } catch {
        setCopied(false); // clipboard blocked: the link is shown to copy by hand
      }
    } catch (e) {
      alert(`Couldn’t create an invite link: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx('relative', className)}>
      <button
        onClick={make}
        disabled={busy}
        className={cx(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition',
          light ? 'bg-white/20 text-white backdrop-blur hover:bg-white/30' : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
        )}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Invite link
      </button>
      {invite && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setInvite(null)} />
          <div className="animate-fade-up absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-4 text-left text-slate-700 shadow-lift">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-bold">
              {copied ? <><Check size={15} className="text-emerald-500" /> Link copied</> : 'Invite link'}
            </div>
            <p className="mb-2 text-xs text-slate-500">Send it to your partner. They sign in with Google and join. Works until {format(invite.expiresAt, 'd MMM')}.</p>
            <input readOnly value={invite.link} onFocus={(e) => e.target.select()} className="input py-1.5 font-mono text-[11px]" />
          </div>
        </>
      )}
    </div>
  );
}
