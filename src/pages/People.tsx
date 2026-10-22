import { ArrowRight, CalendarDays, GraduationCap, Package, Plus, UserPlus, Users, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FriendDrawer from '../components/FriendDrawer';
import { Avatar, Badge, Button, Empty, PageHeader, Stat } from '../components/ui';
import { gearKeys } from '../lib/combinations';
import { SKILLS, skill, sport } from '../lib/labels';
import { money } from '../lib/util';
import { useActiveWinter, useStore, useWinterFriends } from '../store/useStore';
import type { Friend } from '../types';

export default function People() {
  const winter = useActiveWinter()!;
  const friends = useWinterFriends(winter);
  const roster = useStore((s) => s.friends);
  const currency = useStore((s) => s.settings.currency);
  const setInWinter = useStore((s) => s.setInWinter);
  const [editing, setEditing] = useState<Friend | null>(null);
  const [open, setOpen] = useState(false);
  const notJoining = roster.filter((f) => !winter.participants.some((p) => p.friendId === f.id));

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
      rentals: friends.filter((f) => gearKeys(f).length > 0).length,
      ceiling: budgets.length ? Math.min(...budgets) : 0,
      bySkill: SKILLS.map((s) => ({ ...s, count: friends.filter((f) => f.skillLevel === s.value).length })),
    };
  }, [friends]);

  return (
    <div>
      <PageHeader
        eyebrow={`Winter ${winter.year} · Step 1`}
        title="Who’s riding?"
        subtitle="Everyone who might join this winter. Profiles carry over to future winters; budgets and dates are per winter."
        actions={
          <>
            {friends.length > 0 && (
              <Link to={`/w/${winter.id}/dates`}>
                <Button>Next: dates <ArrowRight size={16} /></Button>
              </Link>
            )}
            <Button variant="primary" onClick={() => openDrawer(null)}>
              <Plus size={16} /> Add rider
            </Button>
          </>
        }
      />

      {friends.length === 0 ? (
        <Empty icon={<Users size={26} />} title="Round up the crew">
          Add everyone who might join. Next you’ll paint the days they’re free.
          <div className="mt-5">
            <Button variant="accent" onClick={() => openDrawer(null)}><Plus size={16} /> Add the first rider</Button>
          </div>
        </Empty>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={<Users size={16} />} label="Riders" value={friends.length} sub={`⛷️ ${stats.skis} · 🏂 ${stats.boards}`} />
            <Stat icon={<GraduationCap size={16} />} label="Want lessons" value={stats.lessons} sub={stats.lessonCost ? `${money(stats.lessonCost, currency)} total` : '—'} />
            <Stat icon={<Package size={16} />} label="Need rental" value={stats.rentals} />
            <Stat icon={<Wallet size={16} />} label="Budget ceiling" value={stats.ceiling ? money(stats.ceiling, currency) : '—'} sub="lowest personal budget" />
          </div>

          <div className="card mb-8 p-5">
            <div className="label">Skill mix</div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {stats.bySkill.filter((s) => s.count).map((s) => (
                <div key={s.value} className="first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.count / friends.length) * 100}%`, background: s.dot }} title={`${s.label}: ${s.count}`} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {stats.bySkill.map((s) => (
                <span key={s.value} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                  {s.label} <b className="text-slate-800">{s.count}</b>
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((f) => (
              <button key={f.id} onClick={() => openDrawer(f)} className="card group p-5 text-left transition hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <Avatar name={f.name} color={f.color} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-lg font-bold">{f.name}</div>
                      <span className="text-xl" title={sport(f.sport).label}>{sport(f.sport).emoji}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge color={skill(f.skillLevel).color}>{skill(f.skillLevel).label}</Badge>
                      {f.lessons.wanted && (
                        <Badge color="amber">
                          <GraduationCap size={12} /> {f.lessons.days}d {f.lessons.type}
                          {f.lessons.budgetPerDay ? ` · ${money(f.lessons.budgetPerDay, currency)}/d` : ''}
                        </Badge>
                      )}
                      {gearKeys(f).length > 0 && <Badge><Package size={12} /> Rents {gearKeys(f).length} item{gearKeys(f).length > 1 ? 's' : ''}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Wallet size={14} /> {f.budget ? money(f.budget, currency) : 'No budget'}</span>
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {f.availability.length} days free</span>
                </div>
                {f.notes && <div className="mt-2 line-clamp-2 text-xs text-slate-400">{f.notes}</div>}
              </button>
            ))}
            <button
              onClick={() => openDrawer(null)}
              className="flex min-h-40 items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 transition hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-600"
            >
              <Plus size={18} /> Add rider
            </button>
          </div>
        </>
      )}

      {notJoining.length > 0 && (
        <div className="mt-10">
          <div className="label">From past winters, not joining yet</div>
          <div className="flex flex-wrap gap-2">
            {notJoining.map((f) => (
              <button
                key={f.id}
                onClick={() => setInWinter(winter.id, f.id, true)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
              >
                <Avatar name={f.name} color={f.color} size={26} /> {f.name} <UserPlus size={14} />
              </button>
            ))}
          </div>
        </div>
      )}

      <FriendDrawer friend={editing} winter={winter} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
