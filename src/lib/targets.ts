import type { DoneBlock } from '../db/schema';

/** The weekly goals the Today rings measure against. */
export interface WeeklyTargets {
  gym: number;
  /** The "bare minimum" week; still counts as a win. */
  gymMinimum: number;
  hustleHours: number;
}

/**
 * Normal weeks: gym 4, hustle 7 h.
 * Exam mode: hustle drops to 2 h, gym stays.
 */
export function weeklyTargets(examMode: boolean): WeeklyTargets {
  return examMode
    ? { gym: 4, gymMinimum: 3, hustleHours: 2 }
    : { gym: 4, gymMinimum: 3, hustleHours: 7 };
}

export interface WeekProgress {
  gym: number;
  hustleMinutes: number;
}

/**
 * Adds up a week's progress.
 *
 * Hustle hours, per day: if the timer was used that day, its minutes count;
 * otherwise the ticked hustle blocks do. So ticking a block *and* timing it
 * never counts twice, and ticking still works on days you skip the timer.
 *
 * Gym works the same way: logged workouts count; on days with none logged,
 * ticked gym blocks do (pass `gymSessionsByDate` from lib/gym).
 */
export function weekProgress(
  days: { date: string; done: DoneBlock[] }[],
  timerMinutesByDate: Record<string, number> = {},
  gymSessionsByDate?: Record<string, number>,
): WeekProgress {
  const progress: WeekProgress = { gym: 0, hustleMinutes: 0 };
  const tickedHustle: Record<string, number> = {};

  for (const day of days) {
    for (const block of day.done) {
      if (block.pillar === 'gym') {
        if (!gymSessionsByDate) progress.gym += 1;
      } else if (block.pillar === 'hustle') tickedHustle[day.date] = (tickedHustle[day.date] ?? 0) + block.minutes;
    }
  }

  const dates = new Set([...Object.keys(tickedHustle), ...Object.keys(timerMinutesByDate)]);
  for (const date of dates) {
    const timer = timerMinutesByDate[date] ?? 0;
    progress.hustleMinutes += timer > 0 ? timer : (tickedHustle[date] ?? 0);
  }

  if (gymSessionsByDate) {
    progress.gym = Object.values(gymSessionsByDate).reduce((a, b) => a + b, 0);
  }
  return progress;
}
