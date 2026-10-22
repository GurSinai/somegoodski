import { useEffect, useState } from 'react';
import { SKILLS, SPORTS } from '../lib/labels';
import { FRIEND_COLORS, cx } from '../lib/util';
import { newFriend, useStore } from '../store/useStore';
import type { Friend } from '../types';
import { Button, Drawer, Field, NumberInput, Segmented, Toggle } from './ui';

export default function FriendDrawer({ friend, open, onClose }: { friend: Friend | null; open: boolean; onClose: () => void }) {
  const friends = useStore((s) => s.friends);
  const currency = useStore((s) => s.settings.currency);
  const addFriend = useStore((s) => s.addFriend);
  const updateFriend = useStore((s) => s.updateFriend);
  const removeFriend = useStore((s) => s.removeFriend);
  const [draft, setDraft] = useState<Friend>(() => friend ?? newFriend(friends.length));

  useEffect(() => {
    if (open) setDraft(friend ?? newFriend(friends.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, friend]);

  const set = (patch: Partial<Friend>) => setDraft((d) => ({ ...d, ...patch }));
  const setLessons = (patch: Partial<Friend['lessons']>) => setDraft((d) => ({ ...d, lessons: { ...d.lessons, ...patch } }));

  const save = () => {
    if (!draft.name.trim()) return;
    if (friend) updateFriend(friend.id, draft);
    else addFriend(draft);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={friend ? `Edit ${friend.name}` : 'Add a friend'}
      footer={
        <>
          {friend && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                if (confirm(`Remove ${friend.name}?`)) {
                  removeFriend(friend.id);
                  onClose();
                }
              }}
            >
              Remove
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!draft.name.trim()}>
            {friend ? 'Save' : 'Add friend'}
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
              className={cx('h-7 w-7 rounded-full ring-offset-2 transition', draft.color === c && 'ring-2 ring-slate-900')}
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
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition',
                draft.skillLevel === s.value ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Field label={`Total trip budget per person (${currency})`} hint="Everything: flights, transfer, hotel, pass, lessons, rental. Leave empty if no limit.">
        <NumberInput value={draft.budget} onChange={(budget) => set({ budget })} min={0} />
      </Field>

      <div className="rounded-xl border border-slate-200 p-4">
        <Toggle checked={draft.needsRental} onChange={(needsRental) => set({ needsRental })} label="Needs equipment rental" />
        {draft.needsRental && (
          <Field label={`Rental per day (${currency})`} className="mt-3">
            <NumberInput value={draft.rentalPerDay} onChange={(rentalPerDay) => set({ rentalPerDay })} min={0} />
          </Field>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
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
