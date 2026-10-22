import { format } from 'date-fns';
import { ArrowRight, Check, Eraser, Flame, PaintBucket, Pencil, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SeasonCalendar, { isWeekend } from '../components/SeasonCalendar';
import { Avatar, Button, Empty, PageHeader, Segmented } from '../components/ui';
import { availabilityByDay, bestWindows, type Window } from '../lib/availability';
import { daysBetween, formatRange, fromISO, nightsOf } from '../lib/dates';
import { cx } from '../lib/util';
import { useActiveWinter, useStore, useVacationsOf, useWinterFriends } from '../store/useStore';
import type { DateRange, ISODate, WinterFriend } from '../types';

type Mode = 'heatmap' | 'edit';

// Vacation ranges on the calendar get these ring colors, in order.
const VACATION_RINGS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#ef4444'];
const ring = (color: string) => ({ boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}` });

export default function Dates() {
  const winter = useActiveWinter()!;
  const friends = useWinterFriends(winter);
  const vacations = useVacationsOf(winter.id);
  const setAvailability = useStore((s) => s.setAvailability);
  const createVacation = useStore((s) => s.createVacation);
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>(friends.some((f) => f.availability.length) ? 'heatmap' : 'edit');
  const [editId, setEditId] = useState<string | null>(null);
  const [nights, setNights] = useState(6);
  const [mustIds, setMustIds] = useState<string[]>([]);
  const [hoverDay, setHoverDay] = useState<{ iso: ISODate; x: number; y: number } | null>(null);
  const [previewRange, setPreviewRange] = useState<DateRange | null>(null);
  const [fillFrom, setFillFrom] = useState('');
  const [fillTo, setFillTo] = useState('');

  // drag-to-paint: everything between the anchor day and the hovered day gets the same value
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
    () => bestWindows(friends, winter.start, winter.end, nights, mustIds, 8),
    [friends, winter.start, winter.end, nights, mustIds],
  );
  const maxCount = Math.max(1, ...[...byDay.values()].map((v) => v.length));
  const datedVacations = vacations.filter((v) => v.dates);

  if (friends.length === 0) {
    return (
      <div>
        <PageHeader eyebrow={`Winter ${winter.year} · Step 2`} title="When can everyone go?" />
        <Empty icon={<Users size={26} />} title="Add riders first">
          Availability is set per rider. <Link to={`/w/${winter.id}/people`} className="font-semibold text-sky-600 hover:underline">Go to People →</Link>
        </Empty>
      </div>
    );
  }

  const ringFor = (iso: ISODate): string | null => {
    if (previewRange && iso >= previewRange.start && iso <= previewRange.end) return '#0ea5e9';
    const i = datedVacations.findIndex((v) => iso >= v.dates!.start && iso <= v.dates!.end);
    return i >= 0 ? VACATION_RINGS[i % VACATION_RINGS.length] : null;
  };

  const renderDay = (iso: ISODate) => {
    const r = ringFor(iso);
    const ringStyle = r ? ring(r) : {};
    if (mode === 'edit') {
      const on = editSet.has(iso);
      return {
        className: on ? 'font-bold text-white shadow-sm' : cx('text-slate-500 hover:bg-slate-100', isWeekend(iso) ? 'bg-sky-50/70' : 'bg-slate-50'),
        style: { ...(on && editFriend ? { background: editFriend.color } : {}), ...ringStyle },
      };
    }
    const count = byDay.get(iso)?.length ?? 0;
    const t = count / maxCount;
    return {
      className: count === 0 ? 'bg-slate-50 text-slate-300' : t > 0.55 ? 'font-bold text-white' : 'font-semibold text-slate-700',
      style: { ...(count ? { background: heat(t) } : {}), ...ringStyle },
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
    setAvailability(winter.id, editFriend.id, [iso], value);
  };

  const onDayEnter = (iso: ISODate, e: React.MouseEvent) => {
    if (mode === 'edit' && paint.current && editFriend) setAvailability(winter.id, editFriend.id, daysBetween(paint.current.anchor, iso), paint.current.value);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverDay({ iso, x: rect.left + rect.width / 2, y: rect.bottom });
  };

  const seasonDays = daysBetween(winter.start, winter.end);
  const quickFill = (days: ISODate[], value: boolean) => editFriend && setAvailability(winter.id, editFriend.id, days, value);
  const startVacation = (r: DateRange) => navigate(`/w/${winter.id}/v/${createVacation(winter.id, r)}`);

  return (
    <div>
      <PageHeader
        eyebrow={`Winter ${winter.year} · Step 2`}
        title="When can everyone go?"
        subtitle="Paint each rider’s free days. The heatmap and best windows show when the most people can make it, shared by every vacation this winter."
        actions={
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'heatmap', label: <><Flame size={15} /> Heatmap</> },
              { value: 'edit', label: <><Pencil size={15} /> Paint availability</> },
            ]}
          />
        }
      />

      {datedVacations.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label mb-0 mr-1">On the calendar</span>
          {datedVacations.map((v, i) => (
            <Link key={v.id} to={`/w/${winter.id}/v/${v.id}`} className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-white py-1 pl-2 pr-3 text-sm font-semibold shadow-sm hover:border-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-white" style={ring(VACATION_RINGS[i % VACATION_RINGS.length])} />
              {v.name} <span className="font-normal text-slate-400">{formatRange(v.dates)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          {mode === 'edit' ? (
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => {
                  const active = f.id === editFriend?.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setEditId(f.id)}
                      className={cx(
                        'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold transition',
                        active ? 'border-transparent text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                      style={active ? { background: f.color } : undefined}
                    >
                      <Avatar name={f.name} color={f.color} size={26} ring={active} />
                      {f.name}
                      <span className={cx('text-xs', active ? 'text-white/80' : 'text-slate-400')}>{f.availability.length}d</span>
                    </button>
                  );
                })}
              </div>
              {editFriend && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/80 p-3">
                  <Button size="sm" onClick={() => quickFill(seasonDays.filter(isWeekend), true)}><PaintBucket size={14} /> All weekends</Button>
                  <Button size="sm" onClick={() => quickFill(seasonDays, true)}><PaintBucket size={14} /> Whole season</Button>
                  <Button size="sm" variant="danger" onClick={() => quickFill(seasonDays, false)}><Eraser size={14} /> Clear</Button>
                  <div className="ml-auto flex items-center gap-2">
                    <input type="date" className="input w-auto py-1.5 text-xs" value={fillFrom} min={winter.start} max={winter.end} onChange={(e) => setFillFrom(e.target.value)} />
                    <span className="text-slate-300">→</span>
                    <input type="date" className="input w-auto py-1.5 text-xs" value={fillTo} min={fillFrom || winter.start} max={winter.end} onChange={(e) => setFillTo(e.target.value)} />
                    <Button size="sm" disabled={!fillFrom || !fillTo} onClick={() => quickFill(daysBetween(fillFrom, fillTo), true)}>Add range</Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400">Click or drag across days to mark <b className="text-slate-600">{editFriend?.name}</b> as free. Start a drag on a marked day to clear.</p>
            </div>
          ) : (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Fewer</span>
                <div className="flex gap-0.5">
                  {[0.15, 0.35, 0.55, 0.75, 1].map((t) => <span key={t} className="h-3 w-6 rounded" style={{ background: heat(t) }} />)}
                </div>
                <span>More riders free</span>
              </div>
              <span className="text-xs text-slate-400">Hover a day to see who’s in.</span>
            </div>
          )}

          <SeasonCalendar start={winter.start} end={winter.end} renderDay={renderDay} onDayDown={onDayDown} onDayEnter={onDayEnter} onLeave={() => setHoverDay(null)} />
        </div>

        {/* Best windows */}
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Best windows</h3>
              <div className="flex items-center gap-1 rounded-full bg-slate-100/80 p-1 text-sm">
                <button className="h-7 w-7 rounded-full font-bold hover:bg-white" onClick={() => setNights((n) => Math.max(1, n - 1))}>−</button>
                <span className="w-20 text-center font-semibold">{nights} nights</span>
                <button className="h-7 w-7 rounded-full font-bold hover:bg-white" onClick={() => setNights((n) => Math.min(21, n + 1))}>+</button>
              </div>
            </div>
            <div className="mb-4">
              <div className="mb-1.5 text-xs text-slate-400">Must come:</div>
              <div className="flex flex-wrap gap-1.5">
                {friends.map((f) => {
                  const on = mustIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setMustIds((m) => (on ? m.filter((x) => x !== f.id) : [...m, f.id]))}
                      className={cx('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition', on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400')}
                    >
                      {on && <Check size={11} />} {f.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {windows.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                No {nights}-night window yet{mustIds.length ? ' with everyone required' : ''}. Paint some availability first.
              </div>
            ) : (
              <ol className="space-y-2.5">
                {windows.map((w, i) => (
                  <WindowRow key={w.start} w={w} rank={i + 1} friends={friends} onHover={setPreviewRange} onCreate={() => startVacation({ start: w.start, end: w.end })} />
                ))}
              </ol>
            )}
          </div>
          <ManualVacation onCreate={startVacation} />
        </aside>
      </div>

      {hoverDay && mode === 'heatmap' && <DayTooltip {...hoverDay} friends={friends} />}
    </div>
  );
}

function WindowRow({ w, rank, friends, onHover, onCreate }: {
  w: Window; rank: number; friends: WinterFriend[]; onHover: (r: DateRange | null) => void; onCreate: () => void;
}) {
  const missing = friends.filter((f) => !w.attendeeIds.includes(f.id));
  const total = friends.length;
  return (
    <li
      onMouseEnter={() => onHover({ start: w.start, end: w.end })}
      onMouseLeave={() => onHover(null)}
      className={cx('rounded-2xl border p-3.5 transition hover:border-sky-200 hover:bg-sky-50/40', rank === 1 ? 'border-sky-100 bg-gradient-to-br from-sky-50/80 to-white' : 'border-slate-100')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold text-slate-300">{rank === 1 ? '★ BEST' : `#${rank}`}</div>
          <div className="text-sm font-bold">{formatRange({ start: w.start, end: w.end })}</div>
          {w.flexDays > 1 && <div className="text-xs text-emerald-600">Flexible: same crew for {w.flexDays} start days</div>}
        </div>
        <div className="text-xl font-extrabold">{w.attendeeIds.length}<span className="text-sm font-medium text-slate-300">/{total}</span></div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600" style={{ width: `${(w.attendeeIds.length / total) * 100}%` }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex -space-x-1.5">
          {friends.filter((f) => w.attendeeIds.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={24} ring />)}
        </div>
        <Button size="sm" variant={rank === 1 ? 'primary' : 'secondary'} onClick={onCreate}>
          Create vacation <ArrowRight size={13} />
        </Button>
      </div>
      {missing.length > 0 && <div className="mt-1.5 text-xs text-slate-400">Missing: {missing.map((f) => f.name).join(', ')}</div>}
    </li>
  );
}

