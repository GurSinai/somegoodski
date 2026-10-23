import { Link2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { linkFriends } from '../collab/engine';
import { PROFILE_FIELDS } from '../collab/friends';
import { useCollab } from '../collab/useCollab';
import { gearLabel, skill, sport } from '../lib/labels';
import { cx, money } from '../lib/util';
import { useStore } from '../store/useStore';
import type { Friend } from '../types';
import { Avatar, Button, Drawer } from './ui';

type Field = (typeof PROFILE_FIELDS)[number];
const LABELS: Record<Field, string> = {
  name: 'Name', color: 'Color', skillLevel: 'Skill', sport: 'Rides', gear: 'Rents', lessons: 'Lessons',
  defaultBudget: 'Default budget', defaultBudgetCurrency: 'Budget currency', notes: 'Notes',
};

function show(f: Friend, k: Field) {
  switch (k) {
    case 'color': return <span className="inline-block h-4 w-4 rounded-full align-middle" style={{ background: f.color }} />;
    case 'skillLevel': return skill(f.skillLevel).label;
    case 'sport': return `${sport(f.sport).emoji} ${sport(f.sport).label}`;
    case 'gear': return [f.gear.equipment && `${f.sport === 'snowboard' ? 'Snowboard' : 'Skis'} (${f.gear.equipment})`, ...f.gear.pieces.map(gearLabel)].filter(Boolean).join(', ') || 'Own gear';
    case 'lessons': return f.lessons.wanted ? `${f.lessons.days} days ${f.lessons.type}` : 'None';
    case 'defaultBudget': return f.defaultBudget ? money(f.defaultBudget, f.defaultBudgetCurrency) : '—';
    default: return String(f[k] || '—');
  }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * "Who's who?": a friend arrived from your partner with a name like one of yours.
 * Link them (one shared profile, you pick the values) or keep them as two people.
 */
export default function WhoIsWho() {
  const pending = useCollab((s) => s.pendingMatches);
  const resolvePending = useCollab((s) => s.resolvePending);
  const shared = useCollab((s) => s.shared);
  const friends = useStore((s) => s.friends);
  const match = pending.find((m) => friends.some((f) => f.id === m.friendId));
  const theirs = friends.find((f) => f.id === match?.friendId);
  const [localId, setLocalId] = useState('');
  const [pick, setPick] = useState<Partial<Record<Field, 'mine' | 'theirs'>>>({});
  const [dismissed, setDismissed] = useState(false);

  // stale entries (friend gone) are dropped
  useEffect(() => {
    pending.filter((m) => !friends.some((f) => f.id === m.friendId)).forEach((m) => resolvePending(m.friendId));
  }, [pending, friends, resolvePending]);
  useEffect(() => {
    setLocalId(match?.localId ?? '');
    setPick({});
  }, [match?.friendId, match?.localId]);

  const sharedIds = useMemo(() => new Set(Object.values(shared).flatMap((e) => e.base.friends.map((f) => f.id))), [shared]);
  const candidates = friends.filter((f) => f.id !== theirs?.id && !sharedIds.has(f.id));
  const mine = friends.find((f) => f.id === localId);
  const diff = mine && theirs ? PROFILE_FIELDS.filter((k) => !same(mine[k], theirs[k])) : [];
  if (!match || !theirs || dismissed) {
    return pending.length > 0 && dismissed ? (
      <button onClick={() => setDismissed(false)} className="fixed bottom-4 right-4 z-40 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-lift">
        Who’s who? ({pending.length})
      </button>
    ) : null;
  }

  const choice = (k: Field) => pick[k] ?? 'mine';
  const link = () => {
    if (!mine) return;
    const profile = { ...theirs };
    for (const k of PROFILE_FIELDS) if (choice(k) === 'mine') (profile as Record<Field, unknown>)[k] = mine[k];
    linkFriends(mine.id, theirs.id, profile);
  };

  return (
    <Drawer
      open
      onClose={() => setDismissed(true)}
      title="Who’s who?"
      footer={
        <>
          <Button onClick={() => resolvePending(theirs.id)}><UserPlus size={15} /> Different person</Button>
          <Button variant="primary" disabled={!mine} onClick={link}><Link2 size={15} /> Same person, link</Button>
        </>
      }
    >
      <p className="text-sm text-slate-500">
        Your partner’s vacation includes <b>{theirs.name}</b>. Is that one of your friends? Friends are matched by a hidden id, never by name, so nothing merges unless you say so.
      </p>
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <Avatar name={theirs.name} color={theirs.color} size={36} />
        <div className="text-sm"><b>{theirs.name}</b> <span className="text-slate-400">from your partner</span></div>
      </div>
      <label className="block text-sm">
        <span className="label">Same person as</span>
        <select className="input" value={localId} onChange={(e) => { setLocalId(e.target.value); setPick({}); }}>
          <option value="">Pick one of your friends…</option>
          {candidates.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      {mine && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">{diff.length ? 'Pick the details to keep' : 'Profiles match'}</span>
            {diff.length > 0 && (
              <div className="flex gap-1 text-xs">
                <button className="rounded-full px-2 py-0.5 hover:bg-slate-100" onClick={() => setPick(Object.fromEntries(diff.map((k) => [k, 'mine'])))}>All mine</button>
                <button className="rounded-full px-2 py-0.5 hover:bg-slate-100" onClick={() => setPick(Object.fromEntries(diff.map((k) => [k, 'theirs'])))}>All theirs</button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {diff.map((k) => (
              <div key={k} className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 text-sm">
                <span className="text-xs text-slate-500">{LABELS[k]}</span>
                {(['mine', 'theirs'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setPick((p) => ({ ...p, [k]: side }))}
                    className={cx('truncate rounded-xl border px-2.5 py-1.5 text-left text-xs transition', choice(k) === side ? 'border-sky-400 bg-sky-50 font-semibold text-sky-900' : 'border-slate-100 text-slate-500 hover:border-slate-300')}
                  >
                    <span className="mr-1 text-[10px] uppercase text-slate-400">{side === 'mine' ? 'Yours' : 'Theirs'}</span> {show(side === 'mine' ? mine : theirs, k)}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Linking makes one shared {theirs.name}: their trips, availability and lesson spots stay attached, and later profile edits sync both ways. You can unlink from the People page.
          </p>
        </div>
      )}
    </Drawer>
  );
}
