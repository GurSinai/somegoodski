import { useEffect, useState } from 'react';
import { GEAR_PIECES, GEAR_TIERS, SKILLS, SPORTS } from '../lib/labels';
import { FRIEND_COLORS, cx } from '../lib/util';
import { newFriend, useStore } from '../store/useStore';
import type { Currency, Friend, GearNeeds, Winter } from '../types';
import CurrencyPicker from './CurrencyPicker';
import { Button, Drawer, Field, NumberInput, Segmented, Toggle } from './ui';

interface Props {
  friend: Friend | null; // null = new friend
  winter: Winter;
  open: boolean;
  onClose: () => void;
}

/** Edits a friend's shared profile plus their budget for this winter. */
export default function FriendDrawer({ friend, winter, open, onClose }: Props) {
  const friendCount = useStore((s) => s.friends.length);
  const displayCurrency = useStore((s) => s.settings.currency);
  const addFriend = useStore((s) => s.addFriend);
  const updateFriend = useStore((s) => s.updateFriend);
  const removeFriend = useStore((s) => s.removeFriend);
  const setInWinter = useStore((s) => s.setInWinter);
  const updateParticipant = useStore((s) => s.updateParticipant);
  const [draft, setDraft] = useState<Friend>(() => friend ?? newFriend(friendCount));
  const [budget, setBudget] = useState(0);
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>(displayCurrency);

  useEffect(() => {
    if (!open) return;
    setDraft(friend ?? newFriend(friendCount, { defaultBudgetCurrency: displayCurrency }));
    const p = friend && winter.participants.find((x) => x.friendId === friend.id);
    setBudget(p ? p.budget : friend?.defaultBudget ?? 0);
    setBudgetCurrency(p ? p.budgetCurrency : friend?.defaultBudgetCurrency ?? displayCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, friend]);

  const set = (patch: Partial<Friend>) => setDraft((d) => ({ ...d, ...patch }));
  const setLessons = (patch: Partial<Friend['lessons']>) => setDraft((d) => ({ ...d, lessons: { ...d.lessons, ...patch } }));

  const save = () => {
    if (!draft.name.trim()) return;
    // this winter's budget also becomes the default for future winters
    const profile = { ...draft, defaultBudget: budget, defaultBudgetCurrency: budgetCurrency };
    if (friend) {
      updateFriend(friend.id, profile);
      updateParticipant(winter.id, friend.id, { budget, budgetCurrency });
    } else {
      addFriend(profile, winter.id);
    }
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={friend ? friend.name : 'Add a rider'}
      footer={
        <>
          {friend && (
            <div className="mr-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setInWinter(winter.id, friend.id, false); onClose(); }}>
                Not this winter
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${friend.name} from all winters?`)) {
                    removeFriend(friend.id);
                    onClose();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!draft.name.trim()}>
            {friend ? 'Save' : 'Add rider'}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <input className="input" autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Gur the number 1 skier" />
      </Field>

      <div>
        <span className="label">Color</span>
        <div className="flex flex-wrap gap-2">
          {FRIEND_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ color: c })}
              className={cx('h-8 w-8 rounded-full ring-offset-2 transition hover:scale-110', draft.color === c && 'ring-2 ring-slate-900')}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="label">Rides</span>
        <Segmented value={draft.sport} onChange={(v) => set({ sport: v })} options={SPORTS.map((s) => ({ value: s.value, label: `${s.emoji} ${s.label}` }))} />
      </div>

      <div>
        <span className="label">Skill level</span>
        <div className="grid grid-cols-5 gap-1.5">
          {SKILLS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set({ skillLevel: s.value })}
              className={cx(
                'flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 text-xs font-semibold transition',
                draft.skillLevel === s.value ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-100 text-slate-500 hover:border-slate-200',
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0">Budget per vacation, Winter {winter.year}</span>
          <CurrencyPicker value={budgetCurrency} onChange={setBudgetCurrency} />
        </div>
        <NumberInput value={budget} onChange={setBudget} min={0} />
        <span className="mt-1 block text-xs text-slate-400">Everything: flights, transfer, hotel, pass, lessons, rental. Leave empty for no limit.</span>
      </div>

      <GearPicker gear={draft.gear} onChange={(gear) => set({ gear })} />

      <div className="rounded-2xl bg-slate-50/80 p-4">
        <Toggle checked={draft.lessons.wanted} onChange={(wanted) => setLessons({ wanted })} label="Wants lessons" />
        {draft.lessons.wanted && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Segmented
              size="sm"
              value={draft.lessons.type}
              onChange={(type) => setLessons({ type })}
              options={[{ value: 'group', label: 'Group lessons' }, { value: 'private', label: 'Private lessons' }]}
            />
            <Field label="Days of lessons" className="w-36">
              <NumberInput value={draft.lessons.days} onChange={(days) => setLessons({ days })} min={0} />
            </Field>
            <p className="w-full text-xs text-slate-400">Lessons and their prices are set up per ski store on each resort.</p>
          </div>
        )}
      </div>

      <Field label="Notes">
        <textarea className="input min-h-20" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Dietary needs, room preferences, flying from…" />
      </Field>
    </Drawer>
  );
}

/** What a rider rents: a ski / snowboard level (or their own) plus individual pieces. */
function GearPicker({ gear, onChange }: { gear: GearNeeds; onChange: (g: GearNeeds) => void }) {
  const chip = (active: boolean) =>
    cx('rounded-full border px-3 py-1 text-xs font-semibold transition', active ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300');
  const togglePiece = (p: GearNeeds['pieces'][number]) =>
    onChange({ ...gear, pieces: gear.pieces.includes(p) ? gear.pieces.filter((x) => x !== p) : [...gear.pieces, p] });

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
      <span className="label mb-0">Rental gear</span>
      <div>
        <div className="mb-1.5 text-xs font-semibold text-slate-600">Ski / Snowboard</div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: null, label: 'Own', hint: 'brings their own' }, ...GEAR_TIERS].map((t) => (
            <button key={t.value ?? 'own'} type="button" title={t.hint} onClick={() => onChange({ ...gear, equipment: t.value })} className={chip(gear.equipment === t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold text-slate-600">Pieces</div>
        <div className="flex flex-wrap gap-1.5">
          {GEAR_PIECES.map((p) => (
            <button key={p.value} type="button" onClick={() => togglePiece(p.value)} className={chip(gear.pieces.includes(p.value))}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