function ManualVacation({ onCreate }: { onCreate: (r: DateRange) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const valid = Boolean(start && end && end > start);
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-bold">Already know the dates?</h3>
      <div className="flex items-center gap-2">
        <input type="date" className="input py-2 text-xs" value={start} onChange={(e) => setStart(e.target.value)} />
        <span className="text-slate-300">→</span>
        <input type="date" className="input py-2 text-xs" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Button className="mt-3 w-full" disabled={!valid} onClick={() => valid && onCreate({ start, end })}>
        <Plus size={15} /> Create vacation{valid ? ` · ${nightsOf({ start, end })} nights` : ''}
      </Button>
    </div>
  );
}

function DayTooltip({ iso, x, y, friends }: { iso: ISODate; x: number; y: number; friends: WinterFriend[] }) {
  const free = friends.filter((f) => f.availability.includes(iso));
  const out = friends.filter((f) => !f.availability.includes(iso));
  return (
    <div className="pointer-events-none fixed z-50 w-60 -translate-x-1/2 rounded-2xl border border-slate-100 bg-white/95 p-3.5 text-xs shadow-lift backdrop-blur" style={{ left: x, top: y + 8 }}>
      <div className="mb-2 font-bold text-slate-900">{format(fromISO(iso), 'EEEE d MMM')} · {free.length}/{friends.length} free</div>
      {free.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {free.map((f) => <span key={f.id} className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: f.color }}>{f.name}</span>)}
        </div>
      )}
      {out.length > 0 && <div className="text-slate-400">Out: {out.map((f) => f.name).join(', ')}</div>}
    </div>
  );
}

/** Snow → glacier blue scale for the heatmap. */
function heat(t: number): string {
  const stops = [
    [240, 249, 255],
    [186, 230, 253],
    [56, 189, 248],
    [37, 99, 235],
    [30, 58, 138],
  ];
  const p = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  const f = p - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(',')})`;
}
