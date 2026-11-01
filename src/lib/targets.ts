import type { DoneBlock } from '../db/schema';

/** The weekly goals the Today rings measure against. */
export interface WeeklyTargets {
  gym: number;
  /** The "bare minimum" week; still counts as a win. */
  gymMinimum: number;
  hustleHours: number;
  /** 0 = paused (exam mode). */
  youtube: number;
}

/**
 * Normal weeks: gym 4, hustle 7 h, YouTube 2 blocks.
 * Exam mode: hustle drops to 2 h, YouTube pauses, gym stays.
 */
export function weeklyTargets(examMode: boolean): WeeklyTargets {
  return examMode
    ? { gym: 4, gymMinimum: 3, hustleHours: 2, youtube: 0 }
    : { gym: 4, gymMinimum: 3, hustleHours: 7, youtube: 2 };
}

export interface WeekProgress {
  gym: number;
  hustleMinutes: number;
  youtube: number;
}

/**
 * Adds up the blocks ticked off across a week's day logs.
 * (Later stages add sources: logged workouts for gym, the timer for hustle.)
 */
export function weekProgress(days: { done: DoneBlock[] }[]): WeekProgress {
  const progress: WeekProgress = { gym: 0, hustleMinutes: 0, youtube: 0 };
  for (const day of days) {
    for (const block of day.done) {
      if (block.pillar === 'gym') progress.gym += 1;
      else if (block.pillar === 'hustle') progress.hustleMinutes += block.minutes;
      else if (block.pillar === 'youtube') progress.youtube += 1;
    }
  }
  return progress;
}
