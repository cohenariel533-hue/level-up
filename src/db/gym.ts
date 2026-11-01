/** Everything that writes workouts. */
import { exerciseKey } from '../lib/gym';
import { db, type ExerciseEntry, type Workout } from './schema';

export type WorkoutInput = Omit<Workout, 'id' | 'createdAt'>;

/** Drops empty rows and tidies names before saving. */
function clean(input: WorkoutInput): WorkoutInput {
  const exercises: ExerciseEntry[] = input.exercises
    .filter((e) => exerciseKey(e.name))
    .map((e) => ({ ...e, name: e.name.trim().replace(/\s+/g, ' ') }));
  return { ...input, exercises, notes: input.notes.trim() };
}

export const addWorkout = (input: WorkoutInput) =>
  db.workouts.add({ ...clean(input), createdAt: new Date().toISOString() });

export const updateWorkout = (id: number, input: WorkoutInput) => db.workouts.update(id, clean(input));

export const deleteWorkout = (id: number) => db.workouts.delete(id);
