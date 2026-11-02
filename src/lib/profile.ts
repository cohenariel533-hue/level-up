/**
 * "About me": what Level Up knows about you, filled in once on the About me
 * screen and editable any time. The coach (lib/coach.ts) reads it to pick
 * and word your daily moves; later stages use it for the gym program and
 * for shifting your day.
 */

export type EnergyPeak = 'morning' | 'afternoon' | 'evening';
export type GymLevel = 'beginner' | 'intermediate' | 'advanced';
export type GymSetup = 'gym' | 'home' | 'dumbbells';
export type HustleStage = 'notStarted' | 'demo' | 'customers';

export interface Profile {
  /** What the app calls you. */
  name: string;
  /** In your own words: what leveling up means to you this semester. */
  why: string;
  /** Your usual times now ("HH:mm"). */
  wake: string;
  bed: string;
  /** Where you'd like them to be. The coach nudges toward these slowly (stage E). */
  wakeGoal: string;
  bedGoal: string;
  energyPeak: EnergyPeak;
  gymLevel: GymLevel;
  gymSetup: GymSetup;
  /** Sessions a week you can realistically do. */
  gymDays: number;
  hustleStage: HustleStage;
  /** Expense categories you most want to keep an eye on. */
  moneyWatch: string[];
  /** Set when the setup was finished. */
  completedAt: string | null;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  why: '',
  wake: '08:00',
  bed: '00:30',
  wakeGoal: '07:30',
  bedGoal: '23:30',
  energyPeak: 'morning',
  gymLevel: 'beginner',
  gymSetup: 'gym',
  gymDays: 4,
  hustleStage: 'notStarted',
  moneyWatch: ['eatingOut', 'goingOut'],
  completedAt: null,
};
