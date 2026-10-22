import { ArrowLeft, ArrowRight, BedDouble, Bus, Check, ExternalLink, Pencil, Plane, Plus, Scale, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import OptionDrawer, { blankFlight, blankHotel, blankTransfer, type OptionKind } from '../components/OptionForms';
import TripComparison from '../components/TripComparison';
import { Avatar, Badge, Button, Field, NumberInput, Segmented } from '../components/ui';
import { freeForRange } from '../lib/availability';
import { hotelPerPerson, transferPerPerson } from '../lib/combinations';
import { formatRange, nightsOf, skiDaysOf } from '../lib/dates';
import { BOARDS, skill, sport, STATUSES, TRANSFER_TYPES } from '../lib/labels';
import { cx, money } from '../lib/util';
import { useResort, useStore, useTrip } from '../store/useStore';
import type { FlightOption, HotelOption, TransferOption, Trip } from '../types';
import { driveTime } from './Resorts';

type Tab = 'overview' | 'options' | 'compare';

export default function TripDetail() {
  const { id } = useParams();
  const trip = useTrip(id);
  const resort = useResort(trip?.resortId);
  const updateTrip = useStore((s) => s.updateTrip);
  const removeTrip = useStore((s) => s.removeTrip);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => (trip && trip.flights.length ? 'compare' : 'overview'));
  const [editingName, setEditingName] = useState(false);

  if (!trip) {
    return (
      <div className="text-slate-500">
        Trip not found. <Link to="/trips" className="text-sky-600">Back to trips</Link>
      </div>
    );
  }

  const optionCount = trip.flights.length + trip.transfers.length + trip.hotels.length;
  const steps: { value: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { value: 'overview', label: 'Overview', icon: <Users size={16} />, badge: `${trip.attendeeIds.length}` },
    { value: 'options', label: 'Options & prices', icon: <Plane size={16} />, badge: `${optionCount}` },
    { value: 'compare', label: 'Trip comparison', icon: <Scale size={16} /> },
  ];

  return (
    <div>
      <Link to="/trips" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> All trips
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            Trip to <Link to={`/resorts/${trip.resortId}`} className="font-medium text-sky-700 hover:underline">{resort?.name ?? 'unknown resort'}</Link>
            {resort && ` · ${resort.country}`}
          </div>
          {editingName ? (
            <input
              autoFocus
              className="input mt-1 text-2xl font-bold"
              defaultValue={trip.name}
              onBlur={(e) => { updateTrip(trip.id, { name: e.target.value || trip.name }); setEditingName(false); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <h1 className="group flex items-center gap-2 text-2xl font-bold tracking-tight">
              {trip.name}
              <button onClick={() => setEditingName(true)} className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-slate-600"><Pencil size={16} /></button>
            </h1>
          )}
          <div className="mt-1 text-sm text-slate-600">{formatRange(trip.dates)}{trip.dates && ` · ${nightsOf(trip.dates)} nights`} · {trip.attendeeIds.length} people</div>
        </div>
        <div className="flex items-center gap-2">
          <Segmented size="sm" value={trip.status} onChange={(status) => updateTrip(trip.id, { status })} options={STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
          <Button variant="danger" size="sm" onClick={() => { if (confirm(`Delete trip "${trip.name}"?`)) { removeTrip(trip.id); navigate('/trips'); } }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.value} className="flex items-center gap-2">
            {i > 0 && <ArrowRight size={16} className="shrink-0 text-slate-300" />}
            <button
              onClick={() => setTab(s.value)}
              className={cx(
                'flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition',
                tab === s.value ? 'border-sky-600 bg-sky-600 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px]', tab === s.value ? 'bg-white/20' : 'bg-slate-100')}>{i + 1}</span>
              {s.icon} {s.label}
              {s.badge !== undefined && <span className={cx('rounded-full px-1.5 text-xs', tab === s.value ? 'bg-white/20' : 'bg-slate-100')}>{s.badge}</span>}
            </button>
          </div>
        ))}
      </div>

      {tab === 'overview' && <Overview trip={trip} onNext={() => setTab('options')} />}
      {tab === 'options' && <Options trip={trip} onNext={() => setTab('compare')} />}
      {tab === 'compare' && <TripComparison trip={trip} />}
    </div>
  );
}

