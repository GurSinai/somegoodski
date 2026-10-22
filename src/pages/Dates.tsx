import { getDay } from 'date-fns';
import { ArrowRight, Check, Eraser, Flame, PaintBucket, Pencil, Star, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SeasonCalendar from '../components/SeasonCalendar';
import { Avatar, Button, Empty, Field, PageHeader, Segmented } from '../components/ui';
import { availabilityByDay, bestWindows, freeForRange, type Window } from '../lib/availability';
import { addDaysISO, daysBetween, formatRange, fromISO, nightsOf } from '../lib/dates';
import { cx } from '../lib/util';
import { useStore } from '../store/useStore';
import type { DateRange, ISODate } from '../types';

type Mode = 'heatmap' | 'edit';

export default function Dates() {
  const friends = useStore((s) => s.friends);
  const season = useStore((s) => s.season);
  const updateSeason = useStore((s) => s.updateSeason);
  const setChosenDates = useStore((s) => s.setChosenDates);
  const setAvailability = useStore((s) => s.setAvailability);

  const [mode, setMode] = useState<Mode>(friends.some((f) => f.availability.length) ? 'heatmap' : 'edit');
  const [editId, setEditId] = useState<string | null>(friends[0]?.id ?? null);
  const [nights, setNights] = useState(6);
  const [mustIds, setMustIds] = useState<string[]>([]);
  const [hoverDay, setHoverDay] = useState<{ iso: ISODate; x: number; y: number } | null>(null);
  const [previewRange, setPreviewRange] = useState<DateRange | null>(null);
  const [fillFrom, setFillFrom] = useState('');
  const [fillTo, setFillTo] = useState('');

  // drag-to-paint state
  const paint = useRef<{ value: boolean; anchor: ISODate } | null>(null);
  useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const editFriend = friends.find((f) => f.id === editId) ?? friends[0] ?? null;
  const editSet = useMemo(() => new Set(editFriend?.availability ?? []), [editFriend]);
  const byDay = useMemo(() => availabilityByDay(friends), [friends]);
  const windows = useMemo(
    () => bestWindows(friends, season.start, season.end, nights, mustIds, 8),
    [friends, season.start, season.end, nights, mustIds],
  );
  const maxCount = Math.max(1, ...[...byDay.values()].map((v) => v.length));
  const highlight = previewRange ?? season.chosenDates;

  if (friends.length === 0) {
    return (
      <div>
        <PageHeader title="When can everyone go?" />
        <Empty icon={<Users size={24} />} title="Add people first">
          Availability is set per friend.{' '}
          <Link to="/people" className="font-medium text-sky-600 hover:underline">Go to People →</Link>
        </Empty>
      </div>
    );
  }

  const inHighlight = (iso: ISODate) => !!highlight && iso >= highlight.start && iso <= highlight.end;

  const renderDay = (iso: ISODate) => {
    const hl = inHighlight(iso);
    const ring = hl ? 'ring-2 ring-amber-400 ring-offset-1' : '';
    if (mode === 'edit') {
      const on = editSet.has(iso);
      return {
        className: cx(ring, on ? 'font-semibold text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
        style: on && editFriend ? { background: editFriend.color } : undefined,
      };
    }
    const count = byDay.get(iso)?.length ?? 0;
    const t = count / maxCount;
    return {
      className: cx(ring, count === 0 ? 'bg-slate-100 text-slate-400' : t > 0.55 ? 'text-white font-semibold' : 'text-slate-800 font-medium'),
      style: count ? { background: heat(t) } : undefined,
      content: (
        <>
          <span>{Number(iso.slice(8))}</span>
          {count > 0 && <span className="absolute bottom-0.5 right-1 text-[9px] opacity-80">{count}</span>}
        </>
      ),
    };
  };

  const onDayDown = (iso: ISODate) => {
    if (mode !== 'edit' || !editFriend) return;
    const value = !editSet.has(iso);
    paint.current = { value, anchor: iso };
    setAvailability(editFriend.id, [iso], value);
  };

  const onDayEnter = (iso: ISODate, e: React.MouseEvent) => {
    if (mode === 'edit' && paint.current && editFriend) setAvailability(editFriend.id, daysBetween(paint.current.anchor, iso), paint.current.value);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverDay({ iso, x: rect.left + rect.width / 2, y: rect.bottom });
  };

  const seasonDays = daysBetween(season.start, season.end);
  const quickFill = (days: ISODate[], value: boolean) => editFriend && setAvailability(editFriend.id, days, value);
  const weekends = seasonDays.filter((d) => [5, 6, 0].includes(getDay(fromISO(d))));

  const chosen = season.chosenDates;
  const chosenFree = chosen ? freeForRange(friends, chosen) : [];

  return (
    <div>
      <PageHeader
        title="When can everyone go?"
        subtitle="Paint each friend's free days, then use the heatmap and best windows to choose the dates."
        actions={
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'heatmap', label: <><Flame size={15} /> Heatmap</> },
              { value: 'edit', label: <><Pencil size={15} /> Edit availability</> },
            ]}
          />
        }
      />

      {/* Chosen dates banner */}
      <div className={cx('mb-6 flex flex-wrap items-center gap-4 rounded-2xl border p-4', chosen ? 'border-amber-300 bg-amber-50' : 'border-dashed border-slate-300 bg-white')}>
        <Star className={chosen ? 'fill-amber-400 text-amber-500' : 'text-slate-400'} size={22} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Chosen dates</div>
          {chosen ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-lg font-semibold">{formatRange(chosen)}</span>
              <span className="text-sm text-slate-600">{nightsOf(chosen)} nights · {chosenFree.length}/{friends.length} free</span>
              <span className="flex -space-x-1.5">
                {friends.filter((f) => chosenFree.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={22} />)}
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Pick one of the best windows, or enter dates manually.</div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="date"
            className="input w-auto"
            value={chosen?.start ?? ''}
            onChange={(e) => e.target.value && setChosenDates({ start: e.target.value, end: chosen && chosen.end > e.target.value ? chosen.end : addDaysISO(e.target.value, nights) })}
          />
          <input
            type="date"
            className="input w-auto"
            value={chosen?.end ?? ''}
            min={chosen?.start}
            onChange={(e) => chosen && e.target.value && setChosenDates({ ...chosen, end: e.target.value })}
            disabled={!chosen}
          />
          {chosen && (
            <Link to="/resorts">
              <Button variant="primary">
                Pick a resort <ArrowRight size={16} />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          {mode === 'edit' ? (
            <div className="mb-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEditId(f.id)}
                    className={cx(
                      'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition',
                      f.id === editFriend?.id ? 'border-transparent text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                    )}
                    style={f.id === editFriend?.id ? { background: f.color } : undefined}
                  >
                    <Avatar name={f.name} color={f.color} size={24} />
                    {f.name}
                    <span className={cx('text-xs', f.id === editFriend?.id ? 'text-white/80' : 'text-slate-400')}>{f.availability.length}d</span>
                  </button>
                ))}
              </div>
              {editFriend && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                  <Button size="sm" onClick={() => quickFill(weekends, true)}>
                    <PaintBucket size={14} /> Add all weekends
                  </Button>
                  <Button size="sm" onClick={() => quickFill(seasonDays, true)}>
                    <PaintBucket size={14} /> Whole season
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => quickFill(seasonDays, false)}>
                    <Eraser size={14} /> Clear
                  </Button>
                  <div className="ml-auto flex items-end gap-2">
                    <input type="date" className="input w-auto py-1.5 text-xs" value={fillFrom} min={season.start} max={season.end} onChange={(e) => setFillFrom(e.target.value)} />
                    <span className="pb-1.5 text-slate-400">→</span>
                    <input type="date" className="input w-auto py-1.5 text-xs" value={fillTo} min={fillFrom || season.start} max={season.end} onChange={(e) => setFillTo(e.target.value)} />
                    <Button size="sm" disabled={!fillFrom || !fillTo} onClick={() => quickFill(daysBetween(fillFrom, fillTo), true)}>
                      Add range
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500">Click or drag across days to mark <b>{editFriend?.name}</b> as free. Drag again over marked days to clear them.</p>
            </div>
          ) : (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Fewer</span>
                <div className="flex">
                  {[0.15, 0.35, 0.55, 0.75, 1].map((t) => <span key={t} className="h-3 w-6 first:rounded-l last:rounded-r" style={{ background: heat(t) }} />)}
                </div>
                <span>More people free</span>
              </div>
              <span className="text-xs text-slate-500">Hover a day to see who's in.</span>
            </div>
          )}

          <SeasonCalendar
            start={season.start}
            end={season.end}
            renderDay={renderDay}
            onDayDown={onDayDown}
            onDayEnter={onDayEnter}
            onLeave={() => setHoverDay(null)}
          />

          <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <Field label="Season starts">
              <input type="date" className="input w-auto" value={season.start} onChange={(e) => e.target.value && updateSeason({ start: e.target.value })} />
            </Field>
            <Field label="Season ends">
              <input type="date" className="input w-auto" value={season.end} min={season.start} onChange={(e) => e.target.value && updateSeason({ end: e.target.value })} />
            </Field>
          </div>
        </div>

        {/* Best windows */}
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Best windows</h3>
              <div className="flex items-center gap-1.5 text-sm">
                <button className="h-7 w-7 rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => setNights((n) => Math.max(1, n - 1))}>−</button>
                <span className="w-16 text-center font-medium">{nights} nights</span>
                <button className="h-7 w-7 rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => setNights((n) => Math.min(21, n + 1))}>+</button>
              </div>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-xs text-slate-500">Must come (tap to require):</div>
              <div className="flex flex-wrap gap-1.5">
                {friends.map((f) => {
                  const on = mustIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setMustIds((m) => (on ? m.filter((x) => x !== f.id) : [...m, f.id]))}
                      className={cx('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition', on ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400')}
                    >
                      {on && <Check size={11} />} {f.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {windows.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                No {nights}-night window yet{mustIds.length ? ' with everyone required' : ''}. Add availability in Edit mode.
              </div>
            ) : (
              <ol className="space-y-2">
                {windows.map((w, i) => (
                  <WindowRow
                    key={w.start}
                    w={w}
                    rank={i + 1}
                    total={friends.length}
                    friends={friends}
                    isChosen={chosen?.start === w.start && chosen?.end === w.end}
                    onHover={(r) => setPreviewRange(r)}
                    onChoose={() => setChosenDates({ start: w.start, end: w.end })}
                  />
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {hoverDay && mode === 'heatmap' && <DayTooltip {...hoverDay} />}
    </div>
  );
}

function WindowRow({
  w, rank, total, friends, isChosen, onHover, onChoose,
}: {
  w: Window; rank: number; total: number; friends: ReturnType<typeof useStore.getState>['friends'];
  isChosen: boolean; onHover: (r: DateRange | null) => void; onChoose: () => void;
}) {
  const missing = friends.filter((f) => !w.attendeeIds.includes(f.id));
  return (
    <li
      onMouseEnter={() => onHover({ start: w.start, end: w.end })}
      onMouseLeave={() => onHover(null)}
      className={cx('rounded-xl border p-3 transition', isChosen ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/40')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400">#{rank}</div>
          <div className="text-sm font-semibold">{formatRange({ start: w.start, end: w.end })}</div>
          {w.flexDays > 1 && <div className="text-xs text-emerald-600">Flexible: same group for {w.flexDays} start days</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">{w.attendeeIds.length}<span className="text-sm font-normal text-slate-400">/{total}</span></div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${(w.attendeeIds.length / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex -space-x-1.5">
          {friends.filter((f) => w.attendeeIds.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={22} />)}
        </div>
        {isChosen ? (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700"><Star size={12} className="fill-amber-400" /> Chosen</span>
        ) : (
          <Button size="sm" onClick={onChoose}>Choose</Button>
        )}
      </div>
      {missing.length > 0 && <div className="mt-1.5 text-xs text-slate-400">Missing: {missing.map((f) => f.name).join(', ')}</div>}
    </li>
  );
}

function DayTooltip({ iso, x, y }: { iso: ISODate; x: number; y: number }) {
  const friends = useStore((s) => s.friends);
  const free = friends.filter((f) => f.availability.includes(iso));
  const out = friends.filter((f) => !f.availability.includes(iso));
  return (
    <div className="pointer-events-none fixed z-50 w-56 -translate-x-1/2 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-xl" style={{ left: x, top: y + 8 }}>
      <div className="mb-1.5 font-semibold">{formatRange({ start: iso, end: iso }).split(' → ')[0]} · {free.length}/{friends.length} free</div>
      {free.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {free.map((f) => <span key={f.id} className="rounded-full px-1.5 py-0.5" style={{ background: f.color }}>{f.name}</span>)}
        </div>
      )}
      {out.length > 0 && <div className="text-slate-400">Out: {out.map((f) => f.name).join(', ')}</div>}
    </div>
  );
}

/** Light sky → deep blue scale for the heatmap. */
function heat(t: number): string {
  const stops = [
    [224, 242, 254],
    [125, 211, 252],
    [14, 165, 233],
    [3, 105, 161],
    [12, 74, 110],
  ];
  const p = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  const f = p - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(',')})`;
}
