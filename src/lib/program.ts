/**
 * Your gym program (build muscle): a split that fits your days and setup,
 * and today's targets for every exercise. Pure functions only, tested in
 * tests/program.test.ts.
 *
 * Progression is "double progression", the classic way to grow:
 *   - each exercise has a rep range (e.g. 6–10);
 *   - same weight until you reach the top of the range, then add weight
 *     (+2.5 kg on barbells/machines, +2 kg on dumbbells) and start again
 *     at the bottom of the range;
 *   - bodyweight exercises add reps instead.
 * Exam weeks drop one set per exercise (keep the habit, lighter load), and
 * after 2+ weeks off you restart at about 90% of your last weight.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Workout, WorkoutType } from '../db/schema';
import { lastPerformance } from './gym';
import type { GymLevel, GymSetup } from './profile';

/** One exercise in a program day. */
export interface ProgramExercise {
  name: string;
  /** "main" lifts get more sets and lower reps; "accessory" ones the opposite. */
  role: 'main' | 'accessory';
  min: number;
  max: number;
  /** How much to add when you hit the top of the range; 0 = bodyweight (add reps). */
  step: number;
}

export interface ProgramDay {
  /** Stable id, saved with the workout so the rotation knows where you are. */
  id: string;
  type: WorkoutType;
  exercises: ProgramExercise[];
}

export interface Program {
  days: ProgramDay[];
  /** e.g. "4 days · Upper / Lower" */
  splitKey: 'full2' | 'full3' | 'upperLower4' | 'upperLower5';
}

const main = (name: string, step: number, min = 6, max = 10): ProgramExercise => ({ name, role: 'main', min, max, step });
const acc = (name: string, step: number, min = 10, max = 15): ProgramExercise => ({ name, role: 'accessory', min, max, step });

