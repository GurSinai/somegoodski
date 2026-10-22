import { ArrowRight, BedDouble, Bus, ChevronRight, ExternalLink, Pencil, Plane, Plus, Scale, Star, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import OptionDrawer, { blankFlight, blankHotel, blankTransfer, type OptionKind } from '../components/OptionForms';
import TripComparison from '../components/TripComparison';
import { Badge, Button, Field, Mountains, NumberInput, Segmented } from '../components/ui';
import { hotelPerPerson, transferPerPerson } from '../lib/combinations';
import { formatRange, nightsOf } from '../lib/dates';
import { boardLabel, transferLabel } from '../lib/labels';
import { cx, money } from '../lib/util';
import { pricedTrip, useActiveWinter, useResort, useStore, useTrip, useVacation, useWinterFriends } from '../store/useStore';
import type { FlightOption, HotelOption, PricedTrip, TransferOption } from '../types';
import { driveTime } from './Resorts';

type Tab = 'options' | 'compare';

export default function TripPage() {
  const { vacationId, tripId } = useParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const trip = useTrip(tripId);
  const resort = useResort(trip?.resortId);
  const friends = useWinterFriends(winter);
  const airports = useStore((s) => s.airports);
  const updateVacation = useStore((s) => s.updateVacation);
  const removeTrip = useStore((s) => s.removeTrip);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => (trip && trip.flights.length ? 'compare' : 'options'));

  if (!trip || !vacation || trip.vacationId !== vacation.id) {
    return <div className="text-slate-500">Resort not found. <Link to={`/w/${winter.id}`} className="text-sky-600">Back to Winter {winter.year}</Link></div>;
  }
  const pt = pricedTrip(trip, vacation);
  const chosen = vacation.selectedTripId === trip.id;
  const vacationUrl = `/w/${winter.id}/v/${vacation.id}`;
  const optionCount = trip.flights.length + trip.transfers.length + trip.hotels.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
        <Link to={`/w/${winter.id}`} className="hover:text-slate-800">Winter {winter.year}</Link>
        <ChevronRight size={14} />
        <Link to={vacationUrl} className="hover:text-slate-800">{vacation.name}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700">{resort?.name ?? trip.name}</span>
      </div>

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-100 via-white to-indigo-50 px-8 pb-16 pt-8 shadow-soft">
        <Mountains className="absolute inset-x-0 bottom-0 h-20 w-full text-sky-200" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">{resort?.country}{resort?.info.skiArea ? ` · ${resort.info.skiArea}` : ''}</div>
            <h1 className="mt-1 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-slate-900">
              {resort?.name ?? trip.name}
              {chosen && <Badge color="green" className="text-sm"><Star size={13} /> Chosen</Badge>}
            </h1>
            <div className="mt-2 text-slate-500">{vacation.name} · {formatRange(vacation.dates)} · {nightsOf(vacation.dates)} nights · {vacation.attendeeIds.length} riders</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {resort?.airports.map((a) => (
                <Badge key={a.iata} color="sky"><Plane size={11} /> {a.iata} · {airports.find((x) => x.iata === a.iata)?.city} · {driveTime(a.driveTimeMin)}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chosen ? (
              <Button onClick={() => updateVacation(vacation.id, { selectedTripId: null })}>Unchoose</Button>
            ) : (
              <Button variant="primary" onClick={() => updateVacation(vacation.id, { selectedTripId: trip.id, status: vacation.status === 'planning' ? 'decided' : vacation.status })}>
                <Trophy size={15} /> Choose this resort
              </Button>
            )}
            <Link to={`/resorts/${trip.resortId}`}><Button variant="ghost" size="sm"><ExternalLink size={15} /></Button></Link>
            <Button variant="danger" size="sm" onClick={() => { if (confirm(`Remove ${resort?.name} from ${vacation.name}?`)) { removeTrip(trip.id); navigate(vacationUrl); } }}>
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'options', label: <><Plane size={15} /> Options & prices <span className="text-xs text-slate-400">{optionCount}</span></> },
            { value: 'compare', label: <><Scale size={15} /> Trip comparison</> },
          ]}
        />
        {!vacation.dates && <Badge color="amber">Set dates on the vacation to price hotels per night</Badge>}
      </div>

      {tab === 'options' ? <Options trip={pt} onNext={() => setTab('compare')} /> : <TripComparison trip={pt} vacation={vacation} friends={friends} />}
    </div>
  );
}

