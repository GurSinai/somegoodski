import type { HotelOption, StayType, GearPiece, GearPriceKey, GearTier, SkillLevel, Sport, TransferType, VacationStatus } from '../types';

export const SKILLS: { value: SkillLevel; label: string; color: string; dot: string }[] = [
  { value: 'never', label: 'First timer', color: 'slate', dot: '#94a3b8' },
  { value: 'beginner', label: 'Beginner', color: 'green', dot: '#10b981' },
  { value: 'intermediate', label: 'Intermediate', color: 'sky', dot: '#0ea5e9' },
  { value: 'advanced', label: 'Advanced', color: 'rose', dot: '#ef4444' },
  { value: 'expert', label: 'Expert', color: 'violet', dot: '#1e293b' },
];
export const skill = (v: SkillLevel) => SKILLS.find((s) => s.value === v)!;

export const SPORTS: { value: Sport; label: string; emoji: string }[] = [
  { value: 'ski', label: 'Ski', emoji: '⛷️' },
  { value: 'snowboard', label: 'Snowboard', emoji: '🏂' },
  { value: 'both', label: 'Both', emoji: '⛷️🏂' },
];
export const sport = (v: Sport) => SPORTS.find((s) => s.value === v)!;

export const TRANSFER_TYPES: { value: TransferType; label: string }[] = [
  { value: 'shuttle', label: 'Shared shuttle' },
  { value: 'private', label: 'Private transfer' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Train' },
  { value: 'rental-car', label: 'Rental car' },
  { value: 'other', label: 'Other' },
];
export const transferLabel = (type: string) => TRANSFER_TYPES.find((t) => t.value === type)?.label ?? type;

export const STAY_TYPES: { value: StayType; label: string }[] = [
  { value: 'dorm', label: 'Dorms' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hotel', label: 'Hotel' },
];
export const stayLabel = (t: StayType) => STAY_TYPES.find((x) => x.value === t)?.label ?? t;

type LiftFields = Pick<HotelOption, 'skiInOut' | 'walkable' | 'liftMin'>;
/** "Ski-in / ski-out", "5 min walk to the lift", "15 min drive to the lift"… */
export function liftLabel(h: LiftFields): string {
  if (h.skiInOut) return 'Ski-in / ski-out';
  if (h.liftMin) return `${h.liftMin} min ${h.walkable ? 'walk' : 'drive'} to the lift`;
  return h.walkable ? 'Walking distance to the lift' : '';
}
/** Sort key: ski-in/out first, then walks, then drives. */
export const liftRank = (h: LiftFields) => (h.skiInOut ? 0 : h.walkable ? h.liftMin || 30 : 100 + (h.liftMin || 60));

export const STATUSES: { value: VacationStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'sky' },
  { value: 'decided', label: 'Decided', color: 'amber' },
  { value: 'booked', label: 'Booked', color: 'green' },
];
export const statusOf = (v: VacationStatus) => STATUSES.find((s) => s.value === v)!;

export const GEAR_TIERS: { value: GearTier; label: string; hint: string }[] = [
  { value: 'basic', label: 'Basic', hint: 'first timers, beginners' },
  { value: 'intermediate', label: 'Intermediate', hint: 'confident on blues and reds' },
  { value: 'advanced', label: 'Advanced', hint: 'blacks, performance models' },
  { value: 'offpiste', label: 'Off-piste', hint: 'freeride, powder' },
];

export const GEAR_PIECES: { value: GearPiece; label: string; emoji: string }[] = [
  { value: 'boots', label: 'Ski / Snowboard boots', emoji: '🥾' },
  { value: 'helmet', label: 'Helmet', emoji: '⛑️' },
  { value: 'goggles', label: 'Goggles', emoji: '🥽' },
  { value: 'gloves', label: 'Gloves', emoji: '🧤' },
  { value: 'jacket', label: 'Jacket', emoji: '🧥' },
  { value: 'pants', label: 'Pants', emoji: '👖' },
];

/** Every price a shop can list, in display order. */
export const GEAR_PRICE_ROWS: { key: GearPriceKey; label: string }[] = [
  ...GEAR_TIERS.map((t) => ({ key: `equipment:${t.value}` as GearPriceKey, label: `Ski / Snowboard · ${t.label}` })),
  ...GEAR_PIECES.map((p) => ({ key: p.value as GearPriceKey, label: p.label })),
];
export const gearLabel = (key: GearPriceKey | 'lessons') => (key === 'lessons' ? 'lessons' : GEAR_PRICE_ROWS.find((r) => r.key === key)?.label ?? key);