/** Exercises per training setup, by day template. */
const LIBRARY: Record<GymSetup, Record<'upperA' | 'upperB' | 'lowerA' | 'lowerB' | 'fullA' | 'fullB' | 'fullC', ProgramExercise[]>> = {
  gym: {
    upperA: [main('Bench press', 2.5), main('Barbell row', 2.5), acc('Overhead press', 2.5, 8, 12), acc('Lat pulldown', 2.5, 8, 12), acc('Bicep curls', 1), acc('Tricep pushdown', 2.5)],
    upperB: [main('Incline dumbbell press', 2), main('Pull-ups', 0, 5, 12), acc('Seated cable row', 2.5, 8, 12), acc('Lateral raises', 1, 12, 20), acc('Hammer curls', 1), acc('Overhead tricep extension', 2.5)],
    lowerA: [main('Squat', 2.5), main('Romanian deadlift', 2.5, 8, 12), acc('Leg press', 5), acc('Leg curl', 2.5), acc('Calf raises', 2.5)],
    lowerB: [main('Deadlift', 2.5, 5, 8), acc('Bulgarian split squat', 2, 8, 12), acc('Leg extension', 2.5), acc('Hip thrust', 2.5, 8, 12), acc('Hanging leg raises', 0)],
    fullA: [main('Squat', 2.5), main('Bench press', 2.5), main('Barbell row', 2.5), acc('Lateral raises', 1, 12, 20), acc('Bicep curls', 1)],
    fullB: [main('Deadlift', 2.5, 5, 8), main('Overhead press', 2.5), main('Lat pulldown', 2.5, 8, 12), acc('Leg press', 5), acc('Tricep pushdown', 2.5)],
    fullC: [main('Romanian deadlift', 2.5, 8, 12), main('Incline dumbbell press', 2), main('Pull-ups', 0, 5, 12), acc('Leg curl', 2.5), acc('Hammer curls', 1)],
  },
  dumbbells: {
    upperA: [main('Dumbbell bench press', 2), main('One-arm dumbbell row', 2), acc('Dumbbell shoulder press', 2, 8, 12), acc('Dumbbell curls', 1), acc('Dumbbell overhead extension', 2)],
    upperB: [main('Incline dumbbell press', 2), main('Dumbbell pullover', 2, 8, 12), acc('Lateral raises', 1, 12, 20), acc('Hammer curls', 1), acc('Push-ups', 0, 10, 25)],
    lowerA: [main('Goblet squat', 2, 8, 12), main('Dumbbell Romanian deadlift', 2, 8, 12), acc('Dumbbell lunges', 2), acc('Dumbbell calf raises', 2)],
    lowerB: [main('Bulgarian split squat', 2, 8, 12), acc('Dumbbell hip thrust', 2), acc('Dumbbell step-ups', 2), acc('Dead bugs', 0, 10, 20)],
    fullA: [main('Goblet squat', 2, 8, 12), main('Dumbbell bench press', 2), main('One-arm dumbbell row', 2), acc('Lateral raises', 1, 12, 20)],
    fullB: [main('Dumbbell Romanian deadlift', 2, 8, 12), main('Dumbbell shoulder press', 2, 8, 12), acc('Dumbbell lunges', 2), acc('Dumbbell curls', 1)],
    fullC: [main('Bulgarian split squat', 2, 8, 12), main('Incline dumbbell press', 2), acc('Dumbbell pullover', 2), acc('Dumbbell overhead extension', 2)],
  },
  home: {
    upperA: [main('Push-ups', 0, 8, 20), main('Backpack rows', 0, 8, 15), acc('Pike push-ups', 0, 6, 12), acc('Diamond push-ups', 0, 6, 15)],
    upperB: [main('Decline push-ups', 0, 8, 20), main('Chin-ups', 0, 3, 10), acc('Backpack curls', 0, 10, 20), acc('Chair dips', 0, 8, 15)],
    lowerA: [main('Bulgarian split squat', 0, 8, 15), main('Single-leg glute bridge', 0, 10, 20), acc('Squat jumps', 0, 10, 20), acc('Calf raises', 0, 15, 25)],
    lowerB: [main('Squats', 0, 15, 30), main('Reverse lunges', 0, 10, 20), acc('Glute bridge', 0, 15, 25), acc('Dead bugs', 0, 10, 20)],
    fullA: [main('Push-ups', 0, 8, 20), main('Squats', 0, 15, 30), main('Backpack rows', 0, 8, 15), acc('Dead bugs', 0, 10, 20)],
    fullB: [main('Pike push-ups', 0, 6, 12), main('Reverse lunges', 0, 10, 20), main('Chin-ups', 0, 3, 10), acc('Glute bridge', 0, 15, 25)],
    fullC: [main('Decline push-ups', 0, 8, 20), main('Bulgarian split squat', 0, 8, 15), acc('Chair dips', 0, 8, 15), acc('Calf raises', 0, 15, 25)],
  },
};

/** Builds the program for your days per week and setup. */
export function buildProgram(days: number, setup: GymSetup): Program {
  const lib = LIBRARY[setup];
  const day = (id: keyof typeof lib, type: WorkoutType): ProgramDay => ({ id, type, exercises: lib[id] });
  if (days <= 2) return { splitKey: 'full2', days: [day('fullA', 'full'), day('fullB', 'full')] };
  if (days === 3) return { splitKey: 'full3', days: [day('fullA', 'full'), day('fullB', 'full'), day('fullC', 'full')] };
  const upperLower = [day('upperA', 'upper'), day('lowerA', 'lower'), day('upperB', 'upper'), day('lowerB', 'lower')];
  if (days === 4) return { splitKey: 'upperLower4', days: upperLower };
  return { splitKey: 'upperLower5', days: [...upperLower, day('fullA', 'full')] };
}

/** Sets per exercise by level and role. */
export function setsFor(level: GymLevel, role: ProgramExercise['role']): number {
  if (level === 'advanced') return role === 'main' ? 4 : 3;
  if (level === 'intermediate') return 3;
  return role === 'main' ? 3 : 2;
}

/**
 * The next program day: the one after the last day you trained from the
 * program, in rotation. Workouts logged outside the program don't move it.
 */
