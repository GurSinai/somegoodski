import { Mountain, Plane, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Drawer, Field, PageHeader } from '../components/ui';
import { formatRange } from '../lib/dates';
import { useStore } from '../store/useStore';

export const driveTime = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min}m`);

export default function Resorts() {
  const resorts = useStore((s) => s.resorts);
  const trips = useStore((s) => s.trips);
  const chosen = useStore((s) => s.season.chosenDates);
  const addResort = useStore((s) => s.addResort);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', country: '', region: '' });

  const countries = useMemo(() => [...new Set(resorts.map((r) => r.country))].sort(), [resorts]);
  const shown = resorts
    .filter((r) => !country || r.country === country)
    .filter((r) => !q || `${r.name} ${r.country} ${r.region} ${r.info.skiArea ?? ''} ${r.airports.map((a) => a.iata).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Resorts"
        subtitle={
          chosen ? (
            <>Trip dates: <b className="text-slate-700">{formatRange(chosen)}</b>. Open a resort and create a trip to it.</>
          ) : (
            'Your resort catalog. Pick dates on the Dates page first so new trips get them automatically.'
          )
        }
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add resort
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search resorts, countries, ski areas or airports…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => {
          const tripCount = trips.filter((t) => t.resortId === r.id).length;
          return (
            <Link key={r.id} to={`/resorts/${r.id}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-20 bg-gradient-to-br from-sky-700 via-sky-500 to-cyan-300">
                <svg viewBox="0 0 300 80" className="absolute bottom-0 h-full w-full" preserveAspectRatio="none">
                  <path d="M0 80 L60 30 L95 55 L150 10 L205 50 L240 28 L300 60 L300 80 Z" fill="white" opacity="0.9" />
                  <path d="M150 10 L135 24 L150 20 L165 26 Z" fill="#e0f2fe" />
                </svg>
                {tripCount > 0 && <Badge color="amber" className="absolute right-3 top-3">{tripCount} trip{tripCount > 1 ? 's' : ''}</Badge>}
              </div>
              <div className="p-4 pt-1">
                <div className="font-semibold text-slate-900 group-hover:text-sky-700">{r.name}</div>
                <div className="text-sm text-slate-500">
                  {r.country}{r.region && r.region !== r.country ? ` · ${r.region}` : ''}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {r.info.skiArea && <span>{r.info.skiArea}</span>}
                  {r.info.pisteKm && <span>{r.info.pisteKm} km pistes</span>}
                  {r.info.altitudeTop && <span>↑ {r.info.altitudeTop} m</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.airports.map((a) => (
                    <Badge key={a.iata} color="sky">
                      <Plane size={11} /> {a.iata} · {driveTime(a.driveTimeMin)}
                    </Badge>
                  ))}
                  {r.airports.length === 0 && <span className="text-xs text-slate-400">No airports yet</span>}
                </div>
              </div>
            </Link>
          );
        })}
        {shown.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-slate-500">
            <Mountain size={28} /> No resorts match.
          </div>
        )}
      </div>

      <Drawer
        open={adding}
        onClose={() => setAdding(false)}
        title="Add resort"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!draft.name.trim()}
              onClick={() => {
                const id = addResort({ ...draft, info: {}, airports: [] });
                setAdding(false);
                setDraft({ name: '', country: '', region: '' });
                navigate(`/resorts/${id}`);
              }}
            >
              Add & open
            </Button>
          </>
        }
      >
        <Field label="Name">
          <input className="input" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Country">
          <input className="input" list="countries" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
          <datalist id="countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Region">
          <input className="input" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} />
        </Field>
        <p className="text-xs text-slate-500">You can add airports and details on the resort page.</p>
      </Drawer>
    </div>
  );
}
