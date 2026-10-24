import { format } from 'date-fns';
import { ArrowRight, Check, Eraser, Flame, PaintBucket, Pencil, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { availabilityByDay, bestWindows, type Window } from '../lib/availability';
import { daysBetween, formatRange, fromISO, nightsOf } from '../lib/dates';
import { cx } from '../lib/util';
import type { DateRange, ISODate, VacationPerson } from '../types';
import SeasonCalendar, { isWeekend } from './SeasonCalendar';
import { Avatar, Button, Segmented } from './ui';

type Mode = 'heatmap' | 'edit';

export const ring = (color: string) => ({ boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}` });

interface Props {
  people: VacationPerson[];
  start: ISODate; // the season shown
  end: ISODate;
  setAvailability: (personId: string, days: ISODate[], available: boolean) => void;
  /** Ranges outlined on the calendar (vacations). */
  rings?: { range: DateRange; color: string }[];
  /** What dragging a range or choosing a best window does. */
  pickLabel: string;
  onPick: (r: DateRange) => void;
  aside?: ReactNode; // extra cards under Best windows
}

/** Paint availability, see the heatmap, drag out dates and rank the best windows, for any group of people. */
export default function AvailabilityBoard({ people, start, end, setAvailability, rings = [], pickLabel, onPick, aside }: Props) {
  const [mode, setMode] = useState<Mode>(people.some((f) => f.availability.length) ? 'heatmap' : 'edit');
  const [editId, setEditId] = useState<string | null>(null);
  const [nights, setNights] = useState(6);
  const [mustIds, setMustIds] = useState<string[]>([]);
  const [hoverDay, setHoverDay] = useState<{ iso: ISODate; x: number; y: number } | null>(null);
  const [previewRange, setPreviewRange] = useState<DateRange | null>(null);
  const [fillFrom, setFillFrom] = useState('');
  const [fillTo, setFillTo] = useState('');
  const [selection, setSelection] = useState<DateRange | null>(null);

  // drag-to-paint: everything between the anchor day and the hovered day gets the same value
  const paint = useRef<{ value: boolean; anchor: ISODate } | null>(null);
  // heatmap drag-to-select: the picked range runs from this anchor to the hovered day
  const selectFrom = useRef<ISODate | null>(null);
  useEffect(() => {
    const up = () => {
      paint.current = null;
      selectFrom.current = null;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const editPerson = people.find((f) => f.id === editId) ?? people[0] ?? null;
  const editSet = useMemo(() => new Set(editPerson?.availability ?? []), [editPerson]);
  const byDay = useMemo(() => availabilityByDay(people), [people]);
  const windows = useMemo(() => bestWindows(people, start, end, nights, mustIds, 8), [people, start, end, nights, mustIds]);
  const maxCount = Math.max(1, ...[...byDay.values()].map((v) => v.length));

  // painter chips grouped by who added each person (only matters in shared vacations)
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; people: VacationPerson[] }>();
    for (const p of people) {
      const key = p.guest?.addedBy ?? 'me';
      if (!m.has(key)) m.set(key, { label: p.guest ? `Added by ${p.guest.addedByName}` : 'Yours', people: [] });
      m.get(key)!.people.push(p);
    }
    return [...m.values()];
  }, [people]);

  const ringFor = (iso: ISODate): string | null => {
    if (selection && iso >= selection.start && iso <= selection.end) return '#0f172a';
    if (previewRange && iso >= previewRange.start && iso <= previewRange.end) return '#0ea5e9';
    return rings.find((r) => iso >= r.range.start && iso <= r.range.end)?.color ?? null;
  };

  const renderDay = (iso: ISODate) => {
    const r = ringFor(iso);
    const ringStyle = r ? ring(r) : {};
    if (mode === 'edit') {
      const on = editSet.has(iso);
      return {
        className: on ? 'font-bold text-white shadow-sm' : cx('text-slate-500 hover:bg-slate-100', isWeekend(iso) ? 'bg-sky-50/70' : 'bg-slate-50'),
        style: { ...(on && editPerson ? { background: editPerson.color } : {}), ...ringStyle },
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
    if (mode === 'heatmap') {
      selectFrom.current = iso;
      setSelection({ start: iso, end: iso });
      return;
    }
    if (!editPerson) return;
    const value = !editSet.has(iso);
    paint.current = { value, anchor: iso };
    setAvailability(editPerson.id, [iso], value);
  };

  const onDayEnter = (iso: ISODate, e: React.MouseEvent) => {
    if (mode === 'edit' && paint.current && editPerson) setAvailability(editPerson.id, daysBetween(paint.current.anchor, iso), paint.current.value);
    const from = selectFrom.current;
    if (mode === 'heatmap' && from) setSelection(from <= iso ? { start: from, end: iso } : { start: iso, end: from });
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverDay({ iso, x: rect.left + rect.width / 2, y: rect.bottom });
  };

  const seasonDays = daysBetween(start, end);
  const quickFill = (days: ISODate[], value: boolean) => editPerson && setAvailability(editPerson.id, days, value);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card p-6">
        <div className="mb-5 flex justify-end">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'heatmap', label: <><Flame size={15} /> Heatmap</> },
              { value: 'edit', label: <><Pencil size={15} /> Paint availability</> },
            ]}
          />
        </div>
        {mode === 'edit' ? (
          <div className="mb-6 space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                {groups.length > 1 && <div className="mb-1.5 text-xs font-semibold text-slate-500">{g.label}</div>}
                <div className="flex flex-wrap gap-2">
                  {g.people.map((f) => {
                    const active = f.id === editPerson?.id;
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
              </div>
            ))}
            {editPerson && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/80 p-3">
                <Button size="sm" onClick={() => quickFill(seasonDays.filter(isWeekend), true)}><PaintBucket size={14} /> All weekends</Button>
                <Button size="sm" onClick={() => quickFill(seasonDays, true)}><PaintBucket size={14} /> Whole season</Button>
                <Button size="sm" variant="danger" onClick={() => quickFill(seasonDays, false)}><Eraser size={14} /> Clear</Button>
                <div className="ml-auto flex items-center gap-2">
                  <input type="date" className="input w-auto py-1.5 text-xs" value={fillFrom} min={start} max={end} onChange={(e) => setFillFrom(e.target.value)} />
                  <span className="text-slate-300">→</span>
                  <input type="date" className="input w-auto py-1.5 text-xs" value={fillTo} min={fillFrom || start} max={end} onChange={(e) => setFillTo(e.target.value)} />
                  <Button size="sm" disabled={!fillFrom || !fillTo} onClick={() => quickFill(daysBetween(fillFrom, fillTo), true)}>Add range</Button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400">Click or drag across days to mark <b className="text-slate-600">{editPerson?.name}</b> as free. Start a drag on a marked day to clear.</p>
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
            <span className="text-xs text-slate-400">Hover a day to see who’s in. Drag across days to pick dates.</span>
          </div>
        )}
        {mode === 'heatmap' && selection && (
          <SelectionBar range={selection} people={people} pickLabel={pickLabel} onPick={() => { onPick(selection); setSelection(null); }} onClear={() => setSelection(null)} />
        )}

        <SeasonCalendar start={start} end={end} renderDay={renderDay} onDayDown={onDayDown} onDayEnter={onDayEnter} onLeave={() => setHoverDay(null)} />
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
              {people.map((f) => {
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
                <WindowRow key={w.start} w={w} rank={i + 1} people={people} pickLabel={pickLabel} onHover={setPreviewRange} onPick={() => onPick({ start: w.start, end: w.end })} />
              ))}
            </ol>
          )}
        </div>
        {aside}
      </aside>

      {hoverDay && mode === 'heatmap' && <DayTooltip {...hoverDay} people={people} />}
    </div>
  );
}

/** The dates dragged out on the heatmap: who can make all of them, and a button to use them. */
function SelectionBar({ range, people, pickLabel, onPick, onClear }: { range: DateRange; people: VacationPerson[]; pickLabel: string; onPick: () => void; onClear: () => void }) {
  const days = daysBetween(range.start, range.end);
  const nights = nightsOf(range);
  const free = people.filter((f) => days.every((d) => f.availability.includes(d)));
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-900/10 bg-slate-50 p-3">
      <div>
        <div className="text-sm font-bold">{formatRange(range)}</div>
        <div className="text-xs text-slate-500">{nights} night{nights === 1 ? '' : 's'} · {free.length}/{people.length} free every day</div>
      </div>
      <div className="flex -space-x-1.5">
        {free.map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={24} ring />)}
      </div>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClear}><X size={14} /> Clear</Button>
        <Button size="sm" variant="primary" disabled={nights < 1} onClick={onPick}>{pickLabel} <ArrowRight size={13} /></Button>
      </div>
    </div>
  );
}

function WindowRow({ w, rank, people, pickLabel, onHover, onPick }: {
  w: Window; rank: number; people: VacationPerson[]; pickLabel: string; onHover: (r: DateRange | null) => void; onPick: () => void;
}) {
  const missing = people.filter((f) => !w.attendeeIds.includes(f.id));
  const total = people.length;
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
          {people.filter((f) => w.attendeeIds.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={24} ring />)}
        </div>
        <Button size="sm" variant={rank === 1 ? 'primary' : 'secondary'} onClick={onPick}>
          {pickLabel} <ArrowRight size={13} />
        </Button>
      </div>
      {missing.length > 0 && <div className="mt-1.5 text-xs text-slate-400">Missing: {missing.map((f) => f.name).join(', ')}</div>}
    </li>
  );
}

function DayTooltip({ iso, x, y, people }: { iso: ISODate; x: number; y: number; people: VacationPerson[] }) {
  const free = people.filter((f) => f.availability.includes(iso));
  const out = people.filter((f) => !f.availability.includes(iso));
  return (
    <div className="pointer-events-none fixed z-50 w-60 -translate-x-1/2 rounded-2xl border border-slate-100 bg-white/95 p-3.5 text-xs shadow-lift backdrop-blur" style={{ left: x, top: y + 8 }}>
      <div className="mb-2 font-bold text-slate-900">{format(fromISO(iso), 'EEEE d MMM')} · {free.length}/{people.length} free</div>
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
