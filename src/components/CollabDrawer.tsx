import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, LogOut, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openShared, stopSharing, syncNow } from '../collab/engine';
import { listInvites, myMemberships, removeMember, revokeInvite, signIn, signOut, type Invite, type Membership } from '../collab/firebase';
import { isFirebaseConfigured } from '../collab/firebaseConfig';
import { useCollab } from '../collab/useCollab';
import { useStore } from '../store/useStore';
import ImportVacationButton from './ImportVacationButton';
import InviteButton from './InviteButton';
import { Avatar, Button, Drawer, Field } from './ui';

/** Sign in, see who you share each vacation with, manage invite links, open vacations from other devices. */
export default function CollabDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useCollab();
  const vacations = useStore((s) => s.vacations);
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [invites, setInvites] = useState<Record<string, Invite[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    if (!c.user) return;
    setMemberships(null);
    try {
      const list = await myMemberships();
      setMemberships(list);
      const inv: Record<string, Invite[]> = {};
      for (const m of list) inv[m.vacationId] = await listInvites(m.vacationId).catch(() => []);
      setInvites(inv);
    } catch (e) {
      console.warn(e);
      setMemberships([]);
    }
  };
  useEffect(() => {
    if (open && c.user) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, c.user?.uid]);

  const run = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await task();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const nameOf = (id: string) => vacations.find((v) => v.id === id)?.name ?? memberships?.find((m) => m.vacationId === id)?.name ?? 'Vacation';
  const here = Object.keys(c.shared);
  const elsewhere = memberships?.filter((m) => !c.shared[m.vacationId]) ?? [];

  return (
    <Drawer open={open} onClose={onClose} title="Plan together">
      <p className="text-sm text-slate-500">
        Share a vacation with another planner. Each of you adds your own friends, and everything else (trips, prices, picks) you edit together.
        Changes appear on both screens within a second.
      </p>

      {!isFirebaseConfigured ? (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          Live sharing isn’t set up in this copy of SomeGoodSki yet. You can still share a vacation as a file: use the file button on a vacation, then send it.
        </section>
      ) : !c.user ? (
        <section className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
          <div className="font-bold">Sign in to share live</div>
          <p className="text-xs text-slate-500">Your partner signs in too, then opens your invite link. Only people you invite can see a shared vacation.</p>
          <Button variant="primary" disabled={busy === 'signin'} onClick={() => run('signin', signIn)}>
            {busy === 'signin' ? <Loader2 size={15} className="animate-spin" /> : <GoogleMark />} Sign in with Google
          </Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
          <div className="flex items-center gap-3">
            {c.user.photo ? <img src={c.user.photo} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full" /> : <Avatar name={c.user.name} color="#0ea5e9" size={36} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{c.user.name}</div>
              <div className="truncate text-xs text-slate-400">{c.user.email}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => run('signout', signOut)}><LogOut size={14} /> Sign out</Button>
          </div>
          <Field label="Name your partner sees" hint="E.g. “Added by Gur”, “Gur updated Tignes”.">
            <input className="input" value={c.displayName} onChange={(e) => c.setDisplayName(e.target.value)} />
          </Field>
        </section>
      )}

      {c.user && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Shared vacations</h3>
            <button onClick={refresh} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Refresh"><RefreshCw size={14} /></button>
          </div>
          {here.length === 0 && <p className="text-sm text-slate-400">None yet. Open a vacation and press <b>Share with partner</b>.</p>}
          <div className="space-y-2">
            {here.map((id) => {
              const e = c.shared[id];
              const m = memberships?.find((x) => x.vacationId === id);
              return (
                <div key={id} className="space-y-2 rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">{nameOf(id)}</div>
                      <div className="text-xs text-slate-400">{e.paused ?? `Synced ${formatDistanceToNow(new Date(e.lastSyncAt), { addSuffix: true })}`}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => void syncNow(id)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Sync now"><RefreshCw size={13} /></button>
                      <InviteButton vacationId={id} />
                    </div>
                  </div>
                  {m && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.members.map((p) => (
                        <span key={p.uid} className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-slate-600">
                          <Avatar name={p.name} color={p.uid === c.user!.uid ? '#0ea5e9' : '#a855f7'} size={18} /> {p.uid === c.user!.uid ? 'You' : p.name}
                          {p.uid !== c.user!.uid && (
                            <button title={`Remove ${p.name}`} className="ml-0.5 text-slate-400 hover:text-rose-500"
                              onClick={() => confirm(`Remove ${p.name} from “${nameOf(id)}”? They keep their copy but stop receiving changes.`) && run(`rm${p.uid}`, () => removeMember(id, p.uid).then(refresh))}>
                              <X size={11} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {(invites[id] ?? []).length > 0 && (
                    <div className="space-y-1 text-xs text-slate-500">
                      {invites[id].map((inv) => (
                        <div key={inv.code} className="flex items-center justify-between gap-2">
                          <span>Invite link · works until {format(inv.expiresAt, 'd MMM')}</span>
                          <button className="font-semibold text-rose-500 hover:underline" onClick={() => run(`rv${inv.code}`, () => revokeInvite(id, inv.code).then(refresh))}>Revoke</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 border-t border-slate-50 pt-2">
                    <Button size="sm" variant="ghost" onClick={() => confirm(`Stop syncing “${nameOf(id)}” here? Your copy stays, and your partner keeps theirs.`) && run(`stop${id}`, () => stopSharing(id, false))}>
                      Stop syncing
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm(`Delete “${nameOf(id)}” for everyone? Your partner’s live copy stops syncing. Copies already on each device stay.`) && run(`del${id}`, () => stopSharing(id, true).then(refresh))}>
                      <Trash2 size={13} /> Delete for everyone
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {elsewhere.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 font-bold">On your other devices</h3>
              <div className="space-y-2">
                {elsewhere.map((m) => (
                  <div key={m.vacationId} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-slate-400">Winter {m.winterYear} · with {m.members.filter((p) => p.uid !== c.user!.uid).map((p) => p.name).join(', ') || 'just you'}</div>
                    </div>
                    <Button size="sm" variant="primary" disabled={busy === m.vacationId}
                      onClick={() => run(m.vacationId, async () => {
                        const r = await openShared(m.vacationId);
                        onClose();
                        navigate(`/w/${r.winterId}/v/${r.vacationId}`);
                      })}>
                      {busy === m.vacationId && <Loader2 size={13} className="animate-spin" />} Open here
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
          {memberships === null && <p className="mt-2 text-xs text-slate-400"><Loader2 size={12} className="mr-1 inline animate-spin" /> Loading…</p>}
        </section>
      )}

      <section className="rounded-2xl border border-dashed border-slate-200 p-4">
        <div className="mb-1 font-bold">Share as a file</div>
        <p className="mb-3 text-xs text-slate-500">
          No account needed: export a vacation (file button on its page), send the file, and your partner imports it. Send it back and forth, and both sides’ changes are merged each time.
        </p>
        <ImportVacationButton />
      </section>
    </Drawer>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="15" height="15" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
