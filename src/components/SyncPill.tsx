import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Check, CloudOff, Loader2, Settings2, Users2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { isConnected, useCollab } from '../collab/useCollab';
import { cx } from '../lib/util';
import CollabDrawer from './CollabDrawer';
import WhoIsWho from './WhoIsWho';

/** Header control: sync status, recent changes from the partner, and the collaboration settings. */
export default function SyncPill() {
  const c = useCollab();
  const [open, setOpen] = useState(false);
  const connected = isConnected(c);
  const sharing = Object.keys(c.shared).length > 0;

  const look = !connected || !sharing
    ? { icon: <Users2 size={15} />, label: 'Collaborate', cls: 'text-slate-500 hover:bg-slate-100' }
    : c.status === 'syncing'
      ? { icon: <Loader2 size={15} className="animate-spin" />, label: 'Syncing', cls: 'bg-sky-50 text-sky-700' }
      : c.status === 'offline'
        ? { icon: <CloudOff size={15} />, label: c.waiting ? `Offline · ${c.waiting} waiting` : 'Offline', cls: 'bg-amber-50 text-amber-700' }
        : c.status === 'error'
          ? { icon: <AlertTriangle size={15} />, label: 'Sync error', cls: 'bg-rose-50 text-rose-600' }
          : { icon: <Check size={15} />, label: 'Synced', cls: 'bg-emerald-50 text-emerald-700' };

  const onClick = () => {
    if (!connected || !sharing) return c.setDrawerOpen(true);
    setOpen((o) => !o);
    c.markRead();
  };

  return (
    <div className="relative">
      <button onClick={onClick} className={cx('relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition', look.cls)} title="Plan together with another planner">
        {look.icon}
        <span className="hidden sm:inline">{look.label}</span>
        {(c.unread > 0 || c.pendingMatches.length > 0) && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {c.unread + c.pendingMatches.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-sm font-bold">Shared planning</div>
                <div className="text-xs text-slate-400">{c.repo}</div>
              </div>
              <button onClick={() => { setOpen(false); c.setDrawerOpen(true); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Collaboration settings">
                <Settings2 size={16} />
              </button>
            </div>
            {c.error && <div className="bg-rose-50 px-4 py-2 text-xs text-rose-600">{c.error}</div>}
            {Object.values(c.shared).some((e) => e.paused) && (
              <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700">{Object.values(c.shared).find((e) => e.paused)!.paused}</div>
            )}
            {c.pendingMatches.length > 0 && (
              <div className="bg-sky-50 px-4 py-2 text-xs text-sky-800">
                {c.pendingMatches.length} new friend{c.pendingMatches.length > 1 ? 's' : ''} to match. See “Who’s who?”.
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {c.notices.length === 0 && <div className="px-4 py-6 text-center text-xs text-slate-400">No changes yet.</div>}
              {c.notices.map((n) => (
                <div key={n.id} className="border-b border-slate-50 px-4 py-2.5 text-xs">
                  <div className="text-slate-700">{n.text}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{formatDistanceToNow(new Date(n.at), { addSuffix: true })}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* portalled: the header's backdrop blur would otherwise clip these fixed overlays */}
      {createPortal(
        <>
          <CollabDrawer open={c.drawerOpen} onClose={() => c.setDrawerOpen(false)} />
          <WhoIsWho />
        </>,
        document.body,
      )}
    </div>
  );
}
