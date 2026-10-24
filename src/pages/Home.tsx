import { differenceInCalendarDays } from 'date-fns';
import { ArrowRight, CalendarDays, Mountain, Shuffle, Snowflake, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Snowfall from '../components/Snowfall';
import { Button, Mountains } from '../components/ui';
import { upcomingWinterYear } from '../data/seed';
import { fromISO } from '../lib/dates';
import { isLocalServer } from '../lib/util';
import { useStore } from '../store/useStore';

// Any video/photo dropped into src/assets/home is picked up automatically.
const MEDIA = Object.entries(
  import.meta.glob('../assets/home/*.{mp4,webm,mov,MP4,MOV,jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>,
).map(([path, url]) => ({ url, video: /\.(mp4|webm|mov)$/i.test(path) }));

const randomIndex = (exclude = -1) => {
  if (MEDIA.length < 2) return 0;
  let i = exclude;
  while (i === exclude) i = Math.floor(Math.random() * MEDIA.length);
  return i;
};

export default function Home() {
  const winters = useStore((s) => s.winters);
  const vacations = useStore((s) => s.vacations);
  const createWinter = useStore((s) => s.createWinter);
  const navigate = useNavigate();
  const [mediaIdx, setMediaIdx] = useState(() => randomIndex());
  const media = MEDIA[mediaIdx];

  const year = upcomingWinterYear();
  const winter = winters.find((w) => w.year === year);
  const past = [...winters].filter((w) => w.year !== year).sort((a, b) => b.year - a.year);

  const next = useMemo(() => {
    if (!winter) return null;
    const today = new Date();
    return vacations
      .filter((v) => v.winterId === winter.id && v.dates && fromISO(v.dates.start) >= today)
      .sort((a, b) => a.dates!.start.localeCompare(b.dates!.start))[0] ?? null;
  }, [winter, vacations]);
  const winterVacations = winter ? vacations.filter((v) => v.winterId === winter.id).length : 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* Background media, faded */}
      <div className="absolute inset-0">
        {media ? (
          media.video ? (
            <video key={media.url} src={media.url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            <img key={media.url} src={media.url} alt="" className="h-full w-full scale-105 object-cover" />
          )
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-sky-200 via-sky-50 to-white" />
        )}
        <div className="absolute inset-0 bg-white/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white" />
        <Mountains className="absolute inset-x-0 bottom-0 h-48 w-full text-white" />
      </div>
      <Snowfall className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow">
            <Snowflake size={18} />
          </span>
          SomeGoodSki
        </div>
        <Link to="/resorts" className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
          <Mountain size={16} /> Resorts
        </Link>
      </header>

      {/* Center */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="animate-fade-up eyebrow mb-4 rounded-full bg-white/70 px-4 py-1.5 backdrop-blur">
          ❄ Winter {year} · Dec {year - 1} – Apr {year}
        </div>
        <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 [animation-delay:80ms] sm:text-7xl">
          Fresh tracks
          <br />
          <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">are calling.</span>
        </h1>
        <p className="animate-fade-up mt-5 max-w-xl text-lg text-slate-600 [animation-delay:160ms]">
          Round up the crew, find the dates everyone's free, and line up flights, transfers and chalets in one place.
        </p>

        <div className="animate-fade-up mt-10 [animation-delay:240ms]">
          {winter ? (
            <div className="flex flex-col items-center gap-5">
              <Button variant="accent" size="lg" onClick={() => navigate(`/w/${winter.id}`)} className="text-lg">
                Open Winter {year} <ArrowRight size={20} />
              </Button>
              <div className="glass flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl px-6 py-3 text-sm text-slate-600 shadow-soft">
                <span className="flex items-center gap-1.5"><Users size={15} className="text-sky-500" /> {winter.participants.length} riders</span>
                <span className="flex items-center gap-1.5"><Snowflake size={15} className="text-sky-500" /> {winterVacations} vacation{winterVacations === 1 ? '' : 's'}</span>
                {next && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={15} className="text-sky-500" />
                    <b className="text-slate-900">{next.name}</b> in {differenceInCalendarDays(fromISO(next.dates!.start), new Date())} days
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate(`/w/${createWinter(year)}`)}
              className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-glow transition hover:scale-[1.03] active:scale-[0.99]"
            >
              <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-sky-400/40 blur-xl" />
              <Snowflake size={24} className="transition group-hover:rotate-90" />
              Start Winter of {year}
              <ArrowRight size={22} />
            </button>
          )}
        </div>

        {past.length > 0 && (
          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-2 text-sm [animation-delay:320ms]">
            <span className="text-slate-500">Past winters:</span>
            {past.map((w) => (
              <Link key={w.id} to={`/w/${w.id}`} className="glass rounded-full px-3 py-1 font-semibold text-slate-700 hover:bg-white">
                {w.year}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Media controls */}
      <div className="absolute bottom-5 right-5 z-10">
        {MEDIA.length > 1 ? (
          <button onClick={() => setMediaIdx((i) => randomIndex(i))} className="glass flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white" title="Another video/photo">
            <Shuffle size={14} /> Shuffle
          </button>
        ) : MEDIA.length === 0 && isLocalServer ? (
          <div className="glass rounded-full px-4 py-2 text-xs text-slate-500">
            Add your ski videos or photos to <code className="font-semibold text-slate-700">src/assets/home</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}
