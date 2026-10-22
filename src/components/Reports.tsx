import { format } from 'date-fns';
import type { ReactNode } from 'react';
import type { Combo, FriendCost } from '../lib/combinations';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { boardLabel, transferLabel } from '../lib/labels';
import { money } from '../lib/util';
import type { Airport, Resort, Vacation, WinterFriend } from '../types';
import { COST_COLORS } from './CostBar';

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
    <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-12 pb-12 pt-9 text-white">
      <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-20 w-full">
        <path d="M0 200 L140 90 L230 140 L380 40 L520 130 L640 70 L780 150 L900 60 L1040 120 L1200 80 L1200 200 Z" fill="white" opacity="0.3" />
        <path d="M0 200 L90 150 L210 175 L330 110 L470 170 L600 120 L760 180 L880 130 L1010 170 L1200 140 L1200 200 Z" fill="white" />
      </svg>
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

function PlanBlock({ data }: { data: ReportData }) {
  const { combo, airport, currency } = data;
  const m = (n: number) => money(n, currency);
  const items = [
    {
      label: 'Flight', color: COST_COLORS.flight,
      title: `${combo.flight.airline || 'Flight'}${combo.flight.fromCity ? ` from ${combo.flight.fromCity}` : ''} → ${combo.airport}`,
      lines: [airport?.name, combo.flight.outbound && `Out: ${combo.flight.outbound}`, combo.flight.inbound && `Back: ${combo.flight.inbound}`],
      price: combo.perPerson.flight,
    },
    {
      label: 'Transfer', color: COST_COLORS.transfer,
      title: combo.transfer ? `${transferLabel(combo.transfer.type)}${combo.transfer.provider ? ` · ${combo.transfer.provider}` : ''}` : 'Not arranged yet',
      lines: [combo.transfer?.pricing === 'per-vehicle' ? 'Shared vehicle, split across the group' : undefined],
      price: combo.perPerson.transfer,
    },
    {
      label: 'Stay', color: COST_COLORS.hotel,
      title: combo.hotel?.name || 'Not booked yet',
      lines: combo.hotel ? [boardLabel(combo.hotel.board), combo.hotel.skiInOut ? 'Ski-in / ski-out' : combo.hotel.distanceToLiftM ? `${combo.hotel.distanceToLiftM} m to the lift` : undefined] : [],
      price: combo.perPerson.hotel,
    },
    { label: 'Lift pass', color: COST_COLORS.liftPass, title: 'Whole trip', lines: [], price: combo.perPerson.liftPass },
  ].filter((i) => i.label !== 'Lift pass' || i.price > 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} /> {i.label}
            </div>
            <div className="text-sm font-bold">{m(i.price)}</div>
          </div>
          <div className="mt-1.5 text-sm font-semibold">{i.title}</div>
          {i.lines.filter(Boolean).map((l) => <div key={l} className="text-xs text-slate-500">{l}</div>)}
        </div>
      ))}
    </div>
  );
}

export function GroupReport({ data }: { data: ReportData }) {
  const { vacation, combo, costs, friends, currency } = data;
  const m = (n: number) => money(n, currency);
  const total = costs.reduce((s, c) => s + c.total, 0);
  return (
    <Sheet>
      <Header data={data} title={vacation.name} subtitle="Group price summary" />
      <div className="space-y-6 px-12 pt-7">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Riders" value={String(costs.length)} />
          <Kpi label="Shared cost per person" value={m(combo.perPerson.total)} />
          <Kpi label="Group total" value={m(total)} />
        </div>
        <section>
          <SectionTitle>The plan</SectionTitle>
          <PlanBlock data={data} />
        </section>
        <section>
          <SectionTitle>Per rider</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <th className="py-2">Rider</th>
                <th className="py-2 text-right">Shared</th>
                <th className="py-2 text-right">Lessons</th>
                <th className="py-2 text-right">Rental</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => {
                const f = friends.find((x) => x.id === c.friendId)!;
                return (
                  <tr key={c.friendId} className="border-b border-slate-100">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="h-3 w-3 rounded-full" style={{ background: f.color }} /> {f.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">{m(c.shared)}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.lessons ? m(c.lessons) : '–'}</td>
                    <td className="py-2.5 text-right text-slate-500">{c.rental ? m(c.rental) : '–'}</td>
                    <td className="py-2.5 text-right font-bold">{m(c.total)}</td>
                    <td className={`py-2.5 text-right text-xs font-semibold ${c.overBy ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {c.budget ? (c.overBy ? `${m(c.overBy)} over` : `${m(c.budget - c.total)} left`) : '–'}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="pt-3 font-bold" colSpan={4}>Total</td>
                <td className="pt-3 text-right text-base font-extrabold">{m(total)}</td>
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
  const { vacation, combo, costs, friends, currency } = data;
  const m = (n: number) => money(n, currency);
  const f = friends.find((x) => x.id === friendId)!;
  const c = costs.find((x) => x.friendId === friendId)!;
  const rows: [string, number, string][] = [
    ['Flight', combo.perPerson.flight, COST_COLORS.flight],
    ['Transfer', combo.perPerson.transfer, COST_COLORS.transfer],
    ['Stay', combo.perPerson.hotel, COST_COLORS.hotel],
    ['Lift pass', combo.perPerson.liftPass, COST_COLORS.liftPass],
    ['Lessons', c.lessons, '#f43f5e'],
    ['Equipment rental', c.rental, '#64748b'],
  ];
  const shown = rows.filter(([, v]) => v > 0);
  return (
    <Sheet>
      <Header data={data} title={`${f.name}’s ski trip`} subtitle={vacation.name} />
      <div className="space-y-6 px-12 pt-7">
        <div className="flex items-end justify-between rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 p-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600">Your total</div>
            <div className="mt-2 text-5xl font-extrabold leading-none tracking-tight">{m(c.total)}</div>
            <div className="mt-3 text-sm text-slate-500">{nightsOf(vacation.dates)} nights · {skiDaysOf(vacation.dates)} ski days</div>
          </div>
          {c.budget > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-500">Your budget {m(c.budget)}</div>
              <div className={`text-lg font-bold ${c.overBy ? 'text-rose-600' : 'text-emerald-600'}`}>
                {c.overBy ? `${m(c.overBy)} over` : `${m(c.budget - c.total)} to spare`}
              </div>
            </div>
          )}
        </div>

        <section>
          <SectionTitle>Your breakdown</SectionTitle>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {shown.map(([label, v, color]) => <div key={label} style={{ width: `${(v / c.total) * 100}%`, background: color }} />)}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {shown.map(([label, v, color]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-2.5"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</span></td>
                  <td className="py-2.5 text-right font-semibold">{m(v)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-bold">Total</td>
                <td className="pt-3 text-right text-lg font-extrabold">{m(c.total)}</td>
              </tr>
            </tbody>
          </table>
          {c.lessons > 0 && <p className="mt-3 text-xs text-slate-500">Lessons: {f.lessons.type} lessons, {Math.min(f.lessons.days, skiDaysOf(vacation.dates))} days.</p>}
        </section>

        <section>
          <SectionTitle>Trip details</SectionTitle>
          <PlanBlock data={data} />
        </section>
      </div>
    </Sheet>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-600">{children}</div>;
}
