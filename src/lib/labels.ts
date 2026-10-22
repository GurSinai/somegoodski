import type { Board, BoardTier, GearPiece, GearPriceKey, SkillLevel, SkiTier, Sport, TransferType, VacationStatus } from '../types';

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

export const BOARDS: { value: Board; label: string }[] = [
  { value: 'RO', label: 'Room only' },
  { value: 'SC', label: 'Self-catering' },
  { value: 'BB', label: 'Bed & breakfast' },
  { value: 'HB', label: 'Half board' },
  { value: 'FB', label: 'Full board' },
  { value: 'AI', label: 'All inclusive' },
];
export const boardLabel = (b: Board) => BOARDS.find((x) => x.value === b)?.label ?? b;

export const STATUSES: { value: VacationStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'sky' },
  { value: 'decided', label: 'Decided', color: 'amber' },
  { value: 'booked', label: 'Booked', color: 'green' },
];
export const statusOf = (v: VacationStatus) => STATUSES.find((s) => s.value === v)!;

export const SKI_TIERS: { value: SkiTier; label: string; hint: string }[] = [
  { value: 'basic', label: 'Basic', hint: 'first timers, beginners' },
  { value: 'sport', label: 'Sport', hint: 'intermediate' },
  { value: 'performance', label: 'Performance', hint: 'advanced' },
  { value: 'premium', label: 'Premium', hint: 'expert, top models' },
];

export const BOARD_TIERS: { value: BoardTier; label: string; hint: string }[] = [
  { value: 'basic', label: 'Basic', hint: 'beginners' },
  { value: 'sport', label: 'Sport', hint: 'intermediate, all-mountain' },
  { value: 'performance', label: 'Performance', hint: 'advanced, freeride / park' },
];

export const GEAR_PIECES: { value: GearPiece; label: string; emoji: string }[] = [
  { value: 'skiBoots', label: 'Ski boots', emoji: '🥾' },
  { value: 'boardBoots', label: 'Snowboard boots', emoji: '🥾' },
  { value: 'helmet', label: 'Helmet', emoji: '⛑️' },
  { value: 'goggles', label: 'Goggles', emoji: '🥽' },
  { value: 'gloves', label: 'Gloves', emoji: '🧤' },
  { value: 'jacket', label: 'Jacket', emoji: '🧥' },
  { value: 'pants', label: 'Pants', emoji: '👖' },
];

/** Every price a shop can list, in display order. */
export const GEAR_PRICE_ROWS: { key: GearPriceKey; label: string; group: string }[] = [
  ...SKI_TIERS.map((t) => ({ key: `skis:${t.value}` as GearPriceKey, label: `Skis · ${t.label}`, group: 'Skis' })),
  ...BOARD_TIERS.map((t) => ({ key: `snowboard:${t.value}` as GearPriceKey, label: `Snowboard · ${t.label}`, group: 'Snowboard' })),
  ...GEAR_PIECES.map((p) => ({ key: p.value as GearPriceKey, label: p.label, group: 'Gear' })),
];
export const gearLabel = (key: GearPriceKey) => GEAR_PRICE_ROWS.find((r) => r.key === key)?.label ?? key;
