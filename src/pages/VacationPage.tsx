import { ArrowRight, Check, ChevronRight, ClipboardList, FileText, MapPin, Pencil, Plane, Plus, Search, Star, Trash2, Trophy, Users, X } from 'lucide-react';
import { stopSharing } from '../collab/engine';
import { useCollab } from '../collab/useCollab';
import ShareControl from '../components/ShareControl';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PdfButton, PdfStatus, usePdfExport, useReportData } from '../components/PdfExport';
import { FriendReport, GroupReport } from '../components/Reports';
import { Avatar, Badge, Button, Drawer, Field, Mountains } from '../components/ui';
import { freeForRange } from '../lib/availability';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { skill, sport, STATUSES } from '../lib/labels';
import { fileSafe } from '../lib/pdf';
import { cheapestCombo, selectedCombo, vacationPlan } from '../lib/plan';
import { cx, money, moneyRange, uid } from '../lib/util';
import { useActiveWinter, useConverter, useStore, useTripsOf, useVacation, useVacationPeople, useWinterFriends } from '../store/useStore';
import FriendDrawer from '../components/FriendDrawer';
import VacationTabs from '../components/VacationTabs';
import type { LuggageItem, Trip, Vacation, VacationPerson, Winter, WinterFriend } from '../types';

export default function VacationPage() {
  const { vacationId } = useParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const friends = useVacationPeople(vacation);
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
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 px-5 pb-16 pt-6 text-white shadow-lift md:mb-8 md:px-8 md:pb-20 md:pt-8">
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
              <h1 className="group mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                {vacation.name}
                <button onClick={() => setEditingName(true)} className="text-white/50 opacity-0 transition hover:text-white group-hover:opacity-100"><Pencil size={20} /></button>
              </h1>
            )}
            <div className="mt-2 text-white/90">{formatRange(vacation.dates)}{vacation.dates && ` · ${nightsOf(vacation.dates)} nights`} · {vacation.attendeeIds.length} riders</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShareControl vacationId={vacation.id} />
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
              onClick={async () => {
                if (!confirm(`Delete "${vacation.name}" and its resorts?`)) return;
                if (useCollab.getState().shared[vacation.id]) {
                  const both = confirm('This vacation is shared. Delete it for your partner too?\n\nOK: remove it from GitHub for both of you.\nCancel: only remove your copy (your partner keeps theirs).');
                  try {
                    await stopSharing(vacation.id, both);
                  } catch (e) {
                    return alert(`Could not delete it from GitHub: ${(e as Error).message}`);
                  }
                }
                removeVacation(vacation.id);
                navigate(`/w/${winter.id}`);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <VacationTabs winterId={winter.id} vacationId={vacation.id} active="plan" />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Resorts winter={winter} vacation={vacation} trips={trips} />
          <Crew winter={winter} vacation={vacation} people={friends} />
          <Luggage vacation={vacation} friends={friends} />
        </div>
        <aside className="space-y-6">
          <ExportPanel winter={winter} vacation={vacation} trips={trips} friends={friends} />
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
  const friends = useVacationPeople(vacation);
  const cv = useConverter();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  const rows = trips.map((t) => {
    const sel = selectedCombo(t, vacation, friends, cv);
    const best = sel ?? cheapestCombo(t, vacation, friends, cv);
    return { trip: t, resort: resorts.find((r) => r.id === t.resortId), sel, price: best?.perPerson ?? null };
  });
  const maxPrice = Math.max(1, ...rows.map((r) => r.price?.max ?? 0));
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
                <Link to={tripUrl(trip)} className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto sm:gap-4">
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
                        <div className={cx('h-full rounded-full', chosen ? 'bg-emerald-400' : 'bg-gradient-to-r from-sky-400 to-blue-600')} style={{ width: `${(price.min / maxPrice) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{sel ? 'per person' : price !== null ? 'from' : ''}</div>
                    <div className="text-xl font-extrabold">{price !== null ? moneyRange(price, currency) : <span className="text-sm font-medium text-slate-400">No prices yet</span>}</div>
                  </div>
                </Link>
                <div className="ml-auto flex items-center gap-2">
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

function Crew({ winter, vacation, people }: { winter: Winter; vacation: Vacation; people: VacationPerson[] }) {
  const updateVacation = useStore((s) => s.updateVacation);
  const addToVacation = useStore((s) => s.addToVacation);
  const removeFromVacation = useStore((s) => s.removeFromVacation);
  const roster = useWinterFriends(winter);
  const [editing, setEditing] = useState<VacationPerson | null>(null);
  const free = new Set(vacation.dates ? freeForRange(people, vacation.dates) : people.map((f) => f.id));
  const notGoing = roster.filter((f) => !vacation.attendeeIds.includes(f.id));
  const freeToAdd = vacation.dates ? freeForRange(notGoing, vacation.dates) : [];

  // "Added by you" first, then one group per collaborator
  const groups = new Map<string, { name: string; people: VacationPerson[] }>([['me', { name: 'you', people: [] }]]);
  for (const p of people) {
    const key = p.guest?.addedBy ?? 'me';
    if (!groups.has(key)) groups.set(key, { name: p.guest!.addedByName, people: [] });
    groups.get(key)!.people.push(p);
  }
  const first = (n: string) => n.trim().toLowerCase().split(/\s+/)[0];
  const ownerOf = (p: VacationPerson) => p.guest?.addedBy ?? 'me';
  const clash = (p: VacationPerson) => people.find((o) => o.id !== p.id && first(o.name) === first(p.name) && ownerOf(o) !== ownerOf(p));
  const guestRecord = editing?.guest ? vacation.guests.find((g) => g.id === editing.id) : undefined;

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
        <span className="label mb-0"><Users size={12} className="mr-1 inline" /> Going ({people.length})</span>
        <Link to={`/w/${winter.id}/v/${vacation.id}/dates`} className="text-xs font-semibold text-sky-600 hover:underline">Availability heatmap →</Link>
      </div>

      <div className="space-y-4">
        {[...groups.entries()].filter(([key, g]) => g.people.length || key === 'me').map(([key, g]) => (
          <div key={key}>
            <div className="mb-1.5 text-xs font-semibold text-slate-500">Added by {g.name}</div>
            {g.people.length === 0 ? (
              <p className="text-xs text-slate-400">Nobody from your roster yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {g.people.map((f) => {
                  const other = clash(f);
                  return (
                    <div key={f.id} className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-sky-200">
                      <button onClick={() => setEditing(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left" title="Edit">
                        <Avatar name={f.name} color={f.color} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{f.name} <span className="ml-0.5">{sport(f.sport).emoji}</span></div>
                          <div className="text-xs text-slate-400">
                            {skill(f.skillLevel).label}{f.lessons.wanted ? ' · lessons' : ''}
                            {other && <span className="text-amber-600"> · also added by {other.guest?.addedByName ?? 'you'}</span>}
                          </div>
                        </div>
                      </button>
                      {vacation.dates && (free.has(f.id) ? <Badge color="green">free</Badge> : <Badge color="rose">busy</Badge>)}
                      <button onClick={() => removeFromVacation(vacation.id, f.id)} className="rounded-full p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100" title="Remove from this vacation">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50/80 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600">Add from your roster</span>
          {freeToAdd.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => addToVacation(vacation.id, freeToAdd)}>Add everyone free ({freeToAdd.length})</Button>
          )}
        </div>
        {roster.length === 0 ? (
          <p className="text-xs text-slate-500">No riders this winter yet. <Link to={`/w/${winter.id}/people`} className="text-sky-600">Add people →</Link></p>
        ) : notGoing.length === 0 ? (
          <p className="text-xs text-slate-400">Everyone in your roster is going.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {notGoing.map((f) => (
              <button key={f.id} onClick={() => addToVacation(vacation.id, [f.id])} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700">
                <Avatar name={f.name} color={f.color} size={20} /> {f.name} <Plus size={12} />
              </button>
            ))}
          </div>
        )}
      </div>

      <FriendDrawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        winter={winter}
        friend={editing ? (guestRecord ? { ...guestRecord.profile, id: guestRecord.id } : roster.find((f) => f.id === editing.id) ?? null) : null}
        guestOf={guestRecord ? { vacationId: vacation.id, budget: guestRecord.budget, budgetCurrency: guestRecord.budgetCurrency, addedByName: guestRecord.addedByName } : undefined}
      />
    </section>
  );
}

function ExportPanel({ winter, vacation, trips, friends }: { winter: Winter; vacation: Vacation; trips: Trip[]; friends: WinterFriend[] }) {
  const currency = useStore((s) => s.settings.currency);
  const cv = useConverter();
  const plan = vacationPlan(vacation, trips, friends, cv);
  const data = useReportData(vacation, plan, friends);
  const exporter = usePdfExport();
  const base = fileSafe(`${vacation.name}-${data?.resort?.name ?? ''}`);

  return (
    <div className="card sticky top-24 p-6">
      <div className="mb-1 flex items-center gap-2 text-lg font-extrabold"><FileText size={18} className="text-sky-500" /> Share the plan</div>
      {!data ? (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          To see the summary and export PDFs, <b>choose a resort</b> and <b>select a combination</b> in its Trip comparison.
          {vacation.selectedTripId && <div className="mt-2 text-xs">The chosen resort doesn’t have a selected combination yet.</div>}
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-slate-500">
            {data.resort?.name} · {moneyRange(data.combo.perPerson, currency)} average per person
          </p>
          <Link to={`/w/${winter.id}/v/${vacation.id}/summary`}>
            <Button variant="accent" className="w-full"><ClipboardList size={16} /> Vacation summary</Button>
          </Link>
          <div className="mt-2 space-y-2">
            <PdfButton id="group" exporter={exporter} className="w-full" onClick={() => exporter.run('group', [<GroupReport data={data} />], `${base}-group-summary.pdf`)}>
              Group price summary PDF
            </PdfButton>
            <PdfButton id="all" exporter={exporter} className="w-full"
              onClick={() => exporter.run('all', data.costs.map((c) => <FriendReport key={c.friendId} data={data} friendId={c.friendId} />), `${base}-all-riders.pdf`)}>
              All riders, one page each
            </PdfButton>
            <PdfStatus exporter={exporter} />
          </div>

          <div className="label mt-6">Personal PDFs</div>
          <div className="space-y-1.5">
            {data.costs.map((c) => {
              const f = friends.find((x) => x.id === c.friendId)!;
              return (
                <div key={c.friendId} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-slate-50">
                  <Avatar name={f.name} color={f.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{f.name}</div>
                    <div className={cx('text-xs', c.overBy ? 'text-rose-500' : 'text-slate-400')}>{moneyRange(c.total, currency)}{c.overBy ? ` · ${money(c.overBy, currency)} over` : ''}</div>
                  </div>
                  <PdfButton id={c.friendId} exporter={exporter} size="sm" onClick={() => exporter.run(c.friendId, [<FriendReport data={data} friendId={c.friendId} />], `${base}-${fileSafe(f.name)}.pdf`)}>
                    PDF
                  </PdfButton>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


const BAG_LABEL = { trolley: '🧳 Trolley', checked: '🛄 Checked bag' } as const;

/** Who carries which bags. Bag prices come from each flight; no bags = backpack only. */
function Luggage({ vacation, friends }: { vacation: Vacation; friends: WinterFriend[] }) {
  const setLuggage = useStore((s) => s.setLuggage);
  const going = friends.filter((f) => vacation.attendeeIds.includes(f.id));
  const bags = vacation.luggage;
  // updates read the latest luggage so quick successive taps build on each other
  const update = (fn: (current: LuggageItem[]) => LuggageItem[]) =>
    setLuggage(vacation.id, fn(useStore.getState().vacations.find((v) => v.id === vacation.id)?.luggage ?? []));
  const personal = (friendId: string, type: LuggageItem['type']) => bags.filter((b) => !b.shared && b.type === type && b.friendIds[0] === friendId);
  const shared = bags.filter((b) => b.shared);
  const inShared = (friendId: string) => shared.some((b) => b.friendIds.includes(friendId));

  const counter = (f: WinterFriend, type: LuggageItem['type']) => {
    const n = personal(f.id, type).length;
    return (
      <div className="flex items-center gap-1 rounded-full bg-slate-100/80 p-0.5">
        <button className="h-6 w-6 rounded-full text-sm font-bold text-slate-500 hover:bg-white disabled:opacity-30" disabled={!n}
          onClick={() => { const last = personal(f.id, type).slice(-1)[0]; if (last) update((cur) => cur.filter((b) => b.id !== last.id)); }}>−</button>
        <span className={cx('w-5 text-center text-sm font-bold', n ? 'text-slate-900' : 'text-slate-300')}>{n}</span>
        <button className="h-6 w-6 rounded-full text-sm font-bold text-slate-500 hover:bg-white"
          onClick={() => update((cur) => [...cur, { id: uid(), type, friendIds: [f.id] }])}>+</button>
      </div>
    );
  };

  return (
    <section className="card p-6">
      <h2 className="text-xl font-extrabold">Luggage</h2>
      <p className="mb-4 text-sm text-slate-500">Everyone flies with a backpack by default. Add trolleys or checked bags (ski bags count as checked); prices come from each flight.</p>
      {going.length === 0 ? (
        <p className="text-sm text-slate-400">Nobody is going yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 md:gap-x-6">
            <span />
            <span className="label mb-0 text-center">{BAG_LABEL.trolley}</span>
            <span className="label mb-0 text-center">{BAG_LABEL.checked}</span>
            {going.map((f) => (
              <div key={f.id} className="contents">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Avatar name={f.name} color={f.color} size={26} /> {f.name}
                  {!personal(f.id, 'trolley').length && !personal(f.id, 'checked').length && !inShared(f.id) && <span className="text-xs font-normal text-slate-400">🎒 backpack only</span>}
                </span>
                {counter(f, 'trolley')}
                {counter(f, 'checked')}
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="label mb-0">Shared bags</span>
              <div className="flex gap-2">
                {(['trolley', 'checked'] as const).map((type) => (
                  <Button key={type} size="sm" onClick={() => update((cur) => [...cur, { id: uid(), type, friendIds: [], shared: true }])}>
                    <Plus size={13} /> Shared {type === 'trolley' ? 'trolley' : 'checked bag'}
                  </Button>
                ))}
              </div>
            </div>
            {shared.length === 0 && <p className="text-xs text-slate-400">Two people sharing one bag? Add a shared bag and the price is split between them.</p>}
            <div className="space-y-2">
              {shared.map((bag) => (
                <div key={bag.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/80 p-2.5">
                  <span className="w-28 text-sm font-semibold">{BAG_LABEL[bag.type]}</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {going.map((f) => {
                      const on = bag.friendIds.includes(f.id);
                      return (
                        <button key={f.id}
                          onClick={() => update((cur) => cur.map((b) => (b.id === bag.id ? { ...b, friendIds: b.friendIds.includes(f.id) ? b.friendIds.filter((x) => x !== f.id) : [...b.friendIds, f.id] } : b)))}
                          className={cx('flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-xs font-semibold transition', on ? 'border-sky-300 bg-white text-sky-800' : 'border-transparent text-slate-400 hover:text-slate-600')}>
                          <Avatar name={f.name} color={f.color} size={18} /> {f.name}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-slate-400">{bag.friendIds.length ? `split ${bag.friendIds.length} ways` : 'pick who shares'}</span>
                  <button className="rounded-full p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500" onClick={() => update((cur) => cur.filter((b) => b.id !== bag.id))}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
