import { CalendarDays, Download, Mountain, Plane, Upload, Users } from 'lucide-react';
import { useRef } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { exportData, readImportFile } from './lib/io';
import { cx } from './lib/util';
import Dates from './pages/Dates';
import People from './pages/People';
import ResortDetail from './pages/ResortDetail';
import Resorts from './pages/Resorts';
import TripDetail from './pages/TripDetail';
import Trips from './pages/Trips';
import { useStore } from './store/useStore';
import type { AppData } from './types';

const NAV = [
  { to: '/people', label: 'People', icon: Users, step: 1 },
  { to: '/dates', label: 'Dates', icon: CalendarDays, step: 2 },
  { to: '/resorts', label: 'Resorts', icon: Mountain, step: 3 },
  { to: '/trips', label: 'Trips', icon: Plane, step: 4 },
];

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importData = useStore((s) => s.importData);
  const currency = useStore((s) => s.settings.currency);
  const updateSettings = useStore((s) => s.updateSettings);

  const onExport = () => {
    const { version, settings, friends, season, airports, resorts, trips } = useStore.getState();
    exportData({ version, settings, friends, season, airports, resorts, trips } as AppData);
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="text-2xl">🏔️</span> <span className="hidden sm:inline">SkiPlanner</span>
          </div>
          <nav className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAV.map(({ to, label, icon: Icon, step }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <span className="hidden h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] lg:flex">{step}</span>
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
              value={currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              title="Currency"
            >
              {['EUR', 'USD', 'ILS', 'GBP', 'CHF'].map((c) => (
                <option key={c} value={c} className="text-slate-900">{c}</option>
              ))}
            </select>
            <button onClick={onExport} className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white" title="Export data (JSON)">
              <Download size={18} />
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white" title="Import data (JSON)">
              <Upload size={18} />
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/people" replace />} />
          <Route path="/people" element={<People />} />
          <Route path="/dates" element={<Dates />} />
          <Route path="/resorts" element={<Resorts />} />
          <Route path="/resorts/:id" element={<ResortDetail />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="*" element={<Navigate to="/people" replace />} />
        </Routes>
      </main>
    </div>
  );
}
