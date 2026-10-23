import { format } from 'date-fns';
import { GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { lessonRiders, lessonShare } from '../lib/combinations';
import { daysBetween, fromISO } from '../lib/dates';
import { SKILLS } from '../lib/labels';
import { cx, money, uid } from '../lib/util';
import type { Currency, LessonOffer, LessonType, PricedTrip, WinterFriend } from '../types';
import { Avatar, Badge, Button, Field, NumberInput, Segmented } from './ui';

const blankLesson = (type: LessonType): LessonOffer => ({
  id: uid(), type, dates: [], people: type === 'private' ? 2 : 0, pricePerPerson: 0, level: null, friendIds: [], notes: '',
});

export const lessonTitle = (l: LessonOffer) =>
  `${l.type === 'group' ? 'Group lesson' : `Private lesson for ${l.people}`}${l.level ? ` · ${SKILLS.find((s) => s.value === l.level)?.label}` : ''}`;

export const lessonDaysLabel = (l: LessonOffer) =>
  l.dates.length ? `${l.dates.length} day${l.dates.length > 1 ? 's' : ''}: ${l.dates.map((d) => format(fromISO(d), 'EEE d')).join(', ')}` : 'No days picked';

/** The lessons a ski store offers, edited inside the store form. Prices are in the store's currency. */
export default function LessonEditor({ lessons, onChange, currency, trip, friends }: {
  lessons: LessonOffer[];
  onChange: (lessons: LessonOffer[]) => void;
  currency: Currency;
  trip: PricedTrip;
  friends: WinterFriend[];
}) {
  const [editing, setEditing] = useState<LessonOffer | null>(null);
  const m = (n: number) => money(n, currency);
  const save = (l: LessonOffer) => {
    onChange(lessons.some((x) => x.id === l.id) ? lessons.map((x) => (x.id === l.id ? l : x)) : [...lessons, l]);
    setEditing(null);
  };

  return (
    <div className="rounded-2xl bg-slate-50/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">Lessons</span>
        {!editing && (
          <Button size="sm" onClick={() => setEditing(blankLesson('group'))}>
            <Plus size={13} /> Add lesson
          </Button>
        )}
      </div>

      {lessons.length === 0 && !editing && <p className="text-xs text-slate-400">No lessons yet. Add group or private lessons this store offers.</p>}

      <div className="space-y-2">
        {lessons.map((l) =>
          editing?.id === l.id ? null : (
            <div key={l.id} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm">
              <GraduationCap size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{lessonTitle(l)}</div>
                <div className="text-xs text-slate-500">{lessonDaysLabel(l)} · {m(l.pricePerPerson)} per person / day</div>
                <div className="mt-1 flex -space-x-1">
                  {friends.filter((f) => l.friendIds.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={20} ring />)}
                  {!l.friendIds.length && <span className="text-xs text-amber-600">No riders assigned</span>}
                </div>
              </div>
              <button type="button" className="rounded-full p-1 text-slate-300 hover:text-slate-600" onClick={() => setEditing(l)} title="Edit lesson"><Pencil size={14} /></button>
              <button type="button" className="rounded-full p-1 text-slate-300 hover:text-rose-500" onClick={() => onChange(lessons.filter((x) => x.id !== l.id))} title="Remove lesson"><Trash2 size={14} /></button>
            </div>
          ),
        )}
      </div>

      {editing && <LessonForm lesson={editing} isNew={!lessons.some((x) => x.id === editing.id)} currency={currency} trip={trip} friends={friends} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function LessonForm({ lesson, isNew, currency, trip, friends, onSave, onCancel }: {
  lesson: LessonOffer;
  isNew: boolean;
  currency: Currency;
  trip: PricedTrip;
  friends: WinterFriend[];
  onSave: (l: LessonOffer) => void;
  onCancel: () => void;
}) {
  const [l, setL] = useState(lesson);
  const set = (patch: Partial<LessonOffer>) => setL((x) => ({ ...x, ...patch }));
  const m = (n: number) => money(n, currency);
  const days = trip.dates ? daysBetween(trip.dates.start, trip.dates.end) : [];
  const going = friends.filter((f) => trip.attendeeIds.includes(f.id));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const riders = lessonRiders(l, trip.attendeeIds).length;
  const share = lessonShare(l, riders);
  const chip = (on: boolean) => cx('rounded-full border px-2.5 py-1 text-xs font-semibold transition', on ? 'border-sky-400 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300');

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-sky-100 bg-white p-4">
      <Segmented
        value={l.type}
        onChange={(type) => set({ type, people: type === 'private' ? Math.max(1, l.people || 2) : 0 })}
        options={[{ value: 'group', label: '👥 Group lesson' }, { value: 'private', label: '🎓 Private lesson' }]}
      />

      <div>
        <span className="label">Dates</span>
        {days.length ? (
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button key={d} type="button" className={chip(l.dates.includes(d))} onClick={() => setL((x) => ({ ...x, dates: toggle(x.dates, d).sort() }))}>
                {format(fromISO(d), 'EEE d MMM')}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-amber-600">Set the vacation dates first to pick lesson days.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {l.type === 'private' && (
          <Field label="Number of people" hint="The price below is for this group size">
            <NumberInput value={l.people} onChange={(people) => set({ people: Math.max(1, people) })} min={1} />
          </Field>
        )}
        <Field label={`Price per person, per day (${currency})`}>
          <NumberInput value={l.pricePerPerson} onChange={(pricePerPerson) => set({ pricePerPerson })} min={0} />
        </Field>
      </div>

      <div>
        <span className="label">Ski level</span>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(l.level === null)} onClick={() => set({ level: null })}>Any</button>
          {SKILLS.map((s) => (
            <button key={s.value} type="button" className={chip(l.level === s.value)} onClick={() => set({ level: s.value })}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="label"><Users size={11} className="mr-1 inline" /> Riders{l.type === 'private' ? ` (priced for ${l.people})` : ''}</span>
        <div className="flex flex-wrap gap-1.5">
          {going.map((f) => (
            <button key={f.id} type="button" onClick={() => setL((x) => ({ ...x, friendIds: toggle(x.friendIds, f.id) }))}
              className={cx('flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-semibold transition', l.friendIds.includes(f.id) ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-400 hover:text-slate-600')}>
              <Avatar name={f.name} color={f.color} size={20} /> {f.name}
              {f.lessons.wanted && <span className="text-[10px] text-amber-600">wants {f.lessons.type}</span>}
            </button>
          ))}
          {!going.length && <span className="text-xs text-slate-400">Nobody is going on this vacation yet.</span>}
        </div>
        <p className="mt-1.5 text-xs text-slate-400">You can also assign riders later from the Ski stores tab.</p>
      </div>

      <Field label="Notes">
        <input className="input" value={l.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Meeting point, instructor, language…" />
      </Field>

      {l.pricePerPerson > 0 && l.dates.length > 0 && (
        <div className="rounded-xl bg-sky-50/70 p-3 text-xs text-slate-600">
          {l.type === 'group'
            ? <>{l.dates.length} day{l.dates.length > 1 ? 's' : ''} × {m(l.pricePerPerson)} = <b>{m(l.pricePerPerson * l.dates.length)}</b> per rider</>
            : <>
                Lesson costs <b>{m(l.pricePerPerson * l.people * l.dates.length)}</b> ({l.people} × {m(l.pricePerPerson)} × {l.dates.length} day{l.dates.length > 1 ? 's' : ''})
                {riders > 0 && <>, split between {riders} rider{riders > 1 ? 's' : ''}: <b>{m(share)}</b> each</>}
                {riders > 0 && riders < l.people && <Badge color="amber" className="ml-1">{l.people - riders} spot{l.people - riders > 1 ? 's' : ''} unfilled</Badge>}
              </>}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => onSave(l)}>{isNew ? 'Add lesson' : 'Update lesson'}</Button>
      </div>
    </div>
  );
}
