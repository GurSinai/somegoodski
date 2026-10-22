import { AlertTriangle, ArrowDownUp, Check, ExternalLink, LayoutGrid, Pin, PinOff, Rows3, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildCombos, friendCosts, withinEveryonesBudget, type Combo } from '../lib/combinations';
import { nightsOf } from '../lib/dates';
import { BOARDS, TRANSFER_TYPES } from '../lib/labels';
import { cx, money } from '../lib/util';
import { useStore } from '../store/useStore';
import type { Trip } from '../types';
import CostBar, { CostLegend } from './CostBar';
import { Avatar, Badge, Button, Empty, Segmented, Toggle } from './ui';

type SortKey = 'total' | 'flight' | 'transfer' | 'hotel' | 'drive';
type View = 'table' | 'cards';

export default function TripComparison({ trip }: { trip: Trip }) {
  const friends = useStore((s) => s.friends);
  const currency = useStore((s) => s.settings.currency);
  const resort = useStore((s) => s.resorts.find((r) => r.id === trip.resortId));
  const updateTrip = useStore((s) => s.updateTrip);

  const [view, setView] = useState<View>('table');
  const [sort, setSort] = useState<SortKey>('total');
  const [airport, setAirport] = useState('');
  const [maxPP, setMaxPP] = useState(0);
  const [board, setBoard] = useState('');
  const [skiInOut, setSkiInOut] = useState(false);
  const [inBudget, setInBudget] = useState(false);
  const [hideIncomplete, setHideIncomplete] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(trip.selectedComboId);

  const m = (n: number) => money(n, currency);
  const all = useMemo(() => buildCombos(trip), [trip]);
  const drive = (iata: string) => resort?.airports.find((a) => a.iata === iata)?.driveTimeMin ?? 0;

  const combos = useMemo(() => {
    const list = all
      .filter((c) => !airport || c.airport === airport)
      .filter((c) => !maxPP || c.perPerson.total <= maxPP)
      .filter((c) => !board || c.hotel?.board === board)
      .filter((c) => !skiInOut || c.hotel?.skiInOut)
      .filter((c) => !hideIncomplete || !c.incomplete)
      .filter((c) => !inBudget || withinEveryonesBudget(c, friends, trip));
    const key = (c: Combo) => (sort === 'drive' ? drive(c.airport) : sort === 'total' ? c.perPerson.total : c.perPerson[sort]);
    return list.sort((a, b) => key(a) - key(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, airport, maxPP, board, skiInOut, hideIncomplete, inBudget, sort, friends, trip]);

  if (trip.flights.length === 0) {
    return (
      <Empty icon={<ArrowDownUp size={24} />} title="Nothing to compare yet">
        Add at least one flight on the Options tab. Each flight is combined with the transfers from its airport and every hotel.
      </Empty>
    );
  }

  const cheapestId = all.filter((c) => !c.incomplete).sort((a, b) => a.perPerson.total - b.perPerson.total)[0]?.id;
  const maxTotal = Math.max(...combos.map((c) => c.perPerson.total), 1);
  const focus = all.find((c) => c.id === focusId) ?? null;
  const pinnedCombos = pinned.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Combo[];
  const togglePin = (id: string) => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const airportsUsed = [...new Set(all.map((c) => c.airport))];
  const people = trip.attendeeIds.length;

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Combinations" value={String(all.length)} sub={`${airportsUsed.length} airport${airportsUsed.length > 1 ? 's' : ''}`} />
        <Summary label="Cheapest / person" value={cheapestId ? m(all.find((c) => c.id === cheapestId)!.perPerson.total) : '—'} />
        <Summary label="Group" value={`${people} people`} sub={`${nightsOf(trip.dates)} nights`} />
        <Summary
          label="Within everyone's budget"
          value={String(all.filter((c) => withinEveryonesBudget(c, friends, trip)).length)}
          sub="combinations"
        />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <select className="input w-auto py-1.5" value={airport} onChange={(e) => setAirport(e.target.value)}>
          <option value="">All airports</option>
          {airportsUsed.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="input w-auto py-1.5" value={board} onChange={(e) => setBoard(e.target.value)}>
          <option value="">Any board</option>
          {BOARDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Max / person</span>
          <input type="number" className="input w-24 py-1.5" value={maxPP || ''} placeholder="any" onChange={(e) => setMaxPP(Number(e.target.value))} />
        </div>
        <Toggle checked={skiInOut} onChange={setSkiInOut} label="Ski-in/out" />
        <Toggle checked={inBudget} onChange={setInBudget} label="Within everyone's budget" />
        <Toggle checked={hideIncomplete} onChange={setHideIncomplete} label="Hide incomplete" />
        <div className="ml-auto flex items-center gap-2">
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="total">Sort: total / person</option>
            <option value="flight">Sort: flight</option>
            <option value="transfer">Sort: transfer</option>
            <option value="hotel">Sort: hotel</option>
            <option value="drive">Sort: drive time</option>
          </select>
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[{ value: 'table', label: <Rows3 size={15} /> }, { value: 'cards', label: <LayoutGrid size={15} /> }]}
          />
        </div>
      </div>

      {/* Pinned side-by-side */}
      {pinnedCombos.length > 0 && (
        <div className="card overflow-x-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold"><Pin size={16} /> Side by side</h3>
            <Button size="sm" variant="ghost" onClick={() => setPinned([])}>Clear</Button>
          </div>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr>
                <th />
                {pinnedCombos.map((c) => (
                  <th key={c.id} className="px-3 pb-2 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{c.hotel?.name || 'No hotel'}</span>
                      <button onClick={() => togglePin(c.id)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                    </div>
                    <div className="text-xs font-normal text-slate-500">via {c.airport}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {([
                ['Flight', (c: Combo) => `${c.flight.airline || '—'} · ${m(c.perPerson.flight)}`],
                ['Transfer', (c: Combo) => (c.transfer ? `${label(c.transfer.type)} · ${m(c.perPerson.transfer)}` : '—')],
                ['Drive time', (c: Combo) => `${drive(c.airport)} min`],
                ['Hotel', (c: Combo) => (c.hotel ? m(c.perPerson.hotel) : '—')],
                ['Board', (c: Combo) => (c.hotel ? BOARDS.find((b) => b.value === c.hotel!.board)?.label : '—')],
                ['Ski-in/out', (c: Combo) => (c.hotel?.skiInOut ? 'Yes' : c.hotel ? `${c.hotel.distanceToLiftM || '?'} m to lift` : '—')],
                ['Lift pass', (c: Combo) => m(c.perPerson.liftPass)],
                ['Per person', (c: Combo) => <b className="text-base">{m(c.perPerson.total)}</b>],
                ['Group total', (c: Combo) => m(c.groupTotal)],
                ['Over budget', (c: Combo) => {
                  const over = friendCosts(c, friends, trip).filter((x) => x.overBy > 0).length;
                  return over ? <span className="text-rose-600">{over} people</span> : <span className="text-emerald-600">No one</span>;
                }],
              ] as [string, (c: Combo) => React.ReactNode][]).map(([l, fn]) => (
                <tr key={l}>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs font-medium uppercase tracking-wide text-slate-500">{l}</td>
                  {pinnedCombos.map((c) => <td key={c.id} className="px-3 py-2">{fn(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{combos.length} of {all.length} combinations · prices per person</div>
        <CostLegend />
      </div>

      {combos.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">No combinations match these filters.</div>
      ) : view === 'table' ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Airport</th>
                <th className="px-3 py-3">Flight</th>
                <th className="px-3 py-3">Transfer</th>
                <th className="px-3 py-3">Hotel</th>
                <th className="w-48 px-3 py-3">Breakdown</th>
                <th className="px-3 py-3 text-right">Per person</th>
                <th className="px-3 py-3 text-right">Group</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combos.map((c) => {
                const selected = trip.selectedComboId === c.id;
                const fits = withinEveryonesBudget(c, friends, trip);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setFocusId(c.id)}
                    className={cx('cursor-pointer transition', focusId === c.id ? 'bg-sky-50' : 'hover:bg-slate-50', selected && 'bg-emerald-50/70')}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.airport}</div>
                      <div className="text-xs text-slate-500">{drive(c.airport)} min drive</div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{c.flight.airline || 'Flight'}</div>
                      <div className="text-xs text-slate-500">{m(c.perPerson.flight)}</div>
                    </td>
                    <td className="px-3 py-3">
                      {c.transfer ? (
                        <>
                          <div>{label(c.transfer.type)}</div>
                          <div className="text-xs text-slate-500">{m(c.perPerson.transfer)}</div>
                        </>
                      ) : (
                        <Badge color="amber"><AlertTriangle size={11} /> none from {c.airport}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {c.hotel ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            {c.hotel.name || 'Hotel'}
                            {c.hotel.skiInOut && <Badge color="green">ski-in/out</Badge>}
                          </div>
                          <div className="text-xs text-slate-500">{m(c.perPerson.hotel)} · {c.hotel.board}</div>
                        </>
                      ) : (
                        <Badge color="amber"><AlertTriangle size={11} /> no hotel</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3"><CostBar parts={c.perPerson} max={maxTotal} /></td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-base font-bold">
                        {c.id === cheapestId && <span title="Cheapest complete option"><Trophy size={15} className="text-amber-500" /></span>}
                        {m(c.perPerson.total)}
                      </div>
                      {!fits && <div className="text-xs text-rose-500">over someone's budget</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{m(c.groupTotal)}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(c.id); }}
                        className={cx('rounded p-1.5 transition', pinned.includes(c.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-600')}
                        title={pinned.includes(c.id) ? 'Unpin' : 'Pin to compare (max 3)'}
                      >
                        {pinned.includes(c.id) ? <PinOff size={15} /> : <Pin size={15} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {combos.map((c) => (
            <div
              key={c.id}
              onClick={() => setFocusId(c.id)}
              className={cx(
                'card cursor-pointer p-4 transition hover:shadow-md',
                focusId === c.id && 'ring-2 ring-sky-400',
                trip.selectedComboId === c.id && 'border-emerald-300 bg-emerald-50/50',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.hotel?.name || 'No hotel yet'}</div>
                  <div className="text-xs text-slate-500">via {c.airport} · {drive(c.airport)} min drive</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }} className={pinned.includes(c.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-600'}>
                  <Pin size={15} />
                </button>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{m(c.perPerson.total)}</span>
                <span className="text-xs text-slate-500">/ person</span>
                {c.id === cheapestId && <Badge color="amber"><Trophy size={11} /> Cheapest</Badge>}
              </div>
              <div className="mt-2"><CostBar parts={c.perPerson} max={maxTotal} height={8} /></div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <Line k="✈ Flight" v={`${c.flight.airline || '—'} · ${m(c.perPerson.flight)}`} />
                <Line k="🚐 Transfer" v={c.transfer ? `${label(c.transfer.type)} · ${m(c.perPerson.transfer)}` : 'missing'} warn={!c.transfer} />
                <Line k="🏨 Hotel" v={c.hotel ? `${c.hotel.board}${c.hotel.skiInOut ? ' · ski-in/out' : ''} · ${m(c.perPerson.hotel)}` : 'missing'} warn={!c.hotel} />
                {c.perPerson.liftPass > 0 && <Line k="🎟 Lift pass" v={m(c.perPerson.liftPass)} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Focused combo: per-friend breakdown */}
      {focus && (
        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Per-friend breakdown</div>
              <div className="text-lg font-semibold">
                {focus.flight.airline || 'Flight'} → {focus.airport} → {focus.transfer ? label(focus.transfer.type) : '?'} → {focus.hotel?.name || '?'}
              </div>
              <div className="mt-1 flex gap-3 text-xs">
                {([['Flight', focus.flight.link], ['Transfer', focus.transfer?.link], ['Hotel', focus.hotel?.link]] as const)
                  .filter(([, l]) => l)
                  .map(([name, l]) => (
                    <a key={name} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline">
                      {name} link <ExternalLink size={11} />
                    </a>
                  ))}
              </div>
            </div>
            {trip.selectedComboId === focus.id ? (
              <Button variant="secondary" onClick={() => updateTrip(trip.id, { selectedComboId: null })}>
                <Check size={16} className="text-emerald-600" /> Selected plan (click to unselect)
              </Button>
            ) : (
              <Button variant="primary" onClick={() => updateTrip(trip.id, { selectedComboId: focus.id, status: trip.status === 'draft' ? 'shortlisted' : trip.status })}>
                <Trophy size={16} /> Select this combination
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Friend</th>
                  <th className="py-2 text-right">Shared</th>
                  <th className="py-2 text-right">Lessons</th>
                  <th className="py-2 text-right">Rental</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Budget</th>
                  <th className="w-40 py-2 pl-4">vs budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {friendCosts(focus, friends, trip).map((fc) => {
                  const f = friends.find((x) => x.id === fc.friendId)!;
                  const pct = fc.budget ? Math.min(100, (fc.total / fc.budget) * 100) : 0;
                  return (
                    <tr key={fc.friendId}>
                      <td className="py-2"><span className="flex items-center gap-2"><Avatar name={f.name} color={f.color} size={24} /> {f.name}</span></td>
                      <td className="py-2 text-right">{m(fc.shared)}</td>
                      <td className="py-2 text-right text-slate-500">{fc.lessons ? m(fc.lessons) : '—'}</td>
                      <td className="py-2 text-right text-slate-500">{fc.rental ? m(fc.rental) : '—'}</td>
                      <td className="py-2 text-right font-semibold">{m(fc.total)}</td>
                      <td className="py-2 text-right text-slate-500">{fc.budget ? m(fc.budget) : '—'}</td>
                      <td className="py-2 pl-4">
                        {fc.budget ? (
                          <div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className={cx('h-full rounded-full', fc.overBy ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                            </div>
                            <div className={cx('mt-0.5 text-xs', fc.overBy ? 'text-rose-600' : 'text-emerald-600')}>
                              {fc.overBy ? `${m(fc.overBy)} over` : `${m(fc.budget - fc.total)} left`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">no budget</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const label = (type: string) => TRANSFER_TYPES.find((t) => t.value === type)?.label ?? type;

function Summary({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Line({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{k}</span>
      <span className={warn ? 'text-amber-600' : ''}>{v}</span>
    </div>
  );
}
