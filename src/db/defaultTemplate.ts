import type { TemplateBlock } from './schema';

/**
 * The starting weekly template (Sunday = 0). Seeded once on first run, and
 * restorable from the Week screen. Everything here is editable in the app.
 *
 * Side hustle adds up to 7 h a week (1.5 + 1.5 + 4), matching the hustle ring.
 */
export const DEFAULT_TEMPLATE: Omit<TemplateBlock, 'id'>[] = [
  // Sunday
  { day: 0, title: 'Classes & study', pillar: 'school', start: '09:00', minutes: 420 },
  { day: 0, title: 'Gym', pillar: 'gym', start: '17:00', minutes: 75 },
  { day: 0, title: 'Side hustle', pillar: 'hustle', start: '18:30', minutes: 90 },
  // Monday
  { day: 1, title: 'Classes & study', pillar: 'school', start: '09:00', minutes: 420 },
  // Tuesday
  { day: 2, title: 'Classes & study', pillar: 'school', start: '09:00', minutes: 420 },
  { day: 2, title: 'Gym', pillar: 'gym', start: '17:00', minutes: 75 },
  { day: 2, title: 'Side hustle', pillar: 'hustle', start: '18:30', minutes: 90 },
  // Wednesday
  { day: 3, title: 'Classes & study', pillar: 'school', start: '09:00', minutes: 420 },
  // Thursday
  { day: 4, title: 'Classes & study', pillar: 'school', start: '09:00', minutes: 420 },
  { day: 4, title: 'Gym', pillar: 'gym', start: '17:00', minutes: 75 },
  { day: 4, title: 'Evening off', pillar: 'rest', start: '19:00', minutes: 180 },
  // Friday
  { day: 5, title: 'Gym', pillar: 'gym', start: '09:00', minutes: 75 },
  { day: 5, title: 'Side hustle: deep work', pillar: 'hustle', start: '10:30', minutes: 240 },
  { day: 5, title: 'Evening off', pillar: 'rest', start: '18:00', minutes: 240 },
  // Saturday
  { day: 6, title: 'Rest', pillar: 'rest', start: null, minutes: 0 },
  { day: 6, title: 'Weekly review', pillar: 'review', start: '20:00', minutes: 30 },
];