function Overview({ trip, onNext }: { trip: Trip; onNext: () => void }) {
  const friends = useStore((s) => s.friends);
  const chosen = useStore((s) => s.season.chosenDates);
  const currency = useStore((s) => s.settings.currency);
  const resort = useResort(trip.resortId);
  const airports = useStore((s) => s.airports);
  const updateTrip = useStore((s) => s.updateTrip);
  const free = trip.dates ? freeForRange(friends, trip.dates) : friends.map((f) => f.id);

  const toggle = (id: string) =>
    updateTrip(trip.id, { attendeeIds: trip.attendeeIds.includes(id) ? trip.attendeeIds.filter((x) => x !== id) : [...trip.attendeeIds, id] });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Dates & shared costs</h2>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Arrive">
              <input type="date" className="input w-auto" value={trip.dates?.start ?? ''} onChange={(e) => e.target.value && updateTrip(trip.id, { dates: { start: e.target.value, end: trip.dates?.end && trip.dates.end > e.target.value ? trip.dates.end : e.target.value } })} />
            </Field>
            <Field label="Leave">
              <input type="date" className="input w-auto" value={trip.dates?.end ?? ''} min={trip.dates?.start} disabled={!trip.dates} onChange={(e) => trip.dates && e.target.value && updateTrip(trip.id, { dates: { ...trip.dates, end: e.target.value } })} />
            </Field>
            {chosen && (chosen.start !== trip.dates?.start || chosen.end !== trip.dates?.end) && (
              <Button size="sm" onClick={() => updateTrip(trip.id, { dates: chosen })}>Use chosen dates ({formatRange(chosen)})</Button>
            )}
            <div className="ml-auto text-right text-sm">
              <div className="font-semibold">{nightsOf(trip.dates)} nights</div>
              <div className="text-xs text-slate-500">{trip.dates ? `${skiDaysOf(trip.dates)} ski days` : ''}</div>
            </div>
          </div>
          <div className="mt-4 max-w-xs">
            <Field label={`Lift pass per person, whole trip (${currency})`} hint="Added to every combination.">
              <NumberInput value={trip.liftPassPerPerson} onChange={(liftPassPerPerson) => updateTrip(trip.id, { liftPassPerPerson })} min={0} />
            </Field>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Who's going <span className="font-normal text-slate-400">({trip.attendeeIds.length}/{friends.length})</span></h2>
            {trip.dates && (
              <Button size="sm" variant="ghost" onClick={() => updateTrip(trip.id, { attendeeIds: free })}>Reset to everyone free</Button>
            )}
          </div>
          {friends.length === 0 ? (
            <p className="text-sm text-slate-500">No friends added yet. <Link to="/people" className="text-sky-600">Add people →</Link></p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {friends.map((f) => {
                const going = trip.attendeeIds.includes(f.id);
                const isFree = free.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    className={cx('flex items-center gap-3 rounded-xl border p-3 text-left transition', going ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200 opacity-60 hover:opacity-100')}
                  >
                    <span className={cx('flex h-5 w-5 items-center justify-center rounded border', going ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300')}>
                      {going && <Check size={13} />}
                    </span>
                    <Avatar name={f.name} color={f.color} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{f.name} <span className="ml-1">{sport(f.sport).emoji}</span></div>
                      <div className="text-xs text-slate-500">{skill(f.skillLevel).label}{f.lessons.wanted ? ' · lessons' : ''}</div>
                    </div>
                    {trip.dates && (isFree ? <Badge color="green">free</Badge> : <Badge color="rose">not free</Badge>)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        {resort && (
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{resort.name}</h3>
              <Link to={`/resorts/${resort.id}`} className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline">Resort page <ExternalLink size={11} /></Link>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              {resort.info.skiArea && <span>{resort.info.skiArea}</span>}
              {resort.info.pisteKm && <span>{resort.info.pisteKm} km</span>}
              {resort.info.altitudeBase && <span>{resort.info.altitudeBase}–{resort.info.altitudeTop} m</span>}
            </div>
            <div className="space-y-2">
              {resort.airports.map((a) => (
                <div key={a.iata} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span><b>{a.iata}</b> <span className="text-slate-500">{airports.find((x) => x.iata === a.iata)?.city}</span></span>
                  <span className="text-xs text-slate-500">{a.distanceKm} km · {driveTime(a.driveTimeMin)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button variant="primary" className="w-full" onClick={onNext}>
          Next: enter options & prices <ArrowRight size={16} />
        </Button>
      </aside>
    </div>
  );
}

function Options({ trip, onNext }: { trip: Trip; onNext: () => void }) {
  const resort = useResort(trip.resortId);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  const [kind, setKind] = useState<OptionKind>('flights');
  const [editing, setEditing] = useState<{ option: FlightOption | TransferOption | HotelOption; isNew: boolean } | null>(null);
  const m = (n: number) => money(n, currency);
  const people = Math.max(1, trip.attendeeIds.length);
  const nights = nightsOf(trip.dates);
  const resortAirports = resort?.airports ?? [];
  const firstAirport = resortAirports[0]?.iata ?? '';

  const add = (airport = firstAirport) =>
    setEditing({ option: kind === 'flights' ? blankFlight(airport) : kind === 'transfers' ? blankTransfer(airport) : blankHotel(), isNew: true });

  const tabs: { value: OptionKind; label: React.ReactNode }[] = [
    { value: 'flights', label: <><Plane size={15} /> Flights ({trip.flights.length})</> },
    { value: 'transfers', label: <><Bus size={15} /> Transfers ({trip.transfers.length})</> },
    { value: 'hotels', label: <><BedDouble size={15} /> Hotels ({trip.hotels.length})</> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={kind} onChange={setKind} options={tabs} />
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => add()}>
            <Plus size={16} /> Add {kind === 'flights' ? 'flight' : kind === 'transfers' ? 'transfer' : 'hotel'}
          </Button>
          {trip.flights.length > 0 && (
            <Button onClick={onNext}>Compare <ArrowRight size={16} /></Button>
          )}
        </div>
      </div>

      {kind === 'hotels' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trip.hotels.map((h) => (
            <OptionCard key={h.id} onClick={() => setEditing({ option: h, isNew: false })} link={h.link} notes={h.notes}
              title={h.name || 'Unnamed hotel'}
              tags={<>
                <Badge color="violet">{BOARDS.find((b) => b.value === h.board)?.label}</Badge>
                {h.skiInOut ? <Badge color="green">Ski-in/out</Badge> : h.distanceToLiftM ? <Badge>{h.distanceToLiftM} m to lift</Badge> : null}
              </>}
              price={m(hotelPerPerson(h, people, nights))}
              priceSub={`${m(h.pricePerNight)}/night ${h.pricing === 'per-room' ? `per room (${h.roomCapacity} ppl)` : 'pp'} · ${nights}n`}
            />
          ))}
          <AddTile onClick={() => add()} label="Add hotel" />
        </div>
      ) : (
        <div className="space-y-5">
          {resortAirports.length === 0 && (
            <div className="card p-6 text-center text-sm text-slate-500">
              This resort has no airports yet. <Link to={`/resorts/${trip.resortId}`} className="text-sky-600">Add them on the resort page →</Link>
            </div>
          )}
          {resortAirports.map((ra) => {
            const a = airports.find((x) => x.iata === ra.iata);
            const list = (kind === 'flights' ? trip.flights : trip.transfers).filter((o) => o.airport === ra.iata);
            return (
              <div key={ra.iata}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-sky-100 px-2 py-0.5 text-sm font-bold text-sky-800">{ra.iata}</span>
                  <span className="text-sm text-slate-600">{a?.name}</span>
                  <span className="text-xs text-slate-400">{ra.distanceKm} km · {driveTime(ra.driveTimeMin)} to resort</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {kind === 'flights'
                    ? (list as FlightOption[]).map((f) => (
                        <OptionCard key={f.id} onClick={() => setEditing({ option: f, isNew: false })} link={f.link} notes={f.notes}
                          title={f.airline || 'Flight'}
                          tags={<>{f.fromCity && <Badge>from {f.fromCity}</Badge>}</>}
                          detail={[f.outbound && `Out: ${f.outbound}`, f.inbound && `Back: ${f.inbound}`].filter(Boolean).join(' · ')}
                          price={m(f.pricePerPerson)}
                          priceSub="per person, return"
                        />
                      ))
                    : (list as TransferOption[]).map((t) => (
                        <OptionCard key={t.id} onClick={() => setEditing({ option: t, isNew: false })} link={t.link} notes={t.notes}
                          title={TRANSFER_TYPES.find((x) => x.value === t.type)?.label ?? t.type}
                          tags={<>{t.provider && <Badge>{t.provider}</Badge>}</>}
                          price={m(transferPerPerson(t, people))}
                          priceSub={t.pricing === 'per-vehicle' ? `${m(t.price)} per vehicle (${t.vehicleCapacity} seats) ÷ ${people}` : 'per person, return'}
                        />
                      ))}
                  <AddTile onClick={() => add(ra.iata)} label={`Add ${kind === 'flights' ? 'flight' : 'transfer'} via ${ra.iata}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <OptionDrawer trip={trip} kind={kind} option={editing.option} isNew={editing.isNew} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function OptionCard({ title, tags, detail, price, priceSub, link, notes, onClick }: {
  title: string; tags?: React.ReactNode; detail?: string; price: string; priceSub: string; link?: string; notes?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card group flex flex-col p-4 text-left transition hover:border-sky-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold">{title}</div>
        <Pencil size={14} className="text-slate-300 group-hover:text-slate-500" />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{tags}</div>
      {detail && <div className="mt-2 text-xs text-slate-500">{detail}</div>}
      {notes && <div className="mt-1 line-clamp-2 text-xs text-slate-400">{notes}</div>}
      <div className="mt-auto flex items-end justify-between pt-3">
        <div>
          <div className="text-lg font-bold">{price}</div>
          <div className="text-xs text-slate-500">{priceSub}</div>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-sky-600 hover:text-sky-800">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </button>
  );
}

function AddTile({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-sky-400 hover:text-sky-600">
      <Plus size={16} /> {label}
    </button>
  );
}
