import { ArrowLeft, ExternalLink, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Field, NumberInput } from '../components/ui';
import { formatRange } from '../lib/dates';
import { STATUSES } from '../lib/labels';
import { useResort, useStore } from '../store/useStore';
import type { Resort, ResortInfo } from '../types';
import { driveTime } from './Resorts';

export default function ResortDetail() {
  const { id } = useParams();
  const resort = useResort(id);
  const allTrips = useStore((s) => s.trips);
  const trips = allTrips.filter((t) => t.resortId === id);
  const chosen = useStore((s) => s.season.chosenDates);
  const createTrip = useStore((s) => s.createTrip);
  const removeResort = useStore((s) => s.removeResort);
  const navigate = useNavigate();

  if (!resort) {
    return (
      <div className="text-slate-500">
        Resort not found. <Link to="/resorts" className="text-sky-600">Back to resorts</Link>
      </div>
    );
  }

  const newTrip = () => navigate(`/trips/${createTrip(resort.id)}`);

  return (
    <div>
      <Link to="/resorts" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> All resorts
      </Link>

      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-900 to-sky-600 p-6 text-white">
        <svg viewBox="0 0 600 120" className="absolute inset-x-0 bottom-0 h-24 w-full opacity-20" preserveAspectRatio="none">
          <path d="M0 120 L90 40 L150 80 L250 10 L340 70 L420 30 L520 85 L600 50 L600 120 Z" fill="white" />
        </svg>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-sky-200">{resort.country}{resort.region && resort.region !== resort.country ? ` · ${resort.region}` : ''}</div>
            <h1 className="text-3xl font-bold tracking-tight">{resort.name}</h1>
            {resort.info.skiArea && <div className="mt-1 text-sky-100">{resort.info.skiArea}</div>}
          </div>
          <div className="text-right">
            <Button variant="secondary" className="border-transparent font-semibold" onClick={newTrip}>
              <Plus size={16} /> Create trip to {resort.name}
            </Button>
            <div className="mt-1 text-xs text-sky-200">{chosen ? `Uses chosen dates: ${formatRange(chosen)}` : 'No dates chosen yet; you can set them on the trip'}</div>
          </div>
        </div>
      </div>

      {trips.length > 0 && (
        <div className="card mb-6 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Trips to this resort</div>
          <div className="flex flex-wrap gap-2">
            {trips.map((t) => {
              const st = STATUSES.find((s) => s.value === t.status)!;
              return (
                <Link key={t.id} to={`/trips/${t.id}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-sky-300 hover:bg-sky-50">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-slate-500">{formatRange(t.dates)}</span>
                  <Badge color={st.color}>{st.label}</Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard resort={resort} />
        <AirportsCard resort={resort} />
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm(`Delete ${resort.name} from the catalog?`)) {
              removeResort(resort.id);
              navigate('/resorts');
            }
          }}
        >
          <Trash2 size={14} /> Delete resort
        </Button>
      </div>
    </div>
  );
}

const INFO_FIELDS: { key: keyof ResortInfo; label: string; unit?: string; type: 'number' | 'text' }[] = [
  { key: 'skiArea', label: 'Ski area', type: 'text' },
  { key: 'altitudeBase', label: 'Base altitude', unit: 'm', type: 'number' },
  { key: 'altitudeTop', label: 'Top altitude', unit: 'm', type: 'number' },
  { key: 'pisteKm', label: 'Pistes', unit: 'km', type: 'number' },
  { key: 'lifts', label: 'Lifts', type: 'number' },
  { key: 'website', label: 'Website', type: 'text' },
];

function InfoCard({ resort }: { resort: Resort }) {
  const updateResort = useStore((s) => s.updateResort);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Resort>(resort);
  const levels = resort.info.levels ?? {};
  const hasLevels = levels.beginner || levels.intermediate || levels.advanced;

  const setInfo = (patch: Partial<ResortInfo>) => setDraft((d) => ({ ...d, info: { ...d.info, ...patch } }));

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Resort info</h2>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={() => { updateResort(resort.id, draft); setEditing(false); }}>Save</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { setDraft(resort); setEditing(true); }}>
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Country"><input className="input" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></Field>
            <Field label="Region"><input className="input" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {INFO_FIELDS.map((f) => (
              <Field key={f.key} label={f.unit ? `${f.label} (${f.unit})` : f.label}>
                {f.type === 'number' ? (
                  <NumberInput value={(draft.info[f.key] as number) ?? 0} onChange={(n) => setInfo({ [f.key]: n || undefined })} />
                ) : (
                  <input className="input" value={(draft.info[f.key] as string) ?? ''} onChange={(e) => setInfo({ [f.key]: e.target.value || undefined })} />
                )}
              </Field>
            ))}
          </div>
          <div>
            <span className="label">Piste mix (%)</span>
            <div className="grid grid-cols-3 gap-3">
              {(['beginner', 'intermediate', 'advanced'] as const).map((k) => (
                <Field key={k} label={k}>
                  <NumberInput value={draft.info.levels?.[k] ?? 0} onChange={(n) => setInfo({ levels: { ...draft.info.levels, [k]: n || undefined } })} />
                </Field>
              ))}
            </div>
          </div>
          <Field label="Notes">
            <textarea className="input min-h-24" value={draft.info.notes ?? ''} onChange={(e) => setInfo({ notes: e.target.value || undefined })} />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {INFO_FIELDS.map((f) => {
              const v = resort.info[f.key];
              return (
                <div key={f.key}>
                  <dt className="text-xs text-slate-500">{f.label}</dt>
                  <dd className="text-sm font-medium">
                    {v === undefined || v === '' ? (
                      <span className="font-normal italic text-slate-400">to be gathered</span>
                    ) : f.key === 'website' ? (
                      <a href={String(v)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-600 hover:underline">
                        Link <ExternalLink size={12} />
                      </a>
                    ) : (
                      `${v}${f.unit ? ` ${f.unit}` : ''}`
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div>
            <div className="mb-1.5 text-xs text-slate-500">Piste mix</div>
            {hasLevels ? (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-sky-500" style={{ width: `${levels.beginner ?? 0}%` }} />
                  <div className="bg-rose-500" style={{ width: `${levels.intermediate ?? 0}%` }} />
                  <div className="bg-slate-900" style={{ width: `${levels.advanced ?? 0}%` }} />
                </div>
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  <span>🔵 Blue {levels.beginner ?? 0}%</span><span>🔴 Red {levels.intermediate ?? 0}%</span><span>⚫ Black {levels.advanced ?? 0}%</span>
                </div>
              </>
            ) : (
              <span className="text-sm italic text-slate-400">to be gathered</span>
            )}
          </div>
          {resort.info.notes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{resort.info.notes}</p>}
        </div>
      )}
    </div>
  );
}

function AirportsCard({ resort }: { resort: Resort }) {
  const airports = useStore((s) => s.airports);
  const updateResort = useStore((s) => s.updateResort);
  const upsertAirport = useStore((s) => s.upsertAirport);
  const [adding, setAdding] = useState(false);
  const [row, setRow] = useState({ iata: '', name: '', city: '', country: '', distanceKm: 0, driveTimeMin: 0 });

  const known = airports.find((a) => a.iata === row.iata.toUpperCase());
  const sorted = [...resort.airports].sort((a, b) => a.driveTimeMin - b.driveTimeMin);

  const add = () => {
    const iata = row.iata.toUpperCase().trim();
    if (iata.length !== 3) return;
    if (!known) upsertAirport({ iata, name: row.name || iata, city: row.city, country: row.country });
    updateResort(resort.id, {
      airports: [...resort.airports.filter((a) => a.iata !== iata), { iata, distanceKm: row.distanceKm, driveTimeMin: row.driveTimeMin }],
    });
    setRow({ iata: '', name: '', city: '', country: '', distanceKm: 0, driveTimeMin: 0 });
    setAdding(false);
  };

  const patchAirport = (iata: string, patch: Partial<{ distanceKm: number; driveTimeMin: number }>) =>
    updateResort(resort.id, { airports: resort.airports.map((a) => (a.iata === iata ? { ...a, ...patch } : a)) });

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Nearest airports</h2>
        <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Add airport
        </Button>
      </div>

      <div className="space-y-2">
        {sorted.map((ra) => {
          const a = airports.find((x) => x.iata === ra.iata);
          return (
            <div key={ra.iata} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Plane size={13} />
                <span className="text-sm font-bold">{ra.iata}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a?.name ?? ra.iata}</div>
                <div className="text-xs text-slate-500">{[a?.city, a?.country].filter(Boolean).join(', ')}</div>
              </div>
              <label className="text-right">
                <span className="block text-[10px] uppercase text-slate-400">km</span>
                <input type="number" className="w-16 rounded border border-transparent bg-transparent text-right text-sm hover:border-slate-200 focus:border-sky-400 focus:outline-none" value={ra.distanceKm || ''} onChange={(e) => patchAirport(ra.iata, { distanceKm: Number(e.target.value) })} />
              </label>
              <label className="text-right">
                <span className="block text-[10px] uppercase text-slate-400">drive (min)</span>
                <input type="number" className="w-16 rounded border border-transparent bg-transparent text-right text-sm hover:border-slate-200 focus:border-sky-400 focus:outline-none" value={ra.driveTimeMin || ''} onChange={(e) => patchAirport(ra.iata, { driveTimeMin: Number(e.target.value) })} />
                <span className="block text-[10px] text-slate-400">{ra.driveTimeMin ? driveTime(ra.driveTimeMin) : ''}</span>
              </label>
              <button
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remove airport"
                onClick={() => updateResort(resort.id, { airports: resort.airports.filter((x) => x.iata !== ra.iata) })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {sorted.length === 0 && !adding && <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">No airports yet.</div>}
      </div>

      {adding && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="IATA">
              <input className="input uppercase" maxLength={3} list="airport-codes" value={row.iata} onChange={(e) => setRow({ ...row, iata: e.target.value })} placeholder="GVA" />
              <datalist id="airport-codes">{airports.map((a) => <option key={a.iata} value={a.iata}>{a.name}</option>)}</datalist>
            </Field>
            <Field label="Distance (km)"><NumberInput value={row.distanceKm} onChange={(distanceKm) => setRow({ ...row, distanceKm })} /></Field>
            <Field label="Drive (min)"><NumberInput value={row.driveTimeMin} onChange={(driveTimeMin) => setRow({ ...row, driveTimeMin })} /></Field>
          </div>
          {row.iata.length === 3 && (known ? (
            <div className="text-xs text-slate-500">{known.name}, {known.city}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Field label="Airport name"><input className="input" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} /></Field>
              <Field label="City"><input className="input" value={row.city} onChange={(e) => setRow({ ...row, city: e.target.value })} /></Field>
              <Field label="Country"><input className="input" value={row.country} onChange={(e) => setRow({ ...row, country: e.target.value })} /></Field>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={row.iata.trim().length !== 3} onClick={add}>Add airport</Button>
          </div>
        </div>
      )}
    </div>
  );
}
