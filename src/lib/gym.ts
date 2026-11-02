/**
 * Gym math: "last time" lookups, personal bests, weekly counts and the
 * streak. Pure functions only, tested in tests/gym.test.ts.
 */
import { parseISO, subWeeks } from 'date-fns';
import type { DoneBlock, ExerciseEntry, Workout } from '../db/schema';
import { toISODate, weekStart } from './dates';

/** "Bench Press " and "bench press" are the same exercise. */
export const exerciseKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Most recent workouts first (by date, then by when they were logged). */
const newestFirst = (a: Workout, b: Workout) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/**
 * What you did for this exercise last time: the latest workout before
 * `beforeDate` that has it, ignoring the workout being edited.
 */
export function lastPerformance(workouts: Workout[], name: string, beforeDate: string, excludeId?: number) {
  const key = exerciseKey(name);
  if (!key) return null;
  for (const w of [...workouts].sort(newestFirst)) {
    if ((excludeId !== undefined && w.id === excludeId) || w.date > beforeDate) continue;
    const entry = w.exercises.find((e) => exerciseKey(e.name) === key);
    if (entry) return { entry, date: w.date };
  }
  return null;
}

/** Heaviest weight ever logged for an exercise (excluding one workout), or 0. */
export function bestWeight(workouts: Workout[], name: string, excludeId?: number): number {
  const key = exerciseKey(name);
  let best = 0;
  for (const w of workouts) {
    if (excludeId !== undefined && w.id === excludeId) continue;
    for (const e of w.exercises) if (exerciseKey(e.name) === key) best = Math.max(best, e.weight);
  }
  return best;
}

/** Total work, for comparing to last time: sets × reps × weight (or minutes for cardio). */
export const volume = (e: ExerciseEntry) => (e.minutes ? e.minutes : e.sets * e.reps * Math.max(e.weight, 1));

/** "3×8 @ 60kg", "3×12" (bodyweight) or "30 min" */
export function formatEntry(e: ExerciseEntry): string {
  if (e.minutes) return `${e.minutes} min`;
  const base = `${e.sets}×${e.reps}`;
  return e.weight > 0 ? `${base} @ ${e.weight}kg` : base;
}

/** Personal bests: heaviest weight per exercise, heaviest first. */
export function personalBests(workouts: Workout[]) {
  const best = new Map<string, { name: string; weight: number; date: string }>();
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (e.weight <= 0) continue;
      const key = exerciseKey(e.name);
      const current = best.get(key);
      if (!current || e.weight > current.weight) best.set(key, { name: e.name.trim(), weight: e.weight, date: w.date });
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

/**
 * Gym sessions per day: logged workouts count; on days with none logged,
 * ticked gym blocks on Today count instead (so nothing counts twice).
 */
export function gymSessionsByDate(workouts: { date: string }[], days: { date: string; done: DoneBlock[] }[]) {
  const byDate: Record<string, number> = {};
  for (const w of workouts) byDate[w.date] = (byDate[w.date] ?? 0) + 1;
  for (const d of days) {
    if (byDate[d.date]) continue;
    const ticked = d.done.filter((b) => b.pillar === 'gym').length;
    if (ticked) byDate[d.date] = ticked;
  }
  return byDate;
}

/** Sessions per week, keyed by the week's Sunday ("YYYY-MM-DD"). */
export function sessionsByWeek(byDate: Record<string, number>): Record<string, number> {
  const byWeek: Record<string, number> = {};
  for (const [date, count] of Object.entries(byDate)) {
    const week = toISODate(weekStart(parseISO(date)));
    byWeek[week] = (byWeek[week] ?? 0) + count;
  }
  return byWeek;
}

/**
 * Weeks in a row hitting the minimum. The current week adds to the streak
 * once it's reached, but an unfinished week never breaks it.
 */
export function weeklyStreak(byWeek: Record<string, number>, currentWeek: string, minimum: number): number {
  let streak = (byWeek[currentWeek] ?? 0) >= minimum ? 1 : 0;
  let week = toISODate(subWeeks(parseISO(currentWeek), 1));
  while ((byWeek[week] ?? 0) >= minimum) {
    streak += 1;
    week = toISODate(subWeeks(parseISO(week), 1));
  }
  return streak;
}

/** Exercise suggestions per workout type, shown until you've built your own list. */
export const SUGGESTED_EXERCISES: Record<Workout['type'], string[]> = {
  upper: ['Bench press', 'Overhead press', 'Pull-ups', 'Barbell row', 'Lat pulldown', 'Bicep curls', 'Tricep dips'],
  lower: ['Squat', 'Romanian deadlift', 'Leg press', 'Lunges', 'Leg curl', 'Calf raises'],
  full: ['Squat', 'Bench press', 'Deadlift', 'Pull-ups', 'Overhead press', 'Plank'],
  cardio: ['Running', 'Cycling', 'Rowing', 'Stair climber', 'Jump rope'],
};
