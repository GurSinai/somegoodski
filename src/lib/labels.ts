import type { Board, SkillLevel, Sport, TransferType, TripStatus } from '../types';

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

export const BOARDS: { value: Board; label: string }[] = [
  { value: 'RO', label: 'Room only' },
  { value: 'SC', label: 'Self-catering' },
  { value: 'BB', label: 'Bed & breakfast' },
  { value: 'HB', label: 'Half board' },
  { value: 'FB', label: 'Full board' },
  { value: 'AI', label: 'All inclusive' },
];

export const STATUSES: { value: TripStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'amber' },
  { value: 'booked', label: 'Booked', color: 'green' },
];
