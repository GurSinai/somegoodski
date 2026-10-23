import { Mountain, Plane, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stars } from '../components/ResortIndexPanel';
import { Badge, Button, Drawer, Field, PageHeader, Toggle } from '../components/ui';
import { RESORT_INDEX } from '../data/resortIndex';
import { useStore } from '../store/useStore';
import type { Resort } from '../types';

type SortKey = 'rating' | 'size' | 'snow' | 'top' | 'name';

export const driveTime = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min}m`);

export default function Resorts() {
  const resorts = useStore((s) => s.resorts);
  const trips = useStore((s) => s.trips);
  const addResort = useStore((s) => s.addResort);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');
  const [trainOnly, setTrainOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', country: '', region: '' });

  const countries = useMemo(() => [...new Set(resorts.map((r) => r.country))].sort(), [resorts]);
  const idx = (r: Resort) => (r.indexSlug ? RESORT_INDEX[r.indexSlug] : undefined);
  const sortValue: Record<SortKey, (r: Resort) => number> = {
    rating: (r) => idx(r)?.rating ?? 0,
    size: (r) => idx(r)?.km.total ?? r.info.pisteKm ?? 0,
    snow: (r) => (idx(r)?.snowReliability ?? 0) * 1000 + (idx(r)?.elevation.top ?? 0) / 10, // ties: higher resort first
    top: (r) => idx(r)?.elevation.top ?? r.info.altitudeTop ?? 0,
    name: () => 0,
  };
  const shown = resorts
    .filter((r) => !country || r.country === country)
    .filter((r) => !trainOnly || idx(r)?.train?.direct)
    .filter((r) => !q || `${r.name} ${r.country} ${r.region} ${r.info.skiArea ?? ''} ${r.airports.map((a) => a.iata).join(' ')} ${idx(r)?.towns.join(' ') ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sortValue[sort](b) - sortValue[sort](a) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Resorts"
        subtitle="Ratings, snow reliability, trail maps and ways to arrive. Open a resort for the details, or add it to a vacation."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add resort
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Search resorts, countries, ski areas or airports…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="rating">Sort: best rated</option>
          <option value="size">Sort: biggest</option>
          <option value="snow">Sort: most snow-sure</option>
          <option value="top">Sort: highest</option>
          <option value="name">Sort: name</option>
        </select>
        <Toggle checked={trainOnly} onChange={setTrainOnly} label="Direct train" />
      </div>
      <p className="-mt-2 mb-5 text-xs text-slate-400">
        {shown.length} resorts · Europe’s resorts rated 3★+ with over 140 km of slopes, indexed from skiresort.com
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => {
          const tripCount = trips.filter((t) => t.resortId === r.id).length;
          const ix = idx(r);
          return (
            <Link key={r.id} to={`/resorts/${r.id}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-sky-200 via-sky-50 to-indigo-100">
                {ix?.map ? (
                  <img src={ix.map.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <svg viewBox="0 0 300 80" className="absolute bottom-0 h-full w-full" preserveAspectRatio="none">
                    <path d="M0 80 L60 30 L95 55 L150 10 L205 50 L240 28 L300 60 L300 80 Z" fill="white" />
                  </svg>
                )}
                {tripCount > 0 && <Badge color="amber" className="absolute right-3 top-3">in {tripCount} vacation{tripCount > 1 ? 's' : ''}</Badge>}
                {ix?.train?.direct && <Badge color="green" className="absolute left-3 top-3 bg-white/90">🚆 train</Badge>}
              </div>
              <div className="p-4 pt-3">
                <div className="font-semibold text-slate-900 group-hover:text-sky-700">{r.name}</div>
                <div className="text-sm text-slate-500">
                  {r.country}{r.region && r.region !== r.country ? ` · ${r.region.split(' / ')[0]}` : ''}
                </div>
                {ix && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Stars value={ix.rating} size={13} /> <b>{ix.rating}</b></span>
                    {ix.snowReliability && <span title="Snow reliability">❄ {ix.snowReliability}/5</span>}
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {r.info.skiArea && <span>{r.info.skiArea}</span>}
                  {(ix?.km.total ?? r.info.pisteKm) && <span>{ix?.km.total ?? r.info.pisteKm} km pistes</span>}
                  {ix?.lifts && <span>{ix.lifts} lifts</span>}
                  {(ix?.elevation.top ?? r.info.altitudeTop) && <span>↑ {ix?.elevation.top ?? r.info.altitudeTop} m</span>}
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
