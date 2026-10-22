export const COST_COLORS = {
  flight: '#0ea5e9',
  transfer: '#f59e0b',
  hotel: '#8b5cf6',
  liftPass: '#10b981',
  extras: '#f43f5e',
} as const;

export const COST_LABELS = { flight: 'Flights & bags', transfer: 'Transfer', hotel: 'Hotel', liftPass: 'Ski pass', extras: 'Rental, lessons & extras' } as const;

type Parts = Record<keyof typeof COST_COLORS, number>;

/** Horizontal stacked bar. `max` scales the whole bar so rows are comparable. */
export default function CostBar({ parts, max, height = 10 }: { parts: Parts; max: number; height?: number }) {
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-100" style={{ height }}>
      <div className="flex h-full" style={{ width: `${max ? (total / max) * 100 : 0}%` }}>
        {(Object.keys(COST_COLORS) as (keyof Parts)[]).map((k) =>
          parts[k] > 0 ? (
            <div key={k} style={{ width: `${(parts[k] / total) * 100}%`, background: COST_COLORS[k] }} title={`${COST_LABELS[k]}: ${Math.round(parts[k])}`} />
          ) : null,
        )}
      </div>
    </div>
  );
}

export function CostLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
      {(Object.keys(COST_COLORS) as (keyof Parts)[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COST_COLORS[k] }} /> {COST_LABELS[k]}
        </span>
      ))}
    </div>
  );
}
