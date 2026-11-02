import { describe, expect, it } from 'vitest';
import type { Workout } from '../src/db/schema';
import { buildProgram, headlineTarget, nextProgramDay, planSession, setsFor, targetFor, type ProgramExercise } from '../src/lib/program';

const bench: ProgramExercise = { name: 'Bench press', role: 'main', min: 6, max: 10, step: 2.5 };
const pushUps: ProgramExercise = { name: 'Push-ups', role: 'main', min: 8, max: 20, step: 0 };

const w = (date: string, exercises: Workout['exercises'], programDay?: string): Workout => ({
  date,
  type: 'upper',
  exercises,
  notes: '',
  createdAt: `${date}T18:00:00Z`,
  programDay,
});

describe('the split', () => {
  it('fits your days a week', () => {
    expect(buildProgram(2, 'gym').days.map((d) => d.id)).toEqual(['fullA', 'fullB']);
    expect(buildProgram(3, 'gym').days.map((d) => d.id)).toEqual(['fullA', 'fullB', 'fullC']);
    expect(buildProgram(4, 'gym').days.map((d) => d.id)).toEqual(['upperA', 'lowerA', 'upperB', 'lowerB']);
    expect(buildProgram(5, 'gym').days).toHaveLength(5);
  });

  it('uses exercises for your setup', () => {
    expect(buildProgram(4, 'gym').days[0].exercises[0].name).toBe('Bench press');
    expect(buildProgram(4, 'dumbbells').days[0].exercises[0].name).toBe('Dumbbell bench press');
    expect(buildProgram(4, 'home').days[0].exercises.every((e) => e.step === 0)).toBe(true);
  });

  it('gives more sets as you get more experienced', () => {
    expect([setsFor('beginner', 'main'), setsFor('beginner', 'accessory')]).toEqual([3, 2]);
    expect(setsFor('advanced', 'main')).toBe(4);
  });

  it('rotates through the days, ignoring workouts logged outside the program', () => {
    const program = buildProgram(4, 'gym');
    expect(nextProgramDay(program, []).id).toBe('upperA');
    expect(nextProgramDay(program, [w('2026-11-01', [], 'upperA')]).id).toBe('lowerA');
    expect(nextProgramDay(program, [w('2026-11-01', [], 'upperA'), w('2026-11-02', [])]).id).toBe('lowerA');
    expect(nextProgramDay(program, [w('2026-11-05', [], 'lowerB')]).id).toBe('upperA');
  });
});

describe('progression (double progression)', () => {
  it('starts in the range with no weight picked yet', () => {
    expect(targetFor(bench, 3, [], '2026-11-10', false)).toMatchObject({ reps: 6, weight: null, reason: 'new' });
  });

  it('adds a rep at the same weight until the top of the range', () => {
    const history = [w('2026-11-05', [{ name: 'Bench press', sets: 3, reps: 7, weight: 60 }])];
    expect(targetFor(bench, 3, history, '2026-11-10', false)).toMatchObject({ reps: 8, weight: 60, reason: 'reps' });
  });

  it('adds weight once you hit the top, and starts the range again', () => {
    const history = [w('2026-11-05', [{ name: 'Bench press', sets: 3, reps: 10, weight: 60 }])];
    expect(targetFor(bench, 3, history, '2026-11-10', false)).toMatchObject({ reps: 6, weight: 62.5, reason: 'up' });
  });

  it('adds reps on bodyweight exercises', () => {
    const history = [w('2026-11-05', [{ name: 'Push-ups', sets: 3, reps: 12, weight: 0 }])];
    expect(targetFor(pushUps, 3, history, '2026-11-10', false)).toMatchObject({ reps: 13, weight: 0, reason: 'bodyweight' });
  });

  it('keeps asking for a weight if a weighted lift was logged without one', () => {
    const history = [w('2026-11-05', [{ name: 'Bench press', sets: 3, reps: 8, weight: 0 }])];
    expect(targetFor(bench, 3, history, '2026-11-10', false)).toMatchObject({ weight: null, reason: 'new' });
  });

  it('eases back in at about 90% after a long break', () => {
    const history = [w('2026-10-01', [{ name: 'Bench press', sets: 3, reps: 8, weight: 60 }])];
    expect(targetFor(bench, 3, history, '2026-11-10', true)).toMatchObject({ weight: 55, reps: 6, reason: 'back' });
  });
});

describe('a whole session', () => {
  const history = [
    w('2026-11-01', [{ name: 'Bench press', sets: 3, reps: 10, weight: 60 }, { name: 'Barbell row', sets: 3, reps: 8, weight: 50 }], 'upperB'),
  ];

  it('plans the next day with targets for every exercise', () => {
    const plan = planSession(buildProgram(4, 'gym'), 'beginner', history, '2026-11-03', false);
    expect(plan.day.id).toBe('lowerB');
    expect(plan.targets.length).toBe(plan.day.exercises.length);
  });

  it('drops a set in exam week and spots the lift to beat', () => {
    const program = buildProgram(4, 'gym');
    const plan = planSession(program, 'beginner', [{ ...history[0], programDay: 'lowerB' }], '2026-11-03', true);
    expect(plan.day.id).toBe('upperA');
    expect(plan.examWeek).toBe(true);
    expect(plan.targets[0]).toMatchObject({ name: 'Bench press', sets: 2, weight: 62.5, reason: 'up' });
    expect(headlineTarget(plan)?.name).toBe('Bench press');
  });

  it('notices a comeback after two weeks off', () => {
    const plan = planSession(buildProgram(4, 'gym'), 'beginner', history, '2026-11-20', false);
    expect(plan.comingBack).toBe(true);
  });
});
