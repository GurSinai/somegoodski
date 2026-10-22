import { ArrowRight, CalendarDays, GraduationCap, Package, Plus, Users, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FriendDrawer from '../components/FriendDrawer';
import { Avatar, Badge, Button, Empty, PageHeader } from '../components/ui';
import { SKILLS, skill, sport } from '../lib/labels';
import { money } from '../lib/util';
import { useStore } from '../store/useStore';
import type { Friend } from '../types';

export default function People() {
  const friends = useStore((s) => s.friends);
  const currency = useStore((s) => s.settings.currency);
  const [editing, setEditing] = useState<Friend | null>(null);
  const [open, setOpen] = useState(false);

  const openDrawer = (f: Friend | null) => {
    setEditing(f);
    setOpen(true);
  };

  const stats = useMemo(() => {
    const budgets = friends.map((f) => f.budget).filter((b) => b > 0);
    return {
      skis: friends.filter((f) => f.sport !== 'snowboard').length,
      boards: friends.filter((f) => f.sport !== 'ski').length,
      lessons: friends.filter((f) => f.lessons.wanted).length,
      lessonCost: friends.reduce((s, f) => s + (f.lessons.wanted ? f.lessons.days * f.lessons.budgetPerDay : 0), 0),
      rentals: friends.filter((f) => f.needsRental).length,
      ceiling: budgets.length ? Math.min(...budgets) : 0,
      bySkill: SKILLS.map((s) => ({ ...s, count: friends.filter((f) => f.skillLevel === s.value).length })),
    };
  }, [friends]);

  return (
    <div>
      <PageHeader
        title="Who's coming?"
        subtitle="Everyone who might join, with their gear, level, lessons and budget."
        actions={
          <>
            {friends.length > 0 && (
              <Link to="/dates">
                <Button>
                  Next: availability <ArrowRight size={16} />
                </Button>
              </Link>
            )}
            <Button variant="primary" onClick={() => openDrawer(null)}>
              <Plus size={16} /> Add friend
            </Button>
          </>
        }
      />

      {friends.length === 0 ? (
        <Empty icon={<Users size={24} />} title="No one on the list yet">
          Add everyone who might join. You can paint their available dates on the next step.
          <div className="mt-4">
            <Button variant="primary" onClick={() => openDrawer(null)}>
              <Plus size={16} /> Add the first friend
            </Button>
          </div>
        </Empty>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Users size={18} />} label="People" value={String(friends.length)} sub={`⛷️ ${stats.skis} · 🏂 ${stats.boards}`} />
            <Stat
              icon={<GraduationCap size={18} />}
              label="Want lessons"
              value={String(stats.lessons)}
              sub={stats.lessonCost ? `${money(stats.lessonCost, currency)} total` : '—'}
            />
            <Stat icon={<Package size={18} />} label="Need rental" value={String(stats.rentals)} />
            <Stat
              icon={<Wallet size={18} />}
              label="Budget ceiling"
              value={stats.ceiling ? money(stats.ceiling, currency) : '—'}
              sub="lowest personal budget"
            />
          </div>

          <div className="card mb-6 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Skill mix</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {stats.bySkill.filter((s) => s.count).map((s) => (
                <div key={s.value} style={{ width: `${(s.count / friends.length) * 100}%`, background: s.dot }} title={`${s.label}: ${s.count}`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              {stats.bySkill.map((s) => (
                <span key={s.value} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                  {s.label} <b>{s.count}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((f) => (
              <button key={f.id} onClick={() => openDrawer(f)} className="card group p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar name={f.name} color={f.color} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-semibold">{f.name}</div>
                      <span className="text-lg" title={sport(f.sport).label}>{sport(f.sport).emoji}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge color={skill(f.skillLevel).color}>{skill(f.skillLevel).label}</Badge>
                      {f.lessons.wanted && (
                        <Badge color="amber">
                          <GraduationCap size={12} /> {f.lessons.days}d {f.lessons.type}
                          {f.lessons.budgetPerDay ? ` · ${money(f.lessons.budgetPerDay, currency)}/d` : ''}
                        </Badge>
                      )}
                      {f.needsRental && <Badge><Package size={12} /> Rental</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Wallet size={14} /> {f.budget ? money(f.budget, currency) : 'No budget set'}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <CalendarDays size={14} /> {f.availability.length} days free
                  </span>
                </div>
                {f.notes && <div className="mt-2 line-clamp-2 text-xs text-slate-400">{f.notes}</div>}
              </button>
            ))}
            <button
              onClick={() => openDrawer(null)}
              className="flex min-h-36 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-sky-400 hover:text-sky-600"
            >
              <Plus size={18} /> Add friend
            </button>
          </div>
        </>
      )}

      <FriendDrawer friend={editing} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span className="text-sky-600">{icon}</span> {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