export function nextProgramDay(program: Program, workouts: Workout[]): ProgramDay {
  const fromProgram = workouts
    .filter((w) => w.programDay && program.days.some((d) => d.id === w.programDay))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!fromProgram) return program.days[0];
  const index = program.days.findIndex((d) => d.id === fromProgram.programDay);
  return program.days[(index + 1) % program.days.length];
}

export interface Target {
  name: string;
  sets: number;
  reps: number;
  /** kg; null = no history yet (pick a weight with ~2 reps left in the tank); 0 = bodyweight. */
  weight: number | null;
  /** Why this target: shown under the exercise. */
  reason: 'new' | 'up' | 'reps' | 'back' | 'bodyweight';
  last?: { sets: number; reps: number; weight: number; date: string };
}

export interface SessionPlan {
  day: ProgramDay;
  targets: Target[];
  /** Lighter: one set fewer per exercise. */
  examWeek: boolean;
  /** 14+ days since the last workout: start a little lighter. */
  comingBack: boolean;
}

const round = (kg: number, step: number) => (step >= 2.5 ? Math.round(kg / 2.5) * 2.5 : Math.round(kg));

/** Today's targets for one exercise, from what you did last time. */
export function targetFor(
  ex: ProgramExercise,
  sets: number,
  workouts: Workout[],
  date: string,
  comingBack: boolean,
): Target {
  const last = lastPerformance(workouts, ex.name, date);
  if (!last) {
    return { name: ex.name, sets, reps: ex.min, weight: ex.step === 0 ? 0 : null, reason: ex.step === 0 ? 'bodyweight' : 'new' };
  }
  const prev = { sets: last.entry.sets, reps: last.entry.reps, weight: last.entry.weight, date: last.date };

  if (ex.step === 0) {
    // Bodyweight: one more rep each time, a little past the range is fine.
    return { name: ex.name, sets, reps: Math.min(Math.max(last.entry.reps + 1, ex.min), ex.max + 5), weight: 0, reason: 'bodyweight', last: prev };
  }
  if (last.entry.weight === 0) {
    // A weighted exercise logged without a weight: still waiting for you to pick one.
    return { name: ex.name, sets, reps: ex.min, weight: null, reason: 'new', last: prev };
  }
  if (comingBack) {
    return { name: ex.name, sets, reps: ex.min, weight: round(last.entry.weight * 0.9, ex.step), reason: 'back', last: prev };
  }
  if (last.entry.reps >= ex.max) {
    return { name: ex.name, sets, reps: ex.min, weight: last.entry.weight + ex.step, reason: 'up', last: prev };
  }
  return { name: ex.name, sets, reps: Math.max(last.entry.reps + 1, ex.min), weight: last.entry.weight, reason: 'reps', last: prev };
}

/** The whole session: which day is next, and a target for every exercise. */
export function planSession(
  program: Program,
  level: GymLevel,
  workouts: Workout[],
  date: string,
  examMode: boolean,
): SessionPlan {
  const day = nextProgramDay(program, workouts);
  const lastDate = workouts.map((w) => w.date).filter((d) => d <= date).sort().at(-1);
  const comingBack = !!lastDate && differenceInCalendarDays(parseISO(date), parseISO(lastDate)) >= 14;
  const targets = day.exercises.map((ex) => {
    const sets = Math.max(setsFor(level, ex.role) - (examMode ? 1 : 0), 2);
    return targetFor(ex, sets, workouts, date, comingBack);
  });
  return { day, targets, examWeek: examMode, comingBack };
}

/** Short summary for the coach, e.g. "Bench press, Barbell row, Overhead press…" */
export const sessionSummary = (plan: SessionPlan, count = 3) =>
  plan.targets.slice(0, count).map((x) => x.name).join(', ') + (plan.targets.length > count ? '…' : '');

/** The heaviest "up" target, to name in the coach move ("Beat: Bench press 65kg"). */
export function headlineTarget(plan: SessionPlan): Target | undefined {
  return plan.targets.find((x) => x.reason === 'up') ?? plan.targets.find((x) => x.reason === 'reps' && x.weight);
}