function Options({ trip, onNext }: { trip: PricedTrip; onNext: () => void }) {
  const resort = useResort(trip.resortId);
  const airports = useStore((s) => s.airports);
  const currency = useStore((s) => s.settings.currency);
  const updateTrip = useStore((s) => s.updateTrip);
  const [kind, setKind] = useState<OptionKind>('flights');
  const [editing, setEditing] = useState<{ option: FlightOption | TransferOption | HotelOption; isNew: boolean } | null>(null);
  const m = (n: number) => money(n, currency);
  const people = Math.max(1, trip.attendeeIds.length);
  const nights = nightsOf(trip.dates);
  const resortAirports = resort?.airports ?? [];
  const noun = kind === 'flights' ? 'flight' : kind === 'transfers' ? 'transfer' : 'hotel';

  const add = (airport = resortAirports[0]?.iata ?? '') =>
    setEditing({ option: kind === 'flights' ? blankFlight(airport) : kind === 'transfers' ? blankTransfer(airport) : blankHotel(), isNew: true });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'flights', label: <><Plane size={15} /> Flights ({trip.flights.length})</> },
            { value: 'transfers', label: <><Bus size={15} /> Transfers ({trip.transfers.length})</> },
            { value: 'hotels', label: <><BedDouble size={15} /> Hotels ({trip.hotels.length})</> },
          ]}
        />
        <div className="flex items-end gap-2">
          <Field label={`Lift pass / person (${currency})`} className="w-40">
            <NumberInput value={trip.liftPassPerPerson} onChange={(liftPassPerPerson) => updateTrip(trip.id, { liftPassPerPerson })} min={0} />
          </Field>
          <Button variant="primary" onClick={() => add()}><Plus size={16} /> Add {noun}</Button>
          {trip.flights.length > 0 && <Button onClick={onNext}>Compare <ArrowRight size={16} /></Button>}
        </div>
      </div>

      {kind === 'hotels' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trip.hotels.map((h) => (
            <OptionCard key={h.id} onClick={() => setEditing({ option: h, isNew: false })} link={h.link} notes={h.notes}
              title={h.name || 'Unnamed hotel'}
              tags={<>
                <Badge color="violet">{boardLabel(h.board)}</Badge>
                {h.skiInOut ? <Badge color="green">Ski-in/out</Badge> : h.distanceToLiftM ? <Badge>{h.distanceToLiftM} m to lift</Badge> : null}
              </>}
              price={m(hotelPerPerson(h, people, nights))}
              priceSub={`${m(h.pricePerNight)}/night ${h.pricing === 'per-room' ? `per room (${h.roomCapacity} ppl)` : 'pp'} · ${nights}n`}
            />
          ))}
          <AddTile onClick={() => add()} label="Add hotel" />
        </div>
      ) : (
        <div className="space-y-7">
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
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-sm font-bold text-white">{ra.iata}</span>
                  <span className="text-sm font-semibold text-slate-700">{a?.name}</span>
                  <span className="text-xs text-slate-400">{ra.distanceKm} km · {driveTime(ra.driveTimeMin)} to resort</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                          title={transferLabel(t.type)}
                          tags={<>{t.provider && <Badge>{t.provider}</Badge>}</>}
                          price={m(transferPerPerson(t, people))}
                          priceSub={t.pricing === 'per-vehicle' ? `${m(t.price)} per vehicle (${t.vehicleCapacity} seats) ÷ ${people}` : 'per person, return'}
                        />
                      ))}
                  <AddTile onClick={() => add(ra.iata)} label={`Add ${noun} via ${ra.iata}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <OptionDrawer trip={trip} kind={kind} option={editing.option} isNew={editing.isNew} onClose={() => setEditing(null)} />}
    </div>
  );
}

function OptionCard({ title, tags, detail, price, priceSub, link, notes, onClick }: {
  title: string; tags?: React.ReactNode; detail?: string; price: string; priceSub: string; link?: string; notes?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="text-base font-bold">{title}</div>
        <Pencil size={14} className="text-slate-200 group-hover:text-slate-500" />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{tags}</div>
      {detail && <div className="mt-2 text-xs text-slate-500">{detail}</div>}
      {notes && <div className="mt-1 line-clamp-2 text-xs text-slate-400">{notes}</div>}
      <div className="mt-auto flex items-end justify-between pt-4">
        <div>
          <div className="text-xl font-extrabold">{price}</div>
          <div className="text-xs text-slate-400">{priceSub}</div>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-1.5 text-sky-600 hover:bg-sky-50">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </button>
  );
}

function AddTile({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={cx('flex min-h-32 items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-600')}>
      <Plus size={16} /> {label}
    </button>
  );
}
