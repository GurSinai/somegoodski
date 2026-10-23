import { format } from 'date-fns';
import type { ReactNode } from 'react';
import type { Combo, FriendCost } from '../lib/combinations';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { boardLabel, gearLabel, transferLabel } from '../lib/labels';
import { addRange, money, moneyRange, range } from '../lib/util';
import type { Airport, FlightOption, Range, Resort, Vacation, WinterFriend } from '../types';
import { COST_COLORS } from './CostBar';
import { lessonDaysLabel, lessonTitle } from './LessonEditor';

export interface ReportData {
  vacation: Vacation;
  resort: Resort | undefined;
  airport: Airport | undefined;
  combo: Combo;
  costs: FriendCost[];
  friends: WinterFriend[];
  currency: string;
}

/** Fixed-width A4 sheet. Kept free of app chrome so it rasterizes cleanly. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }} className="flex flex-col bg-white text-slate-800">
      {children}
      <div className="mt-auto px-12 pb-7 pt-3 text-[10px] text-slate-400">Generated with SkiPlanner · {format(new Date(), 'd MMM yyyy')}</div>
    </div>
  );
}

function Header({ data, title, subtitle }: { data: ReportData; title: string; subtitle: string }) {
  const { vacation, resort } = data;
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-12 pb-10 pt-9 text-white">
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">❄ {subtitle}</div>
        <div className="mt-2 text-4xl font-extrabold leading-tight tracking-tight">{title}</div>
        <div className="mt-2 text-base text-white/90">
          {resort ? `${resort.name}, ${resort.country}` : ''} · {formatRange(vacation.dates)} · {nightsOf(vacation.dates)} nights
        </div>
      </div>
    </div>
  );
}

const flightTitle = (f: FlightOption, leg: 'outbound' | 'return') =>
  `${f.airline || 'Flight'} ${leg === 'outbound' ? `${f.homeCity ? `${f.homeCity} ` : ''}→ ${f.airport}` : `${f.airport} → ${f.homeCity || ''}`}`.trim();

interface PlanItem { label: string; color: string; title: string; lines: (string | undefined | null | false)[]; price: string }

function PlanGrid({ items, cols = 2 }: { items: PlanItem[]; cols?: 2 | 3 }) {
  return (
    <div className={cols === 3 ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-2 gap-3"}>
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} /> {i.label}
            </div>
            <div className="text-sm font-bold">{i.price}</div>
          </div>
          <div className="mt-1.5 text-sm font-semibold">{i.title}</div>
          {i.lines.filter(Boolean).map((l) => <div key={String(l)} className="text-xs text-slate-500">{l}</div>)}
        </div>
      ))}
    </div>
  );
}

/** The plan as one rider experiences it (their own flights, pass and shop). */
function planItems(data: ReportData, c: FriendCost | null): PlanItem[] {
  const { combo, airport, currency } = data;
  const m = (n: number) => money(n, currency);
  const out = c ? c.outbound : combo.outbound;
  const ret = c ? c.ret : combo.ret;
  const items: PlanItem[] = [
    {
      label: 'Departure', color: COST_COLORS.flight,
      title: out ? flightTitle(out, 'outbound') : 'Making own way there',
      lines: [out?.airport === combo.airport ? airport?.name : undefined, out?.when],
      price: out ? m(out.pricePerPerson) : '–',
    },
    {
      label: 'Return', color: COST_COLORS.flight,
      title: ret ? flightTitle(ret, 'return') : 'Making own way back',
      lines: [ret?.when],
      price: ret ? m(ret.pricePerPerson) : '–',
    },
    {
      label: 'Transfer', color: COST_COLORS.transfer,
      title: combo.transfer ? `${transferLabel(combo.transfer.type)}${combo.transfer.provider ? ` · ${combo.transfer.provider}` : ''}` : 'Not arranged yet',
      lines: [combo.transfer && `From ${combo.airport}`, combo.transfer?.pricing === 'per-vehicle' && 'Shared vehicle, split across the group'],
      price: m(combo.parts.transfer),
    },
    {
      label: 'Stay', color: COST_COLORS.hotel,
      title: combo.hotel?.name || 'Not booked yet',
      lines: combo.hotel ? [boardLabel(combo.hotel.board), combo.hotel.skiInOut ? 'Ski-in / ski-out' : combo.hotel.walkToLiftMin ? `${combo.hotel.walkToLiftMin} min walk to the lift` : undefined] : [],
      price: m(combo.parts.hotel),
    },
  ];
  if (c?.pass) items.push({ label: 'Ski pass', color: COST_COLORS.liftPass, title: c.pass.name, lines: [c.pass.basis === 'per-day' ? `${skiDaysOf(data.vacation.dates)} ski days` : 'Whole stay'], price: m(c.skiPass) });
  if (c?.quote && c.rental > 0) {
    const f = data.friends.find((x) => x.id === c.friendId)!;
    items.push({ label: 'Rental', color: COST_COLORS.extras, title: c.quote.shop.name, lines: [[f.gear.equipment && (f.sport === 'snowboard' ? 'snowboard' : 'skis'), ...f.gear.pieces.map((p) => gearLabel(p).toLowerCase())].filter(Boolean).join(', ')], price: m(c.rental) });
  }
  for (const l of c?.lessonLines ?? []) {
    items.push({ label: 'Lesson', color: COST_COLORS.extras, title: `${lessonTitle(l.lesson)} · ${l.shop.name}`, lines: [lessonDaysLabel(l.lesson), l.lesson.notes], price: m(l.amount) });
  }
  return items;
}

