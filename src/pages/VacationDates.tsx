import { ChevronRight, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AvailabilityBoard from '../components/AvailabilityBoard';
import VacationTabs from '../components/VacationTabs';
import { Empty, PageHeader } from '../components/ui';
import { formatRange, nightsOf } from '../lib/dates';
import { useActiveWinter, useStore, useVacation, useVacationPeople } from '../store/useStore';
import type { DateRange } from '../types';

/** A vacation's own heatmap: just the people going (yours and your partner's). Picking dates sets the vacation's dates. */
export default function VacationDates() {
  const { vacationId } = useParams();
  const winter = useActiveWinter()!;
  const vacation = useVacation(vacationId);
  const people = useVacationPeople(vacation);
  const setVacationAvailability = useStore((s) => s.setVacationAvailability);
  const updateVacation = useStore((s) => s.updateVacation);

  if (!vacation || vacation.winterId !== winter.id) {
    return <div className="text-slate-500">Vacation not found. <Link to={`/w/${winter.id}`} className="text-sky-600">Back to Winter {winter.year}</Link></div>;
  }

  const setDates = (r: DateRange) => {
    const label = `${formatRange(r)} (${nightsOf(r)} nights)`;
    if (!vacation.dates || confirm(`Change “${vacation.name}” to ${label}?`)) updateVacation(vacation.id, { dates: r });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
        <Link to={`/w/${winter.id}`} className="hover:text-slate-800">Winter {winter.year}</Link>
        <ChevronRight size={14} />
        <Link to={`/w/${winter.id}/v/${vacation.id}`} className="hover:text-slate-800">{vacation.name}</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700">Dates</span>
      </div>
      <PageHeader
        title={`When can the ${vacation.name} crew go?`}
        subtitle={
          vacation.dates
            ? `Currently ${formatRange(vacation.dates)} · ${nightsOf(vacation.dates)} nights. Drag across days or pick a best window to change it.`
            : 'Drag across days or pick a best window to set the dates.'
        }
      />
      <VacationTabs winterId={winter.id} vacationId={vacation.id} active="dates" />

      {people.length === 0 ? (
        <Empty icon={<Users size={26} />} title="Nobody’s going yet">
          Add people on the <Link to={`/w/${winter.id}/v/${vacation.id}`} className="font-semibold text-sky-600 hover:underline">Plan tab →</Link>
        </Empty>
      ) : (
        <AvailabilityBoard
          people={people}
          start={winter.start}
          end={winter.end}
          setAvailability={(id, days, on) => setVacationAvailability(vacation.id, id, days, on)}
          rings={vacation.dates ? [{ range: vacation.dates, color: '#f59e0b' }] : []}
          pickLabel="Use these dates"
          onPick={setDates}
        />
      )}
    </div>
  );
}
