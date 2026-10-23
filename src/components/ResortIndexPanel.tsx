import { format } from 'date-fns';
import { Bus, Car, ExternalLink, Lightbulb, Map as MapIcon, Mountain, Plane, Snowflake, TrainFront } from 'lucide-react';
import type { ReactNode } from 'react';
import { INDEX_FETCHED_AT, RATING_LABELS, indexAirports, type ResortIndexEntry } from '../data/resortIndex';
import { cx } from '../lib/util';
import { Badge } from './ui';

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`);

/** 0–5 stars with partial fill. */
export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="text-xs text-slate-400">not rated</span>;
  return (
    <span className="relative inline-block whitespace-nowrap leading-none" style={{ fontSize: size }} title={`${value} out of 5`}>
      <span className="text-slate-200">★★★★★</span>
      <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: `${(value / 5) * 100}%` }}>★★★★★</span>
    </span>
  );
}

/** Everything the skiresort.com index and our research know about a resort. */
export default function ResortIndexPanel({ entry: r }: { entry: ResortIndexEntry }) {
  const runs = r.research?.runs;
  const arrival = r.research?.arrival;
  const airports = indexAirports(r);
  const total = r.km.total ?? 0;
  const segments: [string, number | null, string][] = [
    ['Easy', r.km.easy, '#3b82f6'],
    ['Intermediate', r.km.intermediate, '#ef4444'],
    ['Difficult', r.km.difficult, '#0f172a'],
  ];

  return (
    <div className="space-y-6">
      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Fact label="Rating" value={<span className="flex items-center gap-2">{r.rating ?? '–'} <Stars value={r.rating} /></span>} />
        <Fact label="Snow reliability" value={<span className="flex items-center gap-2"><Snowflake size={16} className="text-sky-500" /> <Stars value={r.snowReliability} /></span>} sub={r.snowmakingPct ? `${r.snowmakingPct}% with snow-making` : undefined} />
        <Fact label="Height" value={`${r.elevation.base ?? '?'}–${r.elevation.top ?? '?'} m`} sub={r.elevation.diff ? `${r.elevation.diff} m vertical` : undefined} />
        <Fact label="Size" value={`${total} km`} sub={r.longestRun ? `longest run ${r.longestRun.km} km` : undefined} />
        <Fact label="Lifts" value={r.lifts ?? '–'} />
        <Fact label="Snow-making" value={r.snowmakingPct ? `${r.snowmakingPct}%` : '–'} sub="of the slopes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Piste distribution */}
        <section className="card p-6">
          <h2 className="mb-1 text-lg font-bold">Piste distribution</h2>
          <p className="mb-4 text-xs text-slate-500">By length, from skiresort.com. "Easy" includes green runs where the resort grades them.</p>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {segments.map(([label, km, color]) => (km ? <div key={label} style={{ width: `${(km / total) * 100}%`, background: color }} title={`${label}: ${km} km`} /> : null))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {segments.map(([label, km, color]) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</div>
                <div className="font-bold">{km ?? '–'} km <span className="text-xs font-normal text-slate-400">{km && total ? `${Math.round((km / total) * 100)}%` : ''}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="label">Runs by colour</div>
            {runs ? (
              <>
                <div className="flex flex-wrap gap-4 text-sm font-semibold">
                  <Run color="#10b981" label="Green" n={runs.green} />
                  <Run color="#3b82f6" label="Blue" n={runs.blue} />
                  <Run color="#ef4444" label="Red" n={runs.red} />
                  <Run color="#0f172a" label="Black" n={runs.black} />
                </div>
                {runs.note && <p className="mt-1.5 text-xs text-slate-400">{runs.note}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-500">No green grade here: as usual in {r.country}, blue is the easiest. Beginners rating: <Stars value={r.ratings.Beginners ?? null} size={12} /></p>
            )}
          </div>
        </section>

        {/* Trail map */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 pb-3 pt-5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><MapIcon size={18} className="text-sky-500" /> Trail map</h2>
            {r.map && <a href={r.map.page} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline">skiresort.com <ExternalLink size={11} /></a>}
          </div>
          {r.map ? (
            <a href={r.map.full} target="_blank" rel="noreferrer" className="group block bg-slate-50" title="Open the full-size trail map">
              <img src={r.map.thumb} alt={`Trail map of ${r.name}`} loading="lazy" referrerPolicy="no-referrer" className="max-h-80 w-full object-contain transition group-hover:opacity-90" />
              <div className="px-6 py-2 text-xs text-slate-400">Click to open the full-size map</div>
            </a>
          ) : (
            <p className="px-6 pb-6 text-sm text-slate-500">No trail map indexed.</p>
          )}
        </section>
      </div>

      {/* Getting there */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Getting there</h2>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <div className="label flex items-center gap-1.5"><Plane size={12} /> Closest airports</div>
            <div className="space-y-1.5">
              {airports.map((a) => (
                <div key={a.iata} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span><b>{a.iata}</b> <span className="text-slate-500">{a.name}, {a.country}</span></span>
                  <span className="text-xs text-slate-500">{a.km} km · {hm(a.driveMin)}</span>
                </div>
              ))}
              {!airports.length && <p className="text-sm text-slate-400">No airport data.</p>}
              {!r.airports.length && r.research?.airports && <p className="text-xs text-slate-400">Road estimates (skiresort.com lists no airports for this resort).</p>}
            </div>
          </div>
          <div className="space-y-3">
            <Way icon={<TrainFront size={16} />} title="Train" badge={r.train ? (r.train.direct ? <Badge color="green">direct connection</Badge> : <Badge>no direct train</Badge>) : null}>
              {arrival?.train}
              {r.train?.info && <span className="mt-1 block text-xs text-slate-400">skiresort.com: {r.train.info}</span>}
            </Way>
            {arrival?.bus && <Way icon={<Bus size={16} />} title="Buses, shuttles & transfers">{arrival.bus}</Way>}
            {arrival?.car && <Way icon={<Car size={16} />} title="By car">{arrival.car}</Way>}
            {arrival?.tip && <Way icon={<Lightbulb size={16} />} title="Tip">{arrival.tip}</Way>}
          </div>
        </div>
        {r.research?.sources.length ? (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            Sources:
            {r.research.sources.map((s) => (
              <a key={s} href={s} target="_blank" rel="noreferrer" className="hover:text-sky-600 hover:underline">{new URL(s).hostname.replace(/^www\./, '')}</a>
            ))}
          </div>
        ) : null}
      </section>

      {/* Test categories + villages */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-3 text-lg font-bold">Test ratings</h2>
          {Object.keys(r.ratings).length > 3 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {RATING_LABELS.filter(([key]) => r.ratings[key] != null).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <Stars value={r.ratings[key]} size={13} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">skiresort.com has only a partial evaluation for this resort.</p>
          )}
        </section>
        <section className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Mountain size={18} className="text-sky-500" /> Villages</h2>
          <div className="flex flex-wrap gap-1.5">
            {r.towns.map((t) => <Badge key={t} color="sky">{t}</Badge>)}
            {!r.towns.length && <span className="text-sm text-slate-400">Not listed.</span>}
          </div>
        </section>
      </div>

      <p className="text-xs text-slate-400">
        Resort data from <a href={r.source} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">skiresort.com</a>, indexed {format(new Date(INDEX_FETCHED_AT), 'd MMM yyyy')}.
        Re-run <code>node scripts/index-resorts.mjs</code> to refresh.
      </p>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Run({ color, label, n }: { color: string; label: string; n: number }) {
  return <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: color }} /> {n} <span className="font-normal text-slate-500">{label}</span></span>;
}

function Way({ icon, title, badge, children }: { icon: ReactNode; title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className={cx('flex gap-3 rounded-2xl bg-slate-50/80 p-3')}>
      <span className="mt-0.5 text-sky-600">{icon}</span>
      <div className="min-w-0 flex-1 text-sm text-slate-700">
        <div className="mb-0.5 flex flex-wrap items-center gap-2 font-semibold text-slate-900">{title} {badge}</div>
        {children}
      </div>
    </div>
  );
}
