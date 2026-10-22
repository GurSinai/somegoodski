import { CalendarDays, Plane, Plus, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Drawer, Empty, PageHeader } from '../components/ui';
import { buildCombos } from '../lib/combinations';
import { formatRange, nightsOf } from '../lib/dates';
import { STATUSES } from '../lib/labels';
import { money } from '../lib/util';
import { useStore } from '../store/useStore';

export default function Trips() {
  const trips = useStore((s) => s.trips);
  const resorts = useStore((s) => s.resorts);
  const currency = useStore((s) => s.settings.currency);
  const createTrip = useStore((s) => s.createTrip);
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle="One trip per candidate resort. Open a trip to enter prices and compare every option."
        actions={
          <Button variant="primary" onClick={() => setPicking(true)}>
            <Plus size={16} /> New trip
          </Button>
        }
      />

      {trips.length === 0 ? (
        <Empty icon={<Plane size={24} />} title="No trips yet">
          Create a trip to a resort. It picks up your chosen dates and the people who are free.
          <div className="mt-4">
            <Button variant="primary" onClick={() => setPicking(true)}>
              <Plus size={16} /> Create a trip
            </Button>
          </div>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((t) => {
            const resort = resorts.find((r) => r.id === t.resortId);
            const combos = buildCombos(t);
            const complete = combos.filter((c) => !c.incomplete);
            const cheapest = (complete.length ? complete : combos).reduce<(typeof combos)[number] | null>(
              (best, c) => (!best || c.perPerson.total < best.perPerson.total ? c : best),
              null,
            );
            const selected = combos.find((c) => c.id === t.selectedComboId);
            const st = STATUSES.find((s) => s.value === t.status)!;
            return (
              <Link key={t.id} to={`/trips/${t.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold group-hover:text-sky-700">{t.name}</div>
                    <div className="text-sm text-slate-500">{resort ? `${resort.name}, ${resort.country}` : 'Unknown resort'}</div>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {formatRange(t.dates)}{t.dates ? ` · ${nightsOf(t.dates)}n` : ''}</span>
                  <span className="flex items-center gap-1.5"><Users size={14} /> {t.attendeeIds.length}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {[['Flights', t.flights.length], ['Transfers', t.transfers.length], ['Hotels', t.hotels.length]].map(([l, n]) => (
                    <div key={l} className="rounded-lg bg-slate-50 py-2">
                      <div className="text-base font-semibold text-slate-800">{n}</div>
                      <div className="text-slate-500">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  {selected ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Trophy size={15} /> Selected plan</span>
                      <span className="text-lg font-bold">{money(selected.perPerson.total, currency)}<span className="text-xs font-normal text-slate-500"> /person</span></span>
                    </div>
                  ) : cheapest ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">From ({combos.length} combos)</span>
                      <span className="text-lg font-bold">{money(cheapest.perPerson.total, currency)}<span className="text-xs font-normal text-slate-500"> /person</span></span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Add flights to see combinations</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Drawer open={picking} onClose={() => setPicking(false)} title="Choose a resort">
        <div className="space-y-1">
          {[...resorts].sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/trips/${createTrip(r.id)}`)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-sky-50"
            >
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-sm text-slate-500">{r.country}</span>
              </span>
              <span className="text-xs text-slate-400">{r.airports.map((a) => a.iata).join(' · ')}</span>
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
