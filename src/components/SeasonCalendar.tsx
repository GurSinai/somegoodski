import { eachMonthOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import type { CSSProperties, ReactNode } from 'react';
import { daysBetween, fromISO, toISO } from '../lib/dates';
import { cx } from '../lib/util';
import type { ISODate } from '../types';

export interface DayRender {
  className?: string;
  style?: CSSProperties;
  content?: ReactNode;
}

interface Props {
  start: ISODate;
  end: ISODate;
  renderDay: (iso: ISODate) => DayRender;
  onDayDown?: (iso: ISODate) => void;
  onDayEnter?: (iso: ISODate, e: React.MouseEvent) => void;
  onLeave?: () => void;
}

// Weeks start on Sunday; Friday and Saturday are the weekend.
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const isWeekend = (iso: ISODate) => [5, 6].includes(getDay(fromISO(iso)));

/** Multi-month calendar for the ski season. */
export default function SeasonCalendar({ start, end, renderDay, onDayDown, onDayEnter, onLeave }: Props) {
  if (end < start) return null;
  const months = eachMonthOfInterval({ start: fromISO(start), end: fromISO(end) });

  return (
    <div className="no-select grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3" onMouseLeave={onLeave}>
      {months.map((m) => {
        const days = daysBetween(toISO(startOfMonth(m)), toISO(endOfMonth(m)));
        const offset = getDay(m);
        return (
          <div key={m.toISOString()}>
            <div className="mb-3 text-sm font-bold text-slate-800">{format(m, 'MMMM')} <span className="font-medium text-slate-400">{format(m, 'yyyy')}</span></div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className={cx('pb-1 text-center text-[10px] font-bold', i >= 5 ? 'text-sky-500' : 'text-slate-300')}>
                  {d}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => <div key={`pad${i}`} />)}
              {days.map((iso) => {
                const inSeason = iso >= start && iso <= end;
                const r = inSeason ? renderDay(iso) : {};
                return (
                  <div
                    key={iso}
                    onMouseDown={(e) => {
                      if (!inSeason || e.button !== 0) return;
                      e.preventDefault();
                      onDayDown?.(iso);
                    }}
                    onMouseEnter={(e) => inSeason && onDayEnter?.(iso, e)}
                    className={cx(
                      'relative flex aspect-square items-center justify-center rounded-xl text-xs transition-colors',
                      inSeason ? 'cursor-pointer' : 'text-slate-200',
                      r.className,
                    )}
                    style={r.style}
                  >
                    {r.content ?? Number(iso.slice(8))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
