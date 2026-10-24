import { CalendarDays, Mountain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../lib/util';

/** Plan / Dates tabs of a vacation. */
export default function VacationTabs({ winterId, vacationId, active }: { winterId: string; vacationId: string; active: 'plan' | 'dates' }) {
  const tabs = [
    { key: 'plan', label: 'Plan', icon: Mountain, to: `/w/${winterId}/v/${vacationId}` },
    { key: 'dates', label: 'Dates', icon: CalendarDays, to: `/w/${winterId}/v/${vacationId}/dates` },
  ] as const;
  return (
    <div className="mb-6 flex gap-1 rounded-full bg-slate-100/80 p-1 text-sm font-semibold sm:w-fit">
      {tabs.map(({ key, label, icon: Icon, to }) => (
        <Link
          key={key}
          to={to}
          className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 transition sm:flex-none', active === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
        >
          <Icon size={15} /> {label}
        </Link>
      ))}
    </div>
  );
}
