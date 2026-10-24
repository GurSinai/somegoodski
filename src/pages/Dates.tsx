import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvailabilityBoard, { ring } from '../components/AvailabilityBoard';
import { Button, Empty, PageHeader } from '../components/ui';
import { formatRange, nightsOf } from '../lib/dates';
import { useActiveWinter, useStore, useVacationsOf, useWinterFriends } from '../store/useStore';
import type { DateRange } from '../types';

// Vacation ranges on the calendar get these ring colors, in order.
export const VACATION_RINGS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#ef4444'];

/** The general Dates page: your whole roster for the winter. Picking dates creates a vacation. */
export default function Dates() {
  const winter = useActiveWinter()!;
  const friends = useWinterFriends(winter);
  const vacations = useVacationsOf(winter.id);
  const setAvailability = useStore((s) => s.setAvailability);
  const createVacation = useStore((s) => s.createVacation);
  const navigate = useNavigate();
  const datedVacations = vacations.filter((v) => v.dates);

  if (friends.length === 0) {
    return (
      <div>
        <PageHeader eyebrow={`Winter ${winter.year} · Step 2`} title="When can everyone go?" />
        <Empty icon={<Users size={26} />} title="Add riders first">
          Availability is set per rider. <Link to={`/w/${winter.id}/people`} className="font-semibold text-sky-600 hover:underline">Go to People →</Link>
        </Empty>
      </div>
    );
  }

  const startVacation = (r: DateRange) => navigate(`/w/${winter.id}/v/${createVacation(winter.id, r)}`);

  return (
    <div>
      <PageHeader
        eyebrow={`Winter ${winter.year} · Step 2`}
        title="When can everyone go?"
        subtitle="Paint each rider’s free days. The heatmap and best windows show when the most people can make it. Each vacation also has its own Dates tab for just the people going."
      />

      {datedVacations.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label mb-0 mr-1">On the calendar</span>
          {datedVacations.map((v, i) => (
            <Link key={v.id} to={`/w/${winter.id}/v/${v.id}/dates`} className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-white py-1 pl-2 pr-3 text-sm font-semibold shadow-sm hover:border-slate-200">
              <span className="h-2.5 w-2.5 rounded-full bg-white" style={ring(VACATION_RINGS[i % VACATION_RINGS.length])} />
              {v.name} <span className="font-normal text-slate-400">{formatRange(v.dates)}</span>
            </Link>
          ))}
        </div>
      )}

      <AvailabilityBoard
        people={friends}
        start={winter.start}
        end={winter.end}
        setAvailability={(id, days, on) => setAvailability(winter.id, id, days, on)}
        rings={datedVacations.map((v, i) => ({ range: v.dates!, color: VACATION_RINGS[i % VACATION_RINGS.length] }))}
        pickLabel="Create vacation"
        onPick={startVacation}
        aside={<ManualVacation onCreate={startVacation} />}
      />
    </div>
  );
}

function ManualVacation({ onCreate }: { onCreate: (r: DateRange) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const valid = Boolean(start && end && end > start);
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-bold">Already know the dates?</h3>
      <div className="flex items-center gap-2">
        <input type="date" className="input py-2 text-xs" value={start} onChange={(e) => setStart(e.target.value)} />
        <span className="text-slate-300">→</span>
        <input type="date" className="input py-2 text-xs" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Button className="mt-3 w-full" disabled={!valid} onClick={() => valid && onCreate({ start, end })}>
        <Plus size={15} /> Create vacation{valid ? ` · ${nightsOf({ start, end })} nights` : ''}
      </Button>
    </div>
  );
}