export function GroupReport({ data }: { data: ReportData }) {
  const { vacation, combo, costs, friends, currency } = data;
  const m = (n: number) => money(n, currency);
  const mr = (r: Range) => moneyRange(r, currency);
  const total = costs.reduce((s, c) => addRange(s, c.total), range(0));
  return (
    <Sheet>
      <Header data={data} title={vacation.name} subtitle="Group price summary" />
      <div className="space-y-6 px-12 pt-7">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Riders" value={String(costs.length)} />
          <Kpi label="Average per person" value={mr(combo.perPerson)} />
          <Kpi label="Group total" value={mr(total)} />
        </div>
        <section>
          <SectionTitle>The plan</SectionTitle>
          <PlanGrid items={planItems(data, null)} />
        </section>
        <section>
          <SectionTitle>Per rider</SectionTitle>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <th className="py-2">Rider</th>
                <th className="py-2 text-right">Flights & bags</th>
                <th className="py-2 text-right">Transfer & stay</th>
                <th className="py-2 text-right">Ski pass</th>
                <th className="py-2 text-right">Rental & lessons</th>
                <th className="py-2 text-right">Extras</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => {
                const f = friends.find((x) => x.id === c.friendId)!;
                return (
                  <tr key={c.friendId} className="border-b border-slate-100">
                    <td className="py-2.5"><span className="flex items-center gap-2 font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: f.color }} /> {f.name}</span></td>
                    <td className="py-2.5 text-right">{m(c.flights + c.luggage)}</td>
                    <td className="py-2.5 text-right">{m(c.transfer + c.hotel)}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.skiPass ? m(c.skiPass) : '–'}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.rental + c.lessons ? m(c.rental + c.lessons) : '–'}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.expenses.max ? mr(c.expenses) : '–'}</td>
                    <td className="py-2.5 text-right font-bold">{mr(c.total)}</td>
                    <td className={`py-2.5 text-right text-xs font-semibold ${c.overBy ? 'text-rose-600' : c.mayExceed ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {c.budget ? (c.overBy ? `${m(c.overBy)} over` : c.mayExceed ? 'may go over' : `${m(c.budget - c.total.max)} left`) : '–'}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="pt-3 font-bold" colSpan={6}>Total</td>
                <td className="pt-3 text-right text-base font-extrabold">{mr(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </Sheet>
  );
}

export function FriendReport({ data, friendId }: { data: ReportData; friendId: string }) {
  const { vacation, costs, friends, currency } = data;
  const m = (n: number) => money(n, currency);
  const mr = (r: Range) => moneyRange(r, currency);
  const f = friends.find((x) => x.id === friendId)!;
  const c = costs.find((x) => x.friendId === friendId)!;
  const rows: [string, Range, string][] = [
    ['Departure flight', range(c.outbound?.pricePerPerson ?? 0), COST_COLORS.flight],
    ['Return flight', range(c.ret?.pricePerPerson ?? 0), COST_COLORS.flight],
    ['Luggage', range(c.luggage), '#38bdf8'],
    ['Transfer', range(c.transfer), COST_COLORS.transfer],
    ['Stay', range(c.hotel), COST_COLORS.hotel],
    [`Ski pass${c.pass ? ` · ${c.pass.name}` : ''}`, range(c.skiPass), COST_COLORS.liftPass],
    [`Rental${c.quote ? ` · ${c.quote.shop.name}` : ''}`, range(c.rental), '#64748b'],
    ['Lessons', range(c.lessons), COST_COLORS.extras],
    ...c.expenseLines.map((l) => [l.expense.name, l.amount, '#fb923c'] as [string, Range, string]),
  ];
  const shown = rows.filter(([, v]) => v.max > 0);
  const barTotal = shown.reduce((s, [, v]) => s + (v.min + v.max) / 2, 0) || 1;
  return (
    <Sheet>
      <Header data={data} title={`${f.name}’s ski trip`} subtitle={vacation.name} />
      <div className="space-y-6 px-12 pt-7">
        <div className="flex items-end justify-between rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 px-6 py-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600">Your total</div>
            <div className="mt-2 text-5xl font-extrabold leading-none tracking-tight">{mr(c.total)}</div>
            <div className="mt-3 text-sm text-slate-500">{nightsOf(vacation.dates)} nights · {skiDaysOf(vacation.dates)} ski days</div>
          </div>
          {c.budget > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500">Your budget {m(c.budget)}</div>
              <div className={`text-lg font-bold ${c.overBy ? 'text-rose-600' : c.mayExceed ? 'text-amber-600' : 'text-emerald-600'}`}>
                {c.overBy ? `${m(c.overBy)} over` : c.mayExceed ? 'might go over' : `${m(c.budget - c.total.max)} to spare`}
              </div>
            </div>
          )}
        </div>

        <section>
          <SectionTitle>Your breakdown</SectionTitle>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {shown.map(([label, v, color]) => <div key={label} style={{ width: `${(((v.min + v.max) / 2) / barTotal) * 100}%`, background: color }} />)}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {shown.map(([label, v, color]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-1.5"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</span></td>
                  <td className="py-1.5 text-right font-semibold">{mr(v)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-bold">Total</td>
                <td className="pt-3 text-right text-lg font-extrabold">{mr(c.total)}</td>
              </tr>
            </tbody>
          </table>
          {c.total.max !== c.total.min && <p className="mt-2 text-xs text-slate-400">Ranges are estimates (e.g. food); the final amount will land in between.</p>}
        </section>

        <section>
          <SectionTitle>Trip details</SectionTitle>
          <PlanGrid items={planItems(data, c)} cols={3} />
        </section>
      </div>
    </Sheet>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-600">{children}</div>;
}
