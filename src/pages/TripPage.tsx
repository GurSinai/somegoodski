import { BedDouble, Bus, ChevronRight, ClipboardList, ExternalLink, Plane, Receipt, Scale, Shirt, Star, Ticket, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import OptionDrawer, { type AnyOption, type OptionKind } from '../components/OptionForms';
import TripComparison from '../components/TripComparison';
import { ExpensesTab, FlightsTab, HotelsTab, PassesTab, RentalTab, TransfersTab } from '../components/TripTabs';
import { Badge, Button, Mountains } from '../components/ui';
import { formatRange, nightsOf } from '../lib/dates';
import { cx } from '../lib/util';
import { pricedTrip, useActiveWinter, useConverter, useResort, useStore, useTrip, useVacation, useVacationPeople } from '../store/useStore';
import { driveTime } from './Resorts';

type Tab = OptionKind | 'compare';

export default function TripPage() {
  const { vacationId, tripId } = useParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const trip = useTrip(tripId);
  const resort = useResort(trip?.resortId);
  const going = useVacationPeople(vacation);
  const cv = useConverter();
  const airports = useStore((s) => s.airports);
  const updateVacation = useStore((s) => s.updateVacation);
  const removeTrip = useStore((s) => s.removeTrip);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => (trip && trip.flights.length ? 'compare' : 'flights'));
  const [editing, setEditing] = useState<{ kind: OptionKind; option: AnyOption; isNew: boolean } | null>(null);

  if (!trip || !vacation || trip.vacationId !== vacation.id) {
    return <div className="text-slate-500">Resort not found. <Link to={`/w/${winter.id}`} className="text-sky-600">Back to Winter {winter.year}</Link></div>;
  }
  const pt = pricedTrip(trip, vacation, cv);
  const chosen = vacation.selectedTripId === trip.id;
  const vacationUrl = `/w/${winter.id}/v/${vacation.id}`;
  // tabs show converted prices; editing must start from the option as entered
  const edit = (kind: OptionKind, option: AnyOption, isNew: boolean) =>
    setEditing({ kind, isNew, option: isNew ? option : (trip[kind] as AnyOption[]).find((o) => o.id === option.id) ?? option });
  const tabProps = { trip: pt, friends: going, edit };

  const tabs: { value: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: 'flights', label: 'Flights', icon: <Plane size={15} />, count: trip.flights.length },
    { value: 'transfers', label: 'Transfers', icon: <Bus size={15} />, count: trip.transfers.length },
    { value: 'hotels', label: 'Hotels', icon: <BedDouble size={15} />, count: trip.hotels.length },
    { value: 'skiPasses', label: 'Ski passes', icon: <Ticket size={15} />, count: trip.skiPasses.length },
    { value: 'shops', label: 'Ski stores', icon: <Shirt size={15} />, count: trip.shops.length },
    { value: 'expenses', label: 'Expenses', icon: <Receipt size={15} />, count: trip.expenses.length },
    { value: 'compare', label: 'Trip comparison', icon: <Scale size={15} /> },
  ];

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-full border border-slate-100 bg-slate-100/70 p-1 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cx(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                tab === t.value ? (t.value === 'compare' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {t.icon} {t.label}
              {t.count !== undefined && <span className={cx('text-xs', tab === t.value ? 'opacity-60' : 'text-slate-400')}>{t.count}</span>}
            </button>
          ))}
        </div>
        {chosen && trip.selectedComboId && (
          <Link to={`${vacationUrl}/summary`}>
            <Button variant="accent" size="sm"><ClipboardList size={14} /> Vacation summary →</Button>
          </Link>
        )}
        {!vacation.dates && <Badge color="amber">Set dates on the vacation to price per-night and per-day items</Badge>}
      </div>

      {tab === 'flights' && <FlightsTab {...tabProps} />}
      {tab === 'transfers' && <TransfersTab {...tabProps} />}
      {tab === 'hotels' && <HotelsTab {...tabProps} />}
      {tab === 'skiPasses' && <PassesTab {...tabProps} />}
      {tab === 'shops' && <RentalTab {...tabProps} />}
      {tab === 'expenses' && <ExpensesTab {...tabProps} />}
      {tab === 'compare' && <TripComparison trip={pt} vacation={vacation} friends={going} />}

      {editing && <OptionDrawer trip={pt} friends={going} kind={editing.kind} option={editing.option} isNew={editing.isNew} onClose={() => setEditing(null)} />}
    </div>
  );
}
