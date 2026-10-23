import { formatDistanceToNow } from 'date-fns';
import { Check, ExternalLink, Github, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinVacation, listRemote, stopSharing, syncNow, type RemoteVacation } from '../collab/engine';
import { checkRepo } from '../collab/github';
import { isConnected, useCollab } from '../collab/useCollab';
import { formatRange } from '../lib/dates';
import { useStore } from '../store/useStore';
import { Button, Drawer, Field } from './ui';

/** Connect a private GitHub repo, join vacations your partner shared, manage your shared ones. */
export default function CollabDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useCollab();
  const vacations = useStore((s) => s.vacations);
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ repo: c.repo, token: c.token, displayName: c.displayName });
  const [check, setCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'error'; text?: string }>({ state: 'idle' });
  const [remote, setRemote] = useState<RemoteVacation[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const connected = isConnected(c);

  useEffect(() => {
    if (open) setDraft({ repo: c.repo, token: c.token, displayName: c.displayName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const refresh = async () => {
    setRemote(null);
    try {
      setRemote(await listRemote());
    } catch (e) {
      setCheck({ state: 'error', text: (e as Error).message });
      setRemote([]);
    }
  };
  useEffect(() => {
    if (open && connected) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connected]);

  const connect = async () => {
    setCheck({ state: 'checking' });
    try {
      const repo = await checkRepo({ repo: draft.repo.trim(), token: draft.token.trim() });
      c.setConnection({ repo: draft.repo.trim(), token: draft.token.trim(), displayName: draft.displayName.trim() });
      setCheck({ state: 'ok', text: `Connected to ${repo.fullName}${repo.private ? '' : '. Warning: this repo is public!'}` });
    } catch (e) {
      setCheck({ state: 'error', text: (e as Error).message });
    }
  };

  const join = async (r: RemoteVacation) => {
    setBusy(r.vacationId);
    try {
      const { vacationId, winterId } = await joinVacation(r.path);
      onClose();
      navigate(`/w/${winterId}/v/${vacationId}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const nameOf = (id: string) => vacations.find((v) => v.id === id)?.name ?? 'Removed vacation';
  const changed = draft.repo !== c.repo || draft.token !== c.token || draft.displayName !== c.displayName;

  return (
    <Drawer open={open} onClose={onClose} title="Plan together">
      <p className="text-sm text-slate-500">
        Share a vacation with another SomeGoodSki planner through a private GitHub repo. You both edit its trips, options and riders.
        Changes sync both ways within seconds, and the repo keeps every version.
      </p>

      <section className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 font-bold"><Github size={16} /> GitHub connection</div>
        <Field label="Your name" hint="Shown to your partner, e.g. “Gur updated Tignes”.">
          <input className="input" value={draft.displayName} placeholder="Gur" onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
        </Field>
        <Field label="Private repo">
          <input className="input" value={draft.repo} placeholder="owner/ski-plans" onChange={(e) => setDraft({ ...draft, repo: e.target.value })} />
        </Field>
        <Field label="Access token">
          <input className="input font-mono text-xs" type="password" autoComplete="off" value={draft.token} placeholder="github_pat_…" onChange={(e) => setDraft({ ...draft, token: e.target.value })} />
        </Field>
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-sky-700">How do I get a token?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>One of you creates a <b>private</b> repo on GitHub (e.g. <code>ski-plans</code>) and invites the other as a collaborator.</li>
            <li>
              Each of you opens{' '}
              <a className="text-sky-600 hover:underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                GitHub → Fine-grained tokens <ExternalLink size={10} className="inline" />
              </a>.
            </li>
            <li>Resource owner: the repo’s owner. Repository access: <b>Only select repositories</b> → that repo.</li>
            <li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else.</li>
            <li>Generate, copy it here. It stays in this browser and is never included in exports.</li>
          </ol>
        </details>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" disabled={!draft.repo || !draft.token || check.state === 'checking'} onClick={connect}>
            {check.state === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {connected && !changed ? 'Test again' : 'Connect'}
          </Button>
          {connected && (
            <Button size="sm" variant="ghost" onClick={() => { c.setConnection({ token: '' }); setDraft({ ...draft, token: '' }); setCheck({ state: 'idle' }); }}>
              Disconnect
            </Button>
          )}
        </div>
        {check.text && <p className={check.state === 'ok' ? 'text-xs text-emerald-600' : 'text-xs text-rose-600'}>{check.text}</p>}
      </section>

      {connected && (
        <>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">Vacations on GitHub</h3>
              <button onClick={refresh} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Refresh"><RefreshCw size={14} /></button>
            </div>
            {remote === null && <p className="text-sm text-slate-400"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
            {remote?.length === 0 && <p className="text-sm text-slate-400">Nothing shared yet. Open a vacation and press <b>Share with partner</b>.</p>}
            <div className="space-y-2">
              {remote?.map((r) => {
                const mine = Boolean(c.shared[r.vacationId]);
                return (
                  <div key={r.path} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        Winter {r.winterYear} · {formatRange(r.dates)} · {r.people} riders
                      </div>
                      <div className="text-[11px] text-slate-400">{r.updatedBy}, {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</div>
                    </div>
                    {mine ? (
                      <span className="text-xs font-semibold text-emerald-600">Syncing ✓</span>
                    ) : (
                      <Button size="sm" variant="primary" disabled={busy === r.vacationId} onClick={() => join(r)}>
                        {busy === r.vacationId ? <Loader2 size={14} className="animate-spin" /> : null} Join
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {Object.keys(c.shared).length > 0 && (
            <section>
              <h3 className="mb-2 font-bold">Syncing here</h3>
              <div className="space-y-2">
                {Object.entries(c.shared).map(([id, e]) => (
                  <div key={id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="font-semibold">{nameOf(id)}</div>
                      <div className="text-xs text-slate-400">{e.paused ?? `Synced ${formatDistanceToNow(new Date(e.lastSyncAt), { addSuffix: true })}`}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => void syncNow(id)} title="Sync now"><RefreshCw size={13} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm(`Stop syncing “${nameOf(id)}”? Your copy stays here and your partner keeps theirs.`) && void stopSharing(id, false)}>
                        Stop syncing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Drawer>
  );
}
