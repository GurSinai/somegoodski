import { AlertTriangle, ArrowDownUp, Check, ClipboardList, ExternalLink, LayoutGrid, Pin, PinOff, Rows3, Trophy, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buildCombos, withinEveryonesBudget, type Combo } from '../lib/combinations';
import { nightsOf } from '../lib/dates';
import { STAY_TYPES, liftLabel, liftRank, stayLabel, transferLabel } from '../lib/labels';
import { cx, money, moneyRange } from '../lib/util';
import { useStore } from '../store/useStore';
import type { FlightOption, PricedTrip, Vacation, WinterFriend } from '../types';
import CostBar, { CostLegend } from './CostBar';
import { Avatar, Badge, Button, Empty, Segmented, Toggle } from './ui';

type SortKey = 'total' | 'flight' | 'hotel' | 'walk' | 'drive';
type View = 'table' | 'cards';

const flightName = (f: FlightOption | null) => (f ? `${f.airline || 'Flight'} · ${f.airport}` : '—');

export default function TripComparison({ trip, vacation, friends }: { trip: PricedTrip; vacation: Vacation; friends: WinterFriend[] }) {
  const currency = useStore((s) => s.settings.currency);
  const resort = useStore((s) => s.resorts.find((r) => r.id === trip.resortId));
  const updateTrip = useStore((s) => s.updateTrip);
  const updateVacation = useStore((s) => s.updateVacation);

  const [view, setView] = useState<View>('table');
  const [sort, setSort] = useState<SortKey>('total');
  const [airport, setAirport] = useState('');
  const [maxPP, setMaxPP] = useState(0);
  const [stayType, setStayType] = useState('');
  const [skiInOut, setSkiInOut] = useState(false);
  const [inBudget, setInBudget] = useState(false);
  const [hideIncomplete, setHideIncomplete] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(trip.selectedComboId);

  const m = (n: number) => money(n, currency);
  const mr = (r: { min: number; max: number }) => moneyRange(r, currency);
  const all = useMemo(() => buildCombos(trip, friends), [trip, friends]);
  const drive = (iata: string) => resort?.airports.find((a) => a.iata === iata)?.driveTimeMin ?? 0;

  const combos = useMemo(() => {
    const list = all
      .filter((c) => !airport || c.airport === airport)
      .filter((c) => !maxPP || c.perPerson.min <= maxPP)
      .filter((c) => !stayType || c.hotel?.type === stayType)
      .filter((c) => !skiInOut || c.hotel?.skiInOut)
      .filter((c) => !hideIncomplete || !c.incomplete)
      .filter((c) => !inBudget || withinEveryonesBudget(c));
    const key = (c: Combo) =>
      sort === 'drive' ? drive(c.airport)
        : sort === 'walk' ? (c.hotel ? liftRank(c.hotel) : 999)
          : sort === 'flight' ? c.parts.flight
            : sort === 'hotel' ? c.parts.hotel
              : c.perPerson.min;
    return list.sort((a, b) => key(a) - key(b) || a.perPerson.min - b.perPerson.min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, airport, maxPP, stayType, skiInOut, hideIncomplete, inBudget, sort]);

  if (all.length === 0) {
    return (
      <Empty icon={<ArrowDownUp size={24} />} title="Nothing to compare yet">
        Add at least one departure or return flight on the Flights tab. The group’s flights are combined with transfers from the landing airport and every hotel.
      </Empty>
    );
  }

  const cheapestId = [...all].filter((c) => !c.incomplete).sort((a, b) => a.groupTotal.min - b.groupTotal.min)[0]?.id;
  const maxTotal = Math.max(...combos.map((c) => Object.values(c.parts).reduce((a, b) => a + b, 0)), 1);
  const focus = all.find((c) => c.id === focusId) ?? null;
  const pinnedCombos = pinned.map((id) => all.find((c) => c.id === id)).filter(Boolean) as Combo[];
  const togglePin = (id: string) => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const airportsUsed = [...new Set(all.map((c) => c.airport))];
  const hasRanges = all.some((c) => c.groupTotal.max !== c.groupTotal.min);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Combinations" value={String(all.length)} sub={`${airportsUsed.length} airport${airportsUsed.length > 1 ? 's' : ''}`} />
        <Summary label="Cheapest / person" value={cheapestId ? mr(all.find((c) => c.id === cheapestId)!.perPerson) : '—'} sub="average" />
        <Summary label="Group" value={`${friends.length} riders`} sub={`${nightsOf(trip.dates)} nights`} />
        <Summary label="Within everyone’s budget" value={String(all.filter(withinEveryonesBudget).length)} sub="combinations" />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <select className="input w-auto py-1.5" value={airport} onChange={(e) => setAirport(e.target.value)}>
          <option value="">All airports</option>
          {airportsUsed.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className="input w-auto py-1.5" value={stayType} onChange={(e) => setStayType(e.target.value)}>
          <option value="">Any stay</option>
          {STAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Max / person</span>
          <input type="number" className="input w-24 py-1.5" value={maxPP || ''} placeholder="any" onChange={(e) => setMaxPP(Number(e.target.value))} />
        </div>
        <Toggle checked={skiInOut} onChange={setSkiInOut} label="Ski-in/out" />
        <Toggle checked={inBudget} onChange={setInBudget} label="Within budgets" />
        <Toggle checked={hideIncomplete} onChange={setHideIncomplete} label="Hide incomplete" />
        <div className="ml-auto flex items-center gap-2">
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="total">Sort: total / person</option>
            <option value="flight">Sort: flights</option>
            <option value="hotel">Sort: hotel price</option>
            <option value="walk">Sort: closest to lift</option>
            <option value="drive">Sort: drive time</option>
          </select>
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'table', label: <Rows3 size={15} /> }, { value: 'cards', label: <LayoutGrid size={15} /> }]} />
        </div>
      </div>

      {/* Pinned side-by-side */}
      {pinnedCombos.length > 0 && (
        <div className="card overflow-x-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold"><Pin size={16} /> Side by side</h3>
            <Button size="sm" variant="ghost" onClick={() => setPinned([])}>Clear</Button>
          </div>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr>
                <th />
                {pinnedCombos.map((c) => (
                  <th key={c.id} className="px-3 pb-2 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold">{c.hotel?.name || 'No hotel'}</span>
                      <button onClick={() => togglePin(c.id)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                    </div>
                    <div className="text-xs font-normal text-slate-500">via {c.airport}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {([
                ['Departure', (c: Combo) => `${flightName(c.outbound)}${c.outbound ? ` · ${m(c.outbound.pricePerPerson)}` : ''}`],
                ['Return', (c: Combo) => `${flightName(c.ret)}${c.ret ? ` · ${m(c.ret.pricePerPerson)}` : ''}`],
                ['Transfer', (c: Combo) => (c.transfer ? `${transferLabel(c.transfer.type)} · ${m(c.parts.transfer)}` : '—')],
                ['Drive time', (c: Combo) => `${drive(c.airport)} min`],
                ['Hotel', (c: Combo) => (c.hotel ? m(c.parts.hotel) : '—')],
                ['Stay', (c: Combo) => (c.hotel ? `${stayLabel(c.hotel.type)}${c.hotel.rating ? ` ${'★'.repeat(c.hotel.rating)}` : ''}` : '—')],
                ['To the lift', (c: Combo) => (c.hotel ? liftLabel(c.hotel) || '?' : '—')],
                ['Per person (avg)', (c: Combo) => <b className="text-base">{mr(c.perPerson)}</b>],
                ['Group total', (c: Combo) => mr(c.groupTotal)],
                ['Over budget', (c: Combo) => {
                  const over = c.costs.filter((x) => x.overBy > 0).length;
                  return over ? <span className="text-rose-600">{over} people</span> : <span className="text-emerald-600">No one</span>;
                }],
              ] as [string, (c: Combo) => ReactNode][]).map(([l, fn]) => (
                <tr key={l}>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</td>
                  {pinnedCombos.map((c) => <td key={c.id} className="px-3 py-2">{fn(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          {combos.length} of {all.length} combinations · average per person{hasRanges ? ', ranges include estimated expenses' : ''}
        </div>
        <CostLegend />
      </div>

      {combos.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">No combinations match these filters.</div>
      ) : view === 'table' ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">🛫 Departure</th>
                <th className="px-3 py-3">🛬 Return</th>
                <th className="px-3 py-3">Transfer</th>
                <th className="px-3 py-3">Hotel</th>
                <th className="w-44 px-3 py-3">Breakdown</th>
                <th className="px-3 py-3 text-right">Per person</th>
                <th className="px-3 py-3 text-right">Group</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combos.map((c) => {
                const selected = trip.selectedComboId === c.id;
                return (
                  <tr key={c.id} onClick={() => setFocusId(c.id)}
                    className={cx('cursor-pointer transition', focusId === c.id ? 'bg-sky-50/70' : 'hover:bg-slate-50/70', selected && 'bg-emerald-50/70')}>
                    <td className="px-4 py-3"><LegCell f={c.outbound} m={m} /></td>
                    <td className="px-3 py-3"><LegCell f={c.ret} m={m} /></td>
                    <td className="px-3 py-3">
                      {c.transfer ? (
                        <><div>{transferLabel(c.transfer.type)}</div><div className="text-xs text-slate-500">{m(c.parts.transfer)} · {drive(c.airport)} min</div></>
                      ) : <Badge color="amber"><AlertTriangle size={11} /> none from {c.airport}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      {c.hotel ? (
                        <>
                          <div className="flex items-center gap-1.5">{c.hotel.name || 'Hotel'}{c.hotel.skiInOut && <Badge color="green">ski-in/out</Badge>}</div>
                          <div className="text-xs text-slate-500">{m(c.parts.hotel)} · {stayLabel(c.hotel.type)}{!c.hotel.skiInOut && c.hotel.liftMin ? ` · ${c.hotel.walkable ? '🚶' : '🚗'}${c.hotel.liftMin}′` : ''}</div>
                        </>
                      ) : <Badge color="amber"><AlertTriangle size={11} /> no hotel</Badge>}
                    </td>
                    <td className="px-3 py-3"><CostBar parts={c.parts} max={maxTotal} /></td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-base font-extrabold">
                        {c.id === cheapestId && <span title="Cheapest complete option"><Trophy size={15} className="text-amber-500" /></span>}
                        {mr(c.perPerson)}
                      </div>
                      {!withinEveryonesBudget(c) && <div className="text-xs text-rose-500">over someone’s budget</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{mr(c.groupTotal)}</td>
                    <td className="px-3 py-3">
                      <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }}
                        className={cx('rounded p-1.5 transition', pinned.includes(c.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-600')}
                        title={pinned.includes(c.id) ? 'Unpin' : 'Pin to compare (max 3)'}>
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
            <div key={c.id} onClick={() => setFocusId(c.id)}
              className={cx('card cursor-pointer p-5 transition hover:shadow-lift', focusId === c.id && 'ring-2 ring-sky-300', trip.selectedComboId === c.id && 'border-emerald-200 bg-emerald-50/50')}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{c.hotel?.name || 'No hotel yet'}</div>
                  <div className="text-xs text-slate-500">via {c.airport} · {drive(c.airport)} min drive</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }} className={pinned.includes(c.id) ? 'text-sky-600' : 'text-slate-300 hover:text-slate-600'}><Pin size={15} /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-extrabold">{mr(c.perPerson)}</span>
                <span className="text-xs text-slate-500">avg / person</span>
                {c.id === cheapestId && <Badge color="amber"><Trophy size={11} /> Cheapest</Badge>}
              </div>
              <div className="mt-2"><CostBar parts={c.parts} max={maxTotal} height={8} /></div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <Line k="🛫 Departure" v={c.outbound ? `${flightName(c.outbound)} · ${m(c.outbound.pricePerPerson)}` : 'missing'} warn={!c.outbound} />
                <Line k="🛬 Return" v={c.ret ? `${flightName(c.ret)} · ${m(c.ret.pricePerPerson)}` : 'missing'} warn={!c.ret} />
                <Line k="🚐 Transfer" v={c.transfer ? `${transferLabel(c.transfer.type)} · ${m(c.parts.transfer)}` : 'missing'} warn={!c.transfer} />
                <Line k="🏨 Hotel" v={c.hotel ? `${stayLabel(c.hotel.type)}${c.hotel.skiInOut ? ' · ski-in/out' : ''} · ${m(c.parts.hotel)}` : 'missing'} warn={!c.hotel} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Focused combo: per-friend breakdown */}
      {focus && (
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="label mb-1">Per-rider breakdown</div>
              <div className="text-lg font-bold">
                {flightName(focus.outbound)} → {focus.transfer ? transferLabel(focus.transfer.type) : '?'} → {focus.hotel?.name || '?'} → {flightName(focus.ret)}
              </div>
              <div className="mt-1 flex gap-3 text-xs">
                {([['Departure', focus.outbound?.link], ['Return', focus.ret?.link], ['Transfer', focus.transfer?.link], ['Hotel', focus.hotel?.link]] as const)
                  .filter(([, l]) => l)
                  .map(([name, l]) => (
                    <a key={name} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline">{name} <ExternalLink size={11} /></a>
                  ))}
              </div>
            </div>
            {trip.selectedComboId === focus.id ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => updateTrip(trip.id, { selectedComboId: null })}>
                  <Check size={16} className="text-emerald-600" /> Selected plan (click to unselect)
                </Button>
                {vacation.selectedTripId === trip.id && (
                  <Link to={`/w/${vacation.winterId}/v/${vacation.id}/summary`}>
                    <Button variant="accent"><ClipboardList size={16} /> Vacation summary →</Button>
                  </Link>
                )}
              </div>
            ) : (
              <Button variant="accent" onClick={() => {
                updateTrip(trip.id, { selectedComboId: focus.id });
                // the first resort with a chosen combination becomes the vacation's pick
                if (!vacation.selectedTripId) updateVacation(vacation.id, { selectedTripId: trip.id });
              }}>
                <Trophy size={16} /> Select this combination
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2">Rider</th>
                  <th className="py-2 text-right">Flights</th>
                  <th className="py-2 text-right">Bags</th>
                  <th className="py-2 text-right">Transfer + hotel</th>
                  <th className="py-2 text-right">Ski pass</th>
                  <th className="py-2 text-right">Rental + lessons</th>
                  <th className="py-2 text-right">Extras</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="w-40 py-2 pl-4">vs budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {focus.costs.map((fc) => {
                  const f = friends.find((x) => x.id === fc.friendId)!;
                  const pct = fc.budget ? Math.min(100, (fc.total.max / fc.budget) * 100) : 0;
                  const ownFlight = (leg: 'outbound' | 'return', taken: FlightOption | null, groupF: FlightOption | null) =>
                    taken?.id !== groupF?.id ? (taken ? `${leg === 'outbound' ? '🛫' : '🛬'} ${taken.airline || 'own'}` : `no ${leg === 'outbound' ? 'departure' : 'return'}`) : null;
                  const notes = [ownFlight('outbound', fc.outbound, focus.outbound), ownFlight('return', fc.ret, focus.ret)].filter(Boolean);
                  return (
                    <tr key={fc.friendId}>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2 font-semibold"><Avatar name={f.name} color={f.color} size={26} /> {f.name}</span>
                        {notes.length > 0 && <div className="ml-8 text-[11px] text-sky-600">{notes.join(' · ')}</div>}
                      </td>
                      <td className="py-2.5 text-right">{m(fc.flights)}</td>
                      <td className="py-2.5 text-right text-slate-500">{fc.luggage ? m(fc.luggage) : '🎒'}</td>
                      <td className="py-2.5 text-right">{m(fc.transfer + fc.hotel)}</td>
                      <td className="py-2.5 text-right text-slate-500" title={fc.pass?.name}>{fc.skiPass ? m(fc.skiPass) : '—'}</td>
                      <td className="py-2.5 text-right text-slate-500" title={fc.quote?.shop.name}>{fc.rental + fc.lessons ? m(fc.rental + fc.lessons) : '—'}</td>
                      <td className="py-2.5 text-right text-slate-500" title={fc.expenseLines.map((l) => `${l.expense.name}: ${mr(l.amount)}`).join('\n')}>{fc.expenses.max ? mr(fc.expenses) : '—'}</td>
                      <td className="py-2.5 text-right font-bold">{mr(fc.total)}</td>
                      <td className="py-2.5 pl-4">
                        {fc.budget ? (
                          <div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className={cx('h-full rounded-full', fc.overBy ? 'bg-rose-500' : fc.mayExceed ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                            </div>
                            <div className={cx('mt-0.5 text-xs', fc.overBy ? 'text-rose-600' : fc.mayExceed ? 'text-amber-600' : 'text-emerald-600')}>
                              {fc.overBy ? `${m(fc.overBy)} over` : fc.mayExceed ? 'may go over' : `${m(fc.budget - fc.total.max)} left`}
                            </div>
                          </div>
                        ) : <span className="text-xs text-slate-400">no budget</span>}
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

function LegCell({ f, m }: { f: FlightOption | null; m: (n: number) => string }) {
  if (!f) return <Badge color="amber"><AlertTriangle size={11} /> none</Badge>;
  return (
    <>
      <div className="font-semibold">{f.airline || 'Flight'} <span className="font-normal text-slate-400">{f.airport}</span></div>
      <div className="text-xs text-slate-500">{m(f.pricePerPerson)}{f.when ? ` · ${f.when}` : ''}</div>
    </>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
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
