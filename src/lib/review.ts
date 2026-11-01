/**
 * Weekly review logic: which week to review, and whether the minimums were
 * hit. Pure functions only, tested in tests/review.test.ts.
 */
import { parseISO, subWeeks } from 'date-fns';
import type { ReviewPillar } from '../db/schema';
import { toISODate, weekStart } from './dates';
import { weeklyTargets } from './targets';

/** Order the pillars appear in the review and on Today. */
export const REVIEW_PILLARS: ReviewPillar[] = ['school', 'gym', 'hustle', 'money'];

/** The "bare minimum" week. */
export const MINIMUM_GYM_SESSIONS = 3;
export const MINIMUM_HUSTLE_HOURS = 5;

/** Exam mode lowers the hustle goal to 2 h, so the minimum can't be higher than the goal. */
export const hustleMinimum = (examMode: boolean) => Math.min(MINIMUM_HUSTLE_HOURS, weeklyTargets(examMode).hustleHours);

/** What happened in a week, gathered from Today, Gym, Hustle and Money. */
export interface WeekFacts {
  schoolPlanned: number;
  schoolDone: number;
  gymSessions: number;
  hustleHours: number;
  moneyCheckDone: boolean;
  examMode: boolean;
}

/**
 * Suggested answers to "Did I hit the minimums?". The review pre-ticks
 * these, and you can change any of them (e.g. you studied but forgot to tick).
 */
export function autoMinimums(f: WeekFacts): Record<ReviewPillar, boolean> {
  return {
    school: f.schoolPlanned > 0 ? f.schoolDone >= f.schoolPlanned : true,
    gym: f.gymSessions >= MINIMUM_GYM_SESSIONS,
    hustle: f.hustleHours >= hustleMinimum(f.examMode),
    money: f.moneyCheckDone,
  };
}

export const countHit = (minimums: Record<ReviewPillar, boolean>) => REVIEW_PILLARS.filter((p) => minimums[p]).length;

export const previousWeek = (week: string) => toISODate(subWeeks(parseISO(week), 1));

/**
 * The week to review when you open the screen: normally this week. On a
 * Sunday, if last week was never reviewed, last week (you missed Saturday).
 */
export function defaultReviewWeek(now: Date, reviewedWeeks: Set<string>): string {
  const thisWeek = toISODate(weekStart(now));
  const lastWeek = previousWeek(thisWeek);
  return now.getDay() === 0 && !reviewedWeeks.has(lastWeek) ? lastWeek : thisWeek;
}
