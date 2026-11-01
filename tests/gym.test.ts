import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addWorkout } from '../src/db/gym';
import { db, type Workout } from '../src/db/schema';
import {
  bestWeight,
  exerciseKey,
  formatEntry,
  gymSessionsByDate,
  lastPerformance,
  personalBests,
  sessionsByWeek,
  weeklyStreak,
} from '../src/lib/gym';
import { weekProgress } from '../src/lib/targets';

const workout = (over: Partial<Workout>): Workout => ({
  date: '2026-11-01',
  type: 'upper',
  exercises: [],
  notes: '',
  createdAt: `${over.date ?? '2026-11-01'}T10:00:00Z`,
  ...over,
});

const history: Workout[] = [
  workout({ id: 1, date: '2026-10-25', exercises: [{ name: 'Bench press', sets: 3, reps: 8, weight: 55 }] }),
  workout({ id: 2, date: '2026-10-28', exercises: [{ name: 'bench  Press', sets: 3, reps: 8, weight: 60 }] }),
  workout({ id: 3, date: '2026-10-30', type: 'lower', exercises: [{ name: 'Squat', sets: 5, reps: 5, weight: 80 }] }),
];

describe('last time and personal bests', () => {
  it('matches exercise names regardless of case and spacing', () => {
    expect(exerciseKey('  Bench   Press ')).toBe('bench press');
  });

  it('finds the most recent performance before a date', () => {
    expect(lastPerformance(history, 'Bench press', '2026-11-01')).toMatchObject({
      date: '2026-10-28',
      entry: { weight: 60 },
    });
    expect(lastPerformance(history, 'Bench press', '2026-10-26')?.entry.weight).toBe(55);
  });

  it('ignores the workout being edited', () => {
    expect(lastPerformance(history, 'Bench press', '2026-11-01', 2)?.entry.weight).toBe(55);
    expect(bestWeight(history, 'Bench press', 2)).toBe(55);
  });

  it('returns nothing for a new exercise', () => {
    expect(lastPerformance(history, 'Deadlift', '2026-11-01')).toBeNull();
  });

  it('lists personal bests, heaviest first', () => {
    expect(personalBests(history).map((b) => [b.name, b.weight])).toEqual([
      ['Squat', 80],
      ['bench  Press', 60],
    ]);
  });

  it('formats entries', () => {
    expect(formatEntry({ name: 'Bench', sets: 3, reps: 8, weight: 60 })).toBe('3×8 @ 60kg');
    expect(formatEntry({ name: 'Pull-ups', sets: 3, reps: 10, weight: 0 })).toBe('3×10');
    expect(formatEntry({ name: 'Run', sets: 1, reps: 1, weight: 0, minutes: 30 })).toBe('30 min');
  });
});

describe('weekly count and streak', () => {
  it('counts logged workouts, and ticked gym blocks only on days without one', () => {
    const days = [
      { date: '2026-11-01', done: [{ key: 'tpl-1', pillar: 'gym' as const, minutes: 75 }] }, // has a workout too
      { date: '2026-11-03', done: [{ key: 'tpl-2', pillar: 'gym' as const, minutes: 75 }] }, // ticked only
    ];
    const byDate = gymSessionsByDate([{ date: '2026-11-01' }, { date: '2026-11-05' }], days);
    expect(byDate).toEqual({ '2026-11-01': 1, '2026-11-03': 1, '2026-11-05': 1 });
    expect(weekProgress(days, {}, byDate).gym).toBe(3);
  });

  it('groups sessions by Sunday-start week', () => {
    expect(sessionsByWeek({ '2026-11-01': 1, '2026-11-07': 2, '2026-11-08': 1 })).toEqual({
      '2026-11-01': 3,
      '2026-11-08': 1,
    });
  });

  it('counts weeks in a row at the minimum, without breaking on the unfinished week', () => {
    const byWeek = { '2026-10-11': 3, '2026-10-18': 4, '2026-10-25': 3, '2026-11-01': 1 };
    expect(weeklyStreak(byWeek, '2026-11-01', 3)).toBe(3);
    expect(weeklyStreak({ ...byWeek, '2026-11-01': 3 }, '2026-11-01', 3)).toBe(4);
    expect(weeklyStreak({ ...byWeek, '2026-10-18': 2 }, '2026-11-01', 3)).toBe(1);
  });
});

describe('saving workouts', () => {
  beforeEach(async () => {
    await db.workouts.clear();
  });

  it('drops empty exercise rows and tidies names', async () => {
    const id = await addWorkout({
      date: '2026-11-01',
      type: 'upper',
      notes: '  good  ',
      exercises: [
        { name: '  Bench   press ', sets: 3, reps: 8, weight: 60 },
        { name: '   ', sets: 3, reps: 10, weight: 0 },
      ],
    });
    const saved = await db.workouts.get(id);
    expect(saved?.exercises).toEqual([{ name: 'Bench press', sets: 3, reps: 8, weight: 60 }]);
    expect(saved?.notes).toBe('good');
  });
});
