import { ArrowRight, Check, ChevronRight, FileDown, FileText, Loader2, MapPin, Pencil, Plane, Plus, Search, Star, Trash2, Trophy, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FriendReport, GroupReport, type ReportData } from '../components/Reports';
import { Avatar, Badge, Button, Drawer, Field, Mountains } from '../components/ui';
import { freeForRange } from '../lib/availability';
import { friendCosts } from '../lib/combinations';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { skill, sport, STATUSES } from '../lib/labels';
import { downloadPdf, fileSafe } from '../lib/pdf';
import { cheapestCombo, selectedCombo, vacationPlan } from '../lib/plan';
import { cx, money } from '../lib/util';
import { pricedTrip, useActiveWinter, useStore, useTripsOf, useVacation, useWinterFriends } from '../store/useStore';
import type { Trip, Vacation, Winter, WinterFriend } from '../types';

export default function VacationPage() {
  const { vacationId } = useParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const friends = useWinterFriends(winter);
  const trips = useTripsOf(vacationId);
  const updateVacation = useStore((s) => s.updateVacation);
  const removeVacation = useStore((s) => s.removeVacation);
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);

  if (!vacation || vacation.winterId !== winter.id) {
    return <div className="text-slate-500">Vacation not found. <Link to={`/w/${winter.id}`} className="text-sky-600">Back to Winter {winter.year}</Link></div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
        <Link to={`/w/${winter.id}`} className="hover:text-slate-800">Winter {winter.year}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700">{vacation.name}</span>
      </div>

      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-8 pb-20 pt-8 text-white shadow-lift">
        <Mountains className="absolute inset-x-0 bottom-0 h-24 w-full text-white" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">❄ Vacation · Winter {winter.year}</div>
            {editingName ? (
              <input
                autoFocus
                className="mt-1 rounded-xl bg-white/20 px-2 text-4xl font-extrabold text-white outline-none placeholder:text-white/60"
                defaultValue={vacation.name}
                onBlur={(e) => { updateVacation(vacation.id, { name: e.target.value || vacation.name }); setEditingName(false); }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <h1 className="group mt-1 flex items-center gap-3 text-4xl font-extrabold tracking-tight">
                {vacation.name}
                <button onClick={() => setEditingName(true)} className="text-white/50 opacity-0 transition hover:text-white group-hover:opacity-100"><Pencil size={20} /></button>
              </h1>
            )}
            <div className="mt-2 text-white/90">{formatRange(vacation.dates)}{vacation.dates && ` · ${nightsOf(vacation.dates)} nights`} · {vacation.attendeeIds.length} riders</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white/20 p-1 backdrop-blur">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateVacation(vacation.id, { status: s.value })}
                  className={cx('rounded-full px-3 py-1 text-xs font-bold transition', vacation.status === s.value ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white')}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              className="rounded-full p-2 text-white/70 hover:bg-white/20 hover:text-white"
              title="Delete vacation"
              onClick={() => { if (confirm(`Delete "${vacation.name}" and its resorts?`)) { removeVacation(vacation.id); navigate(`/w/${winter.id}`); } }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Resorts winter={winter} vacation={vacation} trips={trips} />
          <Crew winter={winter} vacation={vacation} friends={friends} />
        </div>
        <aside className="space-y-6">
          <ExportPanel vacation={vacation} trips={trips} friends={friends} />
        </aside>
      </div>
    </div>
  );
}

function Resorts({ winter, vacation, trips }: { winter: Winter; vacation: Vacation; trips: Trip[] }) {
  const resorts = useStore((s) => s.resorts);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  const createTrip = useStore((s) => s.createTrip);
  const updateVacation = useStore((s) => s.updateVacation);
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  const rows = trips.map((t) => {
    const sel = selectedCombo(t, vacation);
    const best = sel ?? cheapestCombo(t, vacation);
    return { trip: t, resort: resorts.find((r) => r.id === t.resortId), sel, price: best?.perPerson.total ?? null };
  });
  const maxPrice = Math.max(1, ...rows.map((r) => r.price ?? 0));
  const tripUrl = (t: Trip) => `/w/${winter.id}/v/${vacation.id}/t/${t.id}`;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">Where to?</h2>
          <p className="text-sm text-slate-500">Add candidate resorts, price their options, then crown a winner.</p>
        </div>
        <Button variant="primary" onClick={() => setPicking(true)}><Plus size={16} /> Add resort</Button>
      </div>

      {rows.length === 0 ? (
        <button onClick={() => setPicking(true)} className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 py-12 text-slate-400 transition hover:border-sky-300 hover:text-sky-600">
          <MapPin size={28} />
          <span className="font-semibold">Add the first resort</span>
        </button>
      ) : (
        <div className="space-y-3">
          {rows.map(({ trip, resort, sel, price }) => {
            const chosen = vacation.selectedTripId === trip.id;
            return (
              <div key={trip.id} className={cx('card flex flex-wrap items-center gap-4 p-4 transition hover:shadow-lift', chosen && 'ring-2 ring-emerald-300')}>
                <Link to={tripUrl(trip)} className="flex min-w-0 flex-1 items-center gap-4">
                  <div className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl', chosen ? 'bg-emerald-50' : 'bg-sky-50')}>
                    {chosen ? '🏆' : '🏔️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-lg font-bold">{resort?.name ?? trip.name}</span>
                      {chosen && <Badge color="green"><Star size={11} /> Chosen</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>{resort?.country}</span>
                      <span>{trip.flights.length} flights · {trip.transfers.length} transfers · {trip.hotels.length} hotels</span>
                      {sel && <span className="font-semibold text-emerald-600">plan selected</span>}
                    </div>
                    {price !== null && (
                      <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                        <div className={cx('h-full rounded-full', chosen ? 'bg-emerald-400' : 'bg-gradient-to-r from-sky-400 to-blue-600')} style={{ width: `${(price / maxPrice) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{sel ? 'per person' : price !== null ? 'from' : ''}</div>
                    <div className="text-xl font-extrabold">{price !== null ? money(price, currency) : <span className="text-sm font-medium text-slate-400">No prices yet</span>}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {!chosen && (
                    <Button size="sm" onClick={() => updateVacation(vacation.id, { selectedTripId: trip.id, status: vacation.status === 'planning' ? 'decided' : vacation.status })}>
                      <Trophy size={13} /> Choose
                    </Button>
                  )}
                  <Link to={tripUrl(trip)}><Button size="sm" variant="ghost"><ArrowRight size={16} /></Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={picking} onClose={() => setPicking(false)} title="Add a resort">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" autoFocus placeholder="Search resorts or countries" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="space-y-1">
          {[...resorts]
            .filter((r) => !q || `${r.name} ${r.country}`.toLowerCase().includes(q.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => {
              const added = trips.some((t) => t.resortId === r.id);
              return (
                <button
                  key={r.id}
                  disabled={added}
                  onClick={() => navigate(tripUrl({ id: createTrip(vacation.id, r.id) } as Trip))}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition hover:bg-sky-50 disabled:opacity-40"
                >
                  <span>
                    <span className="font-semibold">{r.name}</span>
                    <span className="ml-2 text-sm text-slate-400">{r.country}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    {added ? <><Check size={13} /> added</> : <><Plane size={12} /> {r.airports.map((a) => airports.find((x) => x.iata === a.iata)?.iata ?? a.iata).join(' · ')}</>}
                  </span>
                </button>
              );
            })}
        </div>
      </Drawer>
    </section>
  );
}

function Crew({ winter, vacation, friends }: { winter: Winter; vacation: Vacation; friends: WinterFriend[] }) {
  const updateVacation = useStore((s) => s.updateVacation);
  const free = vacation.dates ? freeForRange(friends, vacation.dates) : friends.map((f) => f.id);
  const toggle = (id: string) =>
    updateVacation(vacation.id, { attendeeIds: vacation.attendeeIds.includes(id) ? vacation.attendeeIds.filter((x) => x !== id) : [...vacation.attendeeIds, id] });

  return (
    <section className="card p-6">
      <h2 className="mb-4 text-xl font-extrabold">Dates & crew</h2>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Arrive">
          <input type="date" className="input w-auto" value={vacation.dates?.start ?? ''} min={winter.start} max={winter.end}
            onChange={(e) => e.target.value && updateVacation(vacation.id, { dates: { start: e.target.value, end: vacation.dates?.end && vacation.dates.end > e.target.value ? vacation.dates.end : e.target.value } })} />
        </Field>
        <Field label="Leave">
          <input type="date" className="input w-auto" value={vacation.dates?.end ?? ''} min={vacation.dates?.start} disabled={!vacation.dates}
            onChange={(e) => vacation.dates && e.target.value && updateVacation(vacation.id, { dates: { ...vacation.dates, end: e.target.value } })} />
        </Field>
        <div className="ml-auto text-right">
          <div className="text-lg font-extrabold">{nightsOf(vacation.dates)} nights</div>
          <div className="text-xs text-slate-400">{vacation.dates ? `${skiDaysOf(vacation.dates)} ski days` : 'pick dates'}</div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="label mb-0"><Users size={12} className="mr-1 inline" /> Going ({vacation.attendeeIds.length}/{friends.length})</span>
        {vacation.dates && <Button size="sm" variant="ghost" onClick={() => updateVacation(vacation.id, { attendeeIds: free })}>Reset to everyone free</Button>}
      </div>
      {friends.length === 0 ? (
        <p className="text-sm text-slate-500">No riders this winter yet. <Link to={`/w/${winter.id}/people`} className="text-sky-600">Add people →</Link></p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {friends.map((f) => {
            const going = vacation.attendeeIds.includes(f.id);
            const isFree = free.includes(f.id);
            return (
              <button key={f.id} onClick={() => toggle(f.id)}
                className={cx('flex items-center gap-3 rounded-2xl border p-3 text-left transition', going ? 'border-sky-200 bg-sky-50/50' : 'border-slate-100 opacity-60 hover:opacity-100')}>
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-md border', going ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300')}>
                  {going && <Check size={13} />}
                </span>
                <Avatar name={f.name} color={f.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{f.name} <span className="ml-0.5">{sport(f.sport).emoji}</span></div>
                  <div className="text-xs text-slate-400">{skill(f.skillLevel).label}{f.lessons.wanted ? ' · lessons' : ''}</div>
                </div>
                {vacation.dates && (isFree ? <Badge color="green">free</Badge> : <Badge color="rose">busy</Badge>)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExportPanel({ vacation, trips, friends }: { vacation: Vacation; trips: Trip[]; friends: WinterFriend[] }) {
  const resorts = useStore((s) => s.resorts);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  const [busy, setBusy] = useState<string | null>(null);
  const plan = vacationPlan(vacation, trips);

  const data: ReportData | null = useMemo(() => {
    if (!plan) return null;
    const pt = pricedTrip(plan.trip, vacation);
    return {
      vacation,
      resort: resorts.find((r) => r.id === plan.trip.resortId),
      airport: airports.find((a) => a.iata === plan.combo.airport),
      combo: plan.combo,
      costs: friendCosts(plan.combo, friends, pt),
      friends,
      currency,
    };
  }, [plan, vacation, resorts, airports, friends, currency]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { alert(`PDF export failed: ${(e as Error).message}`); }
    setBusy(null);
  };
  const base = fileSafe(`${vacation.name}-${data?.resort?.name ?? ''}`);
  const spin = (key: string, icon: React.ReactNode) => (busy === key ? <Loader2 size={15} className="animate-spin" /> : icon);

  return (
    <div className="card sticky top-24 p-6">
      <div className="mb-1 flex items-center gap-2 text-lg font-extrabold"><FileText size={18} className="text-sky-500" /> Share the plan</div>
      {!data ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          To export PDFs, <b>choose a resort</b> and <b>select a combination</b> in its Trip comparison.
          {vacation.selectedTripId && <div className="mt-2 text-xs">The chosen resort doesn’t have a selected combination yet.</div>}
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-slate-500">
            {data.resort?.name} · {money(data.combo.perPerson.total, currency)} shared per person
          </p>
          <Button variant="accent" className="w-full" disabled={!!busy} onClick={() => run('group', () => downloadPdf([<GroupReport data={data} />], `${base}-group-summary.pdf`))}>
            {spin('group', <FileDown size={16} />)} Group price summary
          </Button>
          <Button className="mt-2 w-full" disabled={!!busy || !data.costs.length}
            onClick={() => run('all', () => downloadPdf(data.costs.map((c) => <FriendReport key={c.friendId} data={data} friendId={c.friendId} />), `${base}-all-riders.pdf`))}>
            {spin('all', <FileDown size={16} />)} All riders, one page each
          </Button>

          <div className="label mt-6">Personal PDFs</div>
          <div className="space-y-1.5">
            {data.costs.map((c) => {
              const f = friends.find((x) => x.id === c.friendId)!;
              return (
                <div key={c.friendId} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-slate-50">
                  <Avatar name={f.name} color={f.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{f.name}</div>
                    <div className={cx('text-xs', c.overBy ? 'text-rose-500' : 'text-slate-400')}>{money(c.total, currency)}{c.overBy ? ` · ${money(c.overBy, currency)} over` : ''}</div>
                  </div>
                  <Button size="sm" disabled={!!busy} onClick={() => run(c.friendId, () => downloadPdf([<FriendReport data={data} friendId={c.friendId} />], `${base}-${fileSafe(f.name)}.pdf`))}>
                    {spin(c.friendId, <FileDown size={13} />)} PDF
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

