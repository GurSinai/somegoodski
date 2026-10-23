import { CalendarDays, ChevronDown, Download, Mountain, Plus, Snowflake, Upload, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import CurrencyMenu, { useFxAutoRefresh } from './components/CurrencyMenu';
import { upcomingWinterYear } from './data/seed';
import { exportData, readImportFile } from './lib/io';
import { cx } from './lib/util';
import Dates from './pages/Dates';
import Home from './pages/Home';
import People from './pages/People';
import ResortDetail from './pages/ResortDetail';
import Resorts from './pages/Resorts';
import TripPage from './pages/TripPage';
import VacationPage from './pages/VacationPage';
import VacationSummary from './pages/VacationSummary';
import WinterHome from './pages/WinterHome';
import { useActiveWinter, useStore } from './store/useStore';
import type { AppData } from './types';

export default function App() {
  useFxAutoRefresh();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Shell />}>
        <Route path="/w/:winterId" element={<WinterScope />}>
          <Route index element={<WinterHome />} />
          <Route path="people" element={<People />} />
          <Route path="dates" element={<Dates />} />
          <Route path="v/:vacationId" element={<VacationPage />} />
          <Route path="v/:vacationId/t/:tripId" element={<TripPage />} />
          <Route path="v/:vacationId/summary" element={<VacationSummary />} />
        </Route>
        <Route path="/resorts" element={<Resorts />} />
        <Route path="/resorts/:id" element={<ResortDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Keeps the active winter in sync with the URL and guards unknown winters. */
function WinterScope() {
  const { winterId } = useParams();
  const exists = useStore((s) => s.winters.some((w) => w.id === winterId));
  const activeId = useStore((s) => s.settings.activeWinterId);
  const setActiveWinter = useStore((s) => s.setActiveWinter);
  useEffect(() => {
    if (exists && winterId !== activeId) setActiveWinter(winterId!);
  }, [exists, winterId, activeId, setActiveWinter]);
  if (!exists) return <Navigate to="/" replace />;
  return <Outlet />;
}

function Shell() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importData = useStore((s) => s.importData);
  const winter = useActiveWinter();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const onExport = () => {
    const { version, settings, friends, winters, vacations, airports, resorts, trips } = useStore.getState();
    exportData({ version, settings, friends, winters, vacations, airports, resorts, trips } as AppData);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await readImportFile(file);
      if (confirm('Replace all current data with the imported file?')) importData(data);
    } catch (e) {
      alert(`Could not import: ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const nav = [
    ...(winter
      ? [
          { to: `/w/${winter.id}`, label: 'Vacations', icon: Snowflake, end: true },
          { to: `/w/${winter.id}/people`, label: 'People', icon: Users, end: false },
          { to: `/w/${winter.id}/dates`, label: 'Dates', icon: CalendarDays, end: false },
        ]
      : []),
    { to: '/resorts', label: 'Resorts', icon: Mountain, end: false },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-100/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-5">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-glow">
              <Snowflake size={18} />
            </span>
            <span className="hidden lg:inline">SkiPlanner</span>
          </NavLink>
          <WinterSwitcher />
          <nav className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <CurrencyMenu />
            <button onClick={onExport} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" title="Export backup (JSON)">
              <Download size={18} />
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" title="Import backup (JSON)">
              <Upload size={18} />
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}

function WinterSwitcher() {
  const winters = useStore((s) => s.winters);
  const winter = useActiveWinter();
  const createWinter = useStore((s) => s.createWinter);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const upcoming = upcomingWinterYear();
  const sorted = [...winters].sort((a, b) => b.year - a.year);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-100 bg-sky-50/70 px-3 py-1.5 text-sm font-bold text-sky-800 hover:bg-sky-100"
      >
        <Snowflake size={14} />
        {winter ? <span><span className="hidden lg:inline">Winter </span>{winter.year}</span> : 'Pick a winter'}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-lift">
            {sorted.map((w) => (
              <button
                key={w.id}
                onClick={() => { setOpen(false); navigate(`/w/${w.id}`); }}
                className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50', w.id === winter?.id && 'font-bold text-sky-700')}
              >
                Winter {w.year}
                <span className="text-xs text-slate-400">{w.participants.length} people</span>
              </button>
            ))}
            {!winters.some((w) => w.year === upcoming) && (
              <button
                onClick={() => { setOpen(false); navigate(`/w/${createWinter(upcoming)}`); }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
              >
                <Plus size={14} /> Start Winter {upcoming}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
