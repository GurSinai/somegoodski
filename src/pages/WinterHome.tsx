import { ArrowRight, CalendarDays, Check, MapPin, Plus, Snowflake, Trash2, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Field, Mountains } from '../components/ui';
import { formatRange, nightsOf } from '../lib/dates';
import { statusOf } from '../lib/labels';
import { cheapestCombo, vacationPlan } from '../lib/plan';
import { cx, money, moneyRange } from '../lib/util';
import { useActiveWinter, useStore, useVacationsOf, useWinterFriends } from '../store/useStore';
import type { Vacation, Winter } from '../types';

export default function WinterHome() {
  const winter = useActiveWinter()!;
  const friends = useWinterFriends(winter);
  const vacations = useVacationsOf(winter.id);
  const createVacation = useStore((s) => s.createVacation);
  const updateWinter = useStore((s) => s.updateWinter);
  const removeWinter = useStore((s) => s.removeWinter);
  const navigate = useNavigate();

  const withAvailability = friends.filter((f) => f.availability.length > 0).length;
  const steps = [
    {
      n: 1, to: `/w/${winter.id}/people`, icon: Users, title: 'Who’s in',
      text: friends.length ? `${friends.length} riders this winter` : 'Add the crew',
      done: friends.length > 0,
    },
    {
      n: 2, to: `/w/${winter.id}/dates`, icon: CalendarDays, title: 'When',
      text: friends.length ? `${withAvailability}/${friends.length} shared their dates` : 'Paint availability',
      done: friends.length > 0 && withAvailability === friends.length,
    },
    {
      n: 3, to: '#vacations', icon: Snowflake, title: 'Where',
      text: vacations.length ? `${vacations.length} vacation${vacations.length > 1 ? 's' : ''} in the works` : 'Plan a vacation',
      done: vacations.some((v) => v.selectedTripId),
    },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-100 via-white to-indigo-50 px-8 pb-24 pt-10 shadow-soft">
        <Mountains className="absolute inset-x-0 bottom-0 h-28 w-full text-sky-200" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="eyebrow mb-2">❄ Your season</div>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">Winter {winter.year}</h1>
            <p className="mt-2 text-slate-500">{formatRange({ start: winter.start, end: winter.end })}</p>
          </div>
          <div className="flex -space-x-2">
            {friends.slice(0, 10).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={40} ring />)}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-12 grid gap-4 md:grid-cols-3">
        {steps.map(({ n, to, icon: Icon, title, text, done }) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className={cx('flex h-10 w-10 items-center justify-center rounded-2xl', done ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600')}>
                  {done ? <Check size={20} /> : <Icon size={20} />}
                </span>
                <span className="text-xs font-bold text-slate-300">STEP {n}</span>
              </div>
              <div className="mt-4 text-lg font-bold">{title}</div>
              <div className="text-sm text-slate-500">{text}</div>
            </>
          );
          return to.startsWith('#') ? (
            <a key={n} href={to} onClick={(e) => { e.preventDefault(); document.getElementById('vacations')?.scrollIntoView({ behavior: 'smooth' }); }} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">{inner}</a>
          ) : (
            <Link key={n} to={to} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">{inner}</Link>
          );
        })}
      </div>

      {/* Vacations */}
      <div id="vacations" className="mb-5 flex flex-wrap items-end justify-between gap-3 scroll-mt-24">
        <div>
          <div className="eyebrow mb-1">Step 3</div>
          <h2 className="text-2xl font-extrabold">Vacations</h2>
          <p className="text-sm text-slate-500">Each vacation has its own dates and crew, and shares this winter’s people and availability.</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/w/${winter.id}/dates`}><Button><CalendarDays size={16} /> Find the best dates</Button></Link>
          <Button variant="primary" onClick={() => navigate(`/w/${winter.id}/v/${createVacation(winter.id)}`)}>
            <Plus size={16} /> New vacation
          </Button>
        </div>
      </div>

      {vacations.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="text-4xl">🏔️</div>
          <div className="text-lg font-bold">No vacations yet</div>
          <p className="max-w-md text-sm text-slate-500">
            The fastest way: paint everyone’s availability, then hit <b>Create vacation</b> on one of the best date windows.
          </p>
          <Link to={`/w/${winter.id}/dates`}><Button variant="accent" className="mt-2">Find the best dates <ArrowRight size={16} /></Button></Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {vacations.map((v) => <VacationCard key={v.id} winter={winter} vacation={v} />)}
        </div>
      )}

      {/* Season settings */}
      <div className="mt-14 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-6">
        <Field label="Season starts">
          <input type="date" className="input w-auto" value={winter.start} onChange={(e) => e.target.value && updateWinter(winter.id, { start: e.target.value })} />
        </Field>
        <Field label="Season ends">
          <input type="date" className="input w-auto" value={winter.end} min={winter.start} onChange={(e) => e.target.value && updateWinter(winter.id, { end: e.target.value })} />
        </Field>
        <Button
          variant="danger"
          size="sm"
          className="ml-auto"
          onClick={() => {
            if (confirm(`Delete Winter ${winter.year} with all its vacations? Friend profiles are kept.`)) {
              removeWinter(winter.id);
              navigate('/');
            }
          }}
        >
          <Trash2 size={14} /> Delete winter
        </Button>
      </div>
    </div>
  );
}

function VacationCard({ winter, vacation: v }: { winter: Winter; vacation: Vacation }) {
  const allTrips = useStore((s) => s.trips);
  const resorts = useStore((s) => s.resorts);
  const currency = useStore((s) => s.settings.currency);
  const friends = useWinterFriends(winter);
  const trips = allTrips.filter((t) => t.vacationId === v.id);
  const plan = vacationPlan(v, trips, friends);
  const st = statusOf(v.status);
  const cheapest = trips
    .map((t) => cheapestCombo(t, v, friends)?.perPerson.min)
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => a - b)[0];

  return (
    <Link to={`/w/${winter.id}/v/${v.id}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
      <div className="relative h-24 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500">
        <Mountains className="absolute inset-x-0 bottom-0 h-16 w-full text-white" />
        <Badge color={st.color} className="absolute right-4 top-4 bg-white/90">{st.label}</Badge>
        <div className="absolute left-5 top-4 text-sm font-semibold text-white/90">
          {v.dates ? `${nightsOf(v.dates)} nights` : 'Dates TBD'}
        </div>
      </div>
      <div className="p-5 pt-3">
        <div className="text-xl font-bold group-hover:text-sky-700">{v.name}</div>
        <div className="mt-0.5 text-sm text-slate-500">{formatRange(v.dates)}</div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {friends.filter((f) => v.attendeeIds.includes(f.id)).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={26} ring />)}
          </div>
          <span className="text-xs text-slate-400">{v.attendeeIds.length} going</span>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
          <div className="min-w-0">
            {plan ? (
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700"><MapPin size={15} /> {resorts.find((r) => r.id === plan.trip.resortId)?.name}</div>
            ) : (
              <div className="text-sm text-slate-500">{trips.length ? `${trips.length} resort${trips.length > 1 ? 's' : ''} in the running` : 'No resorts yet'}</div>
            )}
          </div>
          {(plan || cheapest !== undefined) && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{plan ? 'per person' : 'from'}</div>
              <div className="text-lg font-extrabold">{plan ? moneyRange(plan.combo.perPerson, currency) : money(cheapest!, currency)}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
