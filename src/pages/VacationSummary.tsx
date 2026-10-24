import { ArrowLeft, ChevronRight, ClipboardList, Users } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import CostBar, { COST_COLORS } from '../components/CostBar';
import { lessonDaysLabel, lessonTitle } from '../components/LessonEditor';
import { PdfButton, PdfStatus, usePdfExport, useReportData } from '../components/PdfExport';
import { FriendReport, GroupReport } from '../components/Reports';
import { Avatar, Badge, Button, Mountains, Stat } from '../components/ui';
import { gasPerVehicle, vehiclesNeeded, type Combo, type FriendCost } from '../lib/combinations';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { gearLabel, liftLabel, stayLabel, statusOf, transferLabel } from '../lib/labels';
import { fileSafe } from '../lib/pdf';
import { vacationPlan } from '../lib/plan';
import { addRange, cx, money, moneyRange, range } from '../lib/util';
import { pricedTrip, useActiveWinter, useConverter, useStore, useTripsOf, useVacation, useVacationPeople } from '../store/useStore';
import type { FlightOption, PricedTrip, Range, WinterFriend } from '../types';

/** The chosen plan at a glance: everything to book for the planner, and each rider's own view. */
export default function VacationSummary() {
  const { vacationId } = useParams();
  const [params, setParams] = useSearchParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const friends = useVacationPeople(vacation);
  const trips = useTripsOf(vacationId);
  const resorts = useStore((s) => s.resorts);
  const cv = useConverter();
  const plan = vacation ? vacationPlan(vacation, trips, friends, cv) : null;
  const data = useReportData(vacation!, plan, friends);
  const exporter = usePdfExport();
  const vacationUrl = `/w/${winter.id}/v/${vacationId}`;

  if (!vacation) return <div className="text-slate-500">Vacation not found. <Link to={`/w/${winter.id}`} className="text-sky-600">Back</Link></div>;

  if (!plan || !data) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <ClipboardList size={32} className="mx-auto text-sky-500" />
        <h1 className="mt-3 text-2xl font-extrabold">No plan chosen yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          The summary appears once you <b>choose a resort</b> for {vacation.name} and <b>select a combination</b> in its Trip comparison.
        </p>
        <Link to={vacationUrl}><Button variant="primary" className="mt-5"><ArrowLeft size={15} /> Back to {vacation.name}</Button></Link>
      </div>
    );
  }

  const pt = pricedTrip(plan.trip, vacation, cv);
  const resort = resorts.find((r) => r.id === plan.trip.resortId);
  const going = friends;
  const riderId = params.get('rider');
  const rider = going.find((f) => f.id === riderId) ?? null;
  const base = fileSafe(`${vacation.name}-${resort?.name ?? ''}`);
  const st = statusOf(vacation.status);
  const show = (id: string | null) => setParams(id ? { rider: id } : {}, { replace: true });

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
        <Link to={`/w/${winter.id}`} className="hover:text-slate-800">Winter {winter.year}</Link>
        <ChevronRight size={14} />
        <Link to={vacationUrl} className="hover:text-slate-800">{vacation.name}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700">Summary</span>
      </div>

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-8 pb-20 pt-8 text-white shadow-lift">
        <Mountains className="absolute inset-x-0 bottom-0 h-24 w-full text-white" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">❄ Vacation summary · {st.label}</div>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{vacation.name}</h1>
            <div className="mt-2 text-white/90">
              {resort?.name}, {resort?.country} · {formatRange(vacation.dates)} · {nightsOf(vacation.dates)} nights · {going.length} riders
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PdfButton id="group" exporter={exporter} className="border-transparent" onClick={() => exporter.run('group', [<GroupReport data={data} />], `${base}-group-summary.pdf`)}>
              Group PDF
            </PdfButton>
          </div>
        </div>
      </div>

      {/* View switcher */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => show(null)}
          className={cx('flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition', !rider ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
        >
          <Users size={15} /> Everyone (planner)
        </button>
        {going.map((f) => (
          <button
            key={f.id}
            onClick={() => show(f.id)}
            className={cx('flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold transition', rider?.id === f.id ? 'border-transparent text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
            style={rider?.id === f.id ? { background: f.color } : undefined}
          >
            <Avatar name={f.name} color={f.color} size={26} ring={rider?.id === f.id} /> {f.name}
          </button>
        ))}
      </div>

      <div className="mb-4"><PdfStatus exporter={exporter} /></div>

      {rider ? (
        <RiderView
          friend={rider}
          cost={plan.combo.costs.find((c) => c.friendId === rider.id)!}
          combo={plan.combo}
          onPdf={() => exporter.run(rider.id, [<FriendReport data={data} friendId={rider.id} />], `${base}-${fileSafe(rider.name)}.pdf`)}
          exporter={exporter}
        />
      ) : (
        <PlannerView combo={plan.combo} trip={pt} friends={going} onRider={show} />
      )}
    </div>
  );
}

/* ───────────────────────── Planner ───────────────────────── */

interface BookItem {
  icon: string;
  title: string;
  details: string[];
  qty: string;
  total: Range;
  riders: string[];
}

function PlannerView({ combo, trip, friends, onRider }: { combo: Combo; trip: PricedTrip; friends: WinterFriend[]; onRider: (id: string) => void }) {
  const currency = useStore((s) => s.settings.currency);
  const m = (n: number) => money(n, currency);
  const mr = (r: Range) => moneyRange(r, currency);
  const costs = combo.costs;
  const people = Math.max(1, costs.length);
  const sum = (fn: (c: FriendCost) => number) => costs.reduce((s, c) => s + fn(c), 0);
  const items = bookingItems(combo, trip, people, currency);
  const categories: [string, Range, string][] = [
    ['Flights & bags', range(sum((c) => c.flights + c.luggage)), COST_COLORS.flight],
    ['Transfer', range(sum((c) => c.transfer)), COST_COLORS.transfer],
    ['Hotel', range(sum((c) => c.hotel)), COST_COLORS.hotel],
    ['Ski passes', range(sum((c) => c.skiPass)), COST_COLORS.liftPass],
    ['Rental', range(sum((c) => c.rental)), '#64748b'],
    ['Lessons', range(sum((c) => c.lessons)), '#f43f5e'],
    ['Expenses', costs.reduce((s, c) => addRange(s, c.expenses), range(0)), '#fb923c'],
  ];
  const over = costs.filter((c) => c.overBy > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Group total" value={mr(combo.groupTotal)} />
        <Stat label="Average per person" value={mr(combo.perPerson)} />
        <Stat label="Riders" value={costs.length} sub={`${nightsOf(trip.dates)} nights · ${skiDaysOf(trip.dates)} ski days`} />
        <Stat label="Over budget" value={over ? `${over} rider${over > 1 ? 's' : ''}` : 'No one'} sub={over ? 'see below' : 'everyone fits'} />
      </div>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-extrabold">Where the money goes</h2>
        <CostBar parts={combo.parts} max={Object.values(combo.parts).reduce((a, b) => a + b, 0)} height={12} />
        <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {categories.filter(([, r]) => r.max > 0).map(([label, r, color]) => (
            <div key={label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</span>
              <span className="font-semibold">{mr(r)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-extrabold">What to book</h2>
        <p className="mb-4 text-sm text-slate-500">Everything in the chosen plan, with quantities and the group’s total for each.</p>
        <div className="divide-y divide-slate-100">
          {items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-start gap-4 py-3">
              <span className="text-2xl">{it.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{it.title}</div>
                {it.details.filter(Boolean).map((d) => <div key={d} className="text-xs text-slate-500">{d}</div>)}
                <div className="mt-1.5 flex -space-x-1">
                  {friends.filter((f) => it.riders.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={20} ring />)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500">{it.qty}</div>
                <div className="font-extrabold">{mr(it.total)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold">
          <span>Total</span><span>{mr(combo.groupTotal)}</span>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-6 pb-2 pt-5 text-lg font-extrabold">Per rider</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-2.5">Rider</th>
                <th className="px-3 py-2.5 text-right">Travel & stay</th>
                <th className="px-3 py-2.5 text-right">Skiing</th>
                <th className="px-3 py-2.5 text-right">Extras</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Budget</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.map((c) => {
                const f = friends.find((x) => x.id === c.friendId)!;
                return (
                  <tr key={c.friendId} className="cursor-pointer hover:bg-slate-50/70" onClick={() => onRider(f.id)}>
                    <td className="px-6 py-3"><span className="flex items-center gap-2 font-semibold"><Avatar name={f.name} color={f.color} size={26} /> {f.name}</span></td>
                    <td className="px-3 py-3 text-right">{m(c.flights + c.luggage + c.transfer + c.hotel)}</td>
                    <td className="px-3 py-3 text-right">{m(c.skiPass + c.rental + c.lessons)}</td>
                    <td className="px-3 py-3 text-right text-slate-500">{c.expenses.max ? mr(c.expenses) : '–'}</td>
                    <td className="px-3 py-3 text-right font-bold">{mr(c.total)}</td>
                    <td className={cx('px-3 py-3 text-right text-xs font-semibold', c.overBy ? 'text-rose-600' : c.mayExceed ? 'text-amber-600' : 'text-emerald-600')}>
                      {c.budget ? (c.overBy ? `${m(c.overBy)} over` : c.mayExceed ? 'may go over' : `${m(c.budget - c.total.max)} left`) : '–'}
                    </td>
                    <td className="px-3 py-3 text-right"><ChevronRight size={16} className="text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Turns the chosen combination into a booking list: who takes what, how many, and the group cost. */
function bookingItems(combo: Combo, trip: PricedTrip, people: number, currency: string): BookItem[] {
  const items: BookItem[] = [];
  const costs = combo.costs;
  const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

  // flights: one line per flight actually taken, with its riders
  const byFlight = new Map<string, { flight: FlightOption; riders: string[] }>();
  for (const c of costs) {
    for (const f of [c.outbound, c.ret]) {
      if (!f) continue;
      const entry = byFlight.get(f.id) ?? { flight: f, riders: [] };
      entry.riders.push(c.friendId);
      byFlight.set(f.id, entry);
    }
  }
  for (const { flight: f, riders } of byFlight.values()) {
    const out = f.direction === 'outbound';
    items.push({
      icon: out ? '🛫' : '🛬',
      title: `${f.airline || 'Flight'} · ${out ? `${f.homeCity || '?'} → ${f.airport}` : `${f.airport} → ${f.homeCity || '?'}`}`,
      details: [f.when, f.link],
      qty: n(riders.length, 'seat'),
      total: range(f.pricePerPerson * riders.length),
      riders,
    });
  }
  const notFlying = costs.filter((c) => !c.outbound || !c.ret);
  if (notFlying.length) {
    items.push({ icon: '🚗', title: 'Making their own way (one or both directions)', details: [], qty: n(notFlying.length, 'rider'), total: range(0), riders: notFlying.map((c) => c.friendId) });
  }

  const bags = trip.luggage.filter((b) => b.friendIds.some((id) => trip.attendeeIds.includes(id)));
  const luggage = costs.reduce((s, c) => s + c.luggage, 0);
  if (bags.length) {
    const count = (t: 'trolley' | 'checked') => bags.filter((b) => b.type === t).length;
    items.push({
      icon: '🧳',
      title: 'Luggage',
      details: [[count('checked') && n(count('checked'), 'checked bag'), count('trolley') && n(count('trolley'), 'trolley')].filter(Boolean).join(' · '), bags.some((b) => b.friendIds.length > 1) ? 'includes shared bags' : ''],
      qty: 'both ways',
      total: range(luggage),
      riders: [...new Set(bags.flatMap((b) => b.friendIds))],
    });
  }

  if (combo.transfer) {
    const t = combo.transfer;
    const vehicles = vehiclesNeeded(t, people);
    const gas = gasPerVehicle(t);
    items.push({
      icon: t.type === 'rental-car' ? '🚙' : '🚐',
      title: `${transferLabel(t.type)}${t.provider ? ` · ${t.provider}` : ''} from ${t.airport}`,
      details: [gas ? `incl. gas ≈ ${money(gas, currency)} per car` : '', t.link],
      qty: t.pricing === 'per-vehicle' || t.type === 'rental-car' ? `${n(vehicles, 'vehicle')} × ${t.vehicleCapacity} seats` : n(people, 'rider'),
      total: range(costs.reduce((s, c) => s + c.transfer, 0)),
      riders: costs.map((c) => c.friendId),
    });
  }

  if (combo.hotel) {
    const h = combo.hotel;
    const nights = nightsOf(trip.dates);
    const rooms = Math.ceil(people / Math.max(1, h.roomCapacity));
    items.push({
      icon: '🏨',
      title: h.name || 'Hotel',
      details: [stayLabel(h.type), h.rating ? '★'.repeat(h.rating) : '', liftLabel(h), h.link],
      qty: h.pricing === 'per-room' ? `${n(rooms, 'room')} × ${n(nights, 'night')}` : `${n(people, 'person', 'people')} × ${n(nights, 'night')}`,
      total: range(costs.reduce((s, c) => s + c.hotel, 0)),
      riders: costs.map((c) => c.friendId),
    });
  }

  const byPass = new Map<string, { name: string; riders: string[]; total: number }>();
  for (const c of costs) {
    if (!c.pass) continue;
    const e = byPass.get(c.pass.id) ?? { name: c.pass.name, riders: [], total: 0 };
    e.riders.push(c.friendId);
    e.total += c.skiPass;
    byPass.set(c.pass.id, e);
  }
  for (const p of byPass.values()) items.push({ icon: '🎟️', title: `Ski pass · ${p.name}`, details: [], qty: n(p.riders.length, 'pass', 'passes'), total: range(p.total), riders: p.riders });

  const byStore = new Map<string, { name: string; riders: string[]; total: number }>();
  for (const c of costs) {
    if (!c.quote || !c.rental) continue;
    const e = byStore.get(c.quote.shop.id) ?? { name: c.quote.shop.name, riders: [], total: 0 };
    e.riders.push(c.friendId);
    e.total += c.rental;
    byStore.set(c.quote.shop.id, e);
  }
  for (const s of byStore.values()) items.push({ icon: '🎿', title: `Rental · ${s.name}`, details: [], qty: n(s.riders.length, 'rider'), total: range(s.total), riders: s.riders });

  const byLesson = new Map<string, { title: string; store: string; days: string; riders: string[]; total: number }>();
  for (const c of costs) {
    for (const l of c.lessonLines) {
      const e = byLesson.get(l.lesson.id) ?? { title: lessonTitle(l.lesson), store: l.shop.name, days: lessonDaysLabel(l.lesson), riders: [], total: 0 };
      e.riders.push(c.friendId);
      e.total += l.amount;
      byLesson.set(l.lesson.id, e);
    }
  }
  for (const l of byLesson.values()) items.push({ icon: '🎓', title: `${l.title} · ${l.store}`, details: [l.days], qty: n(l.riders.length, 'rider'), total: range(l.total), riders: l.riders });

  for (const e of trip.expenses) {
    const lines = costs.flatMap((c) => c.expenseLines.filter((l) => l.expense.id === e.id).map((l) => ({ id: c.friendId, amount: l.amount })));
    if (!lines.length) continue;
    items.push({
      icon: '💸',
      title: e.name,
      details: [e.split === 'shared' ? 'Shared' : 'Each person pays', e.notes],
      qty: n(lines.length, 'rider'),
      total: lines.reduce((s, l) => addRange(s, l.amount), range(0)),
      riders: lines.map((l) => l.id),
    });
  }
  return items;
}

/* ───────────────────────── One rider ───────────────────────── */

function RiderView({ friend: f, cost: c, combo, onPdf, exporter }: {
  friend: WinterFriend; cost: FriendCost; combo: Combo; onPdf: () => void; exporter: ReturnType<typeof usePdfExport>;
}) {
  const currency = useStore((s) => s.settings.currency);
  const m = (n: number) => money(n, currency);
  const mr = (r: Range) => moneyRange(r, currency);
  const h = combo.hotel;

  const lines: { icon: string; label: string; title: string; detail?: string; amount: string | null }[] = [
    { icon: '🛫', label: 'Departure', title: c.outbound ? `${c.outbound.airline || 'Flight'} · ${c.outbound.homeCity || '?'} → ${c.outbound.airport}` : 'Making own way there', detail: c.outbound?.when, amount: c.outbound ? m(c.outbound.pricePerPerson) : null },
    { icon: '🛬', label: 'Return', title: c.ret ? `${c.ret.airline || 'Flight'} · ${c.ret.airport} → ${c.ret.homeCity || '?'}` : 'Making own way back', detail: c.ret?.when, amount: c.ret ? m(c.ret.pricePerPerson) : null },
    ...(c.luggage ? [{ icon: '🧳', label: 'Luggage', title: 'Your share of bags', amount: m(c.luggage) }] : []),
    ...(combo.transfer ? [{ icon: '🚐', label: 'Transfer', title: `${transferLabel(combo.transfer.type)}${combo.transfer.provider ? ` · ${combo.transfer.provider}` : ''}`, detail: gasPerVehicle(combo.transfer) ? 'Includes your share of gas' : undefined, amount: m(c.transfer) }] : []),
    ...(h ? [{ icon: '🏨', label: 'Stay', title: h.name || 'Hotel', detail: [stayLabel(h.type), h.rating ? '★'.repeat(h.rating) : '', liftLabel(h)].filter(Boolean).join(' · '), amount: m(c.hotel) }] : []),
    ...(c.pass ? [{ icon: '🎟️', label: 'Ski pass', title: c.pass.name, amount: m(c.skiPass) }] : []),
    ...(c.quote && c.rental ? [{ icon: '🎿', label: 'Rental', title: c.quote.shop.name, detail: [f.gear.equipment && (f.sport === 'snowboard' ? 'Snowboard' : 'Skis'), ...f.gear.pieces.map((p) => gearLabel(p))].filter(Boolean).join(' · '), amount: m(c.rental) }] : []),
    ...c.lessonLines.map((l) => ({ icon: '🎓', label: 'Lesson', title: `${lessonTitle(l.lesson)} · ${l.shop.name}`, detail: lessonDaysLabel(l.lesson), amount: m(l.amount) })),
    ...c.expenseLines.map((l) => ({ icon: '💸', label: 'Expense', title: l.expense.name, detail: l.expense.split === 'shared' ? 'Your share' : undefined, amount: mr(l.amount) })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-extrabold">{f.name}’s trip</h2>
        <div className="divide-y divide-slate-100">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start gap-4 py-3">
              <span className="text-xl">{l.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l.label}</div>
                <div className="font-semibold">{l.title}</div>
                {l.detail && <div className="text-xs text-slate-500">{l.detail}</div>}
              </div>
              <div className="font-bold">{l.amount ?? <span className="text-slate-300">–</span>}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-lg font-extrabold">
          <span>Total</span><span>{mr(c.total)}</span>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="card p-6">
          <div className="label">Total for {f.name}</div>
          <div className="text-4xl font-extrabold tracking-tight">{mr(c.total)}</div>
          {c.budget > 0 ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cx('h-full rounded-full', c.overBy ? 'bg-rose-500' : c.mayExceed ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${Math.min(100, (c.total.max / c.budget) * 100)}%` }} />
              </div>
              <div className={cx('mt-1 text-sm font-semibold', c.overBy ? 'text-rose-600' : c.mayExceed ? 'text-amber-600' : 'text-emerald-600')}>
                {c.overBy ? `${m(c.overBy)} over the ${m(c.budget)} budget` : c.mayExceed ? `May go over the ${m(c.budget)} budget` : `${m(c.budget - c.total.max)} left of ${m(c.budget)}`}
              </div>
            </div>
          ) : (
            <Badge className="mt-3">No budget set</Badge>
          )}
          <PdfButton id={f.id} exporter={exporter} variant="primary" className="mt-5 w-full" onClick={onPdf}>
            Download {f.name}’s PDF
          </PdfButton>
        </div>
      </aside>
    </div>
  );
}

