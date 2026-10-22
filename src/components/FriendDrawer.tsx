import { useEffect, useState } from 'react';
import { SKILLS, SPORTS } from '../lib/labels';
import { FRIEND_COLORS, cx } from '../lib/util';
import { newFriend, useStore } from '../store/useStore';
import type { Friend, Winter } from '../types';
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
  const currency = useStore((s) => s.settings.currency);
  const addFriend = useStore((s) => s.addFriend);
  const updateFriend = useStore((s) => s.updateFriend);
  const removeFriend = useStore((s) => s.removeFriend);
  const setInWinter = useStore((s) => s.setInWinter);
  const updateParticipant = useStore((s) => s.updateParticipant);
  const [draft, setDraft] = useState<Friend>(() => friend ?? newFriend(friendCount));
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDraft(friend ?? newFriend(friendCount));
    setBudget(friend ? winter.participants.find((p) => p.friendId === friend.id)?.budget ?? friend.defaultBudget : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, friend]);

  const set = (patch: Partial<Friend>) => setDraft((d) => ({ ...d, ...patch }));
  const setLessons = (patch: Partial<Friend['lessons']>) => setDraft((d) => ({ ...d, lessons: { ...d.lessons, ...patch } }));

  const save = () => {
    if (!draft.name.trim()) return;
    // this winter's budget also becomes the default for future winters
    const profile = { ...draft, defaultBudget: budget };
    if (friend) {
      updateFriend(friend.id, profile);
      updateParticipant(winter.id, friend.id, { budget });
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
        <input className="input" autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Noa" />
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

      <Field label={`Budget per vacation, Winter ${winter.year} (${currency})`} hint="Everything: flights, transfer, hotel, pass, lessons, rental. Leave empty for no limit.">
        <NumberInput value={budget} onChange={setBudget} min={0} />
      </Field>

      <div className="rounded-2xl bg-slate-50/80 p-4">
        <Toggle checked={draft.needsRental} onChange={(needsRental) => set({ needsRental })} label="Needs equipment rental" />
        {draft.needsRental && (
          <Field label={`Rental per day (${currency})`} className="mt-3">
            <NumberInput value={draft.rentalPerDay} onChange={(rentalPerDay) => set({ rentalPerDay })} min={0} />
          </Field>
        )}
      </div>

      <div className="rounded-2xl bg-slate-50/80 p-4">
        <Toggle checked={draft.lessons.wanted} onChange={(wanted) => setLessons({ wanted })} label="Wants lessons" />
        {draft.lessons.wanted && (
          <div className="mt-3 space-y-3">
            <Segmented
              size="sm"
              value={draft.lessons.type}
              onChange={(type) => setLessons({ type })}
              options={[{ value: 'group', label: 'Group lessons' }, { value: 'private', label: 'Private lessons' }]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Days of lessons">
                <NumberInput value={draft.lessons.days} onChange={(days) => setLessons({ days })} min={0} />
              </Field>
              <Field label={`Cost per day (${currency})`}>
                <NumberInput value={draft.lessons.budgetPerDay} onChange={(budgetPerDay) => setLessons({ budgetPerDay })} min={0} />
              </Field>
            </div>
          </div>
        )}
      </div>

      <Field label="Notes">
        <textarea className="input min-h-20" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Dietary needs, room preferences, flying from…" />
      </Field>
    </Drawer>
  );
}
