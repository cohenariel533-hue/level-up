import { Plus, Repeat, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Segmented, Sheet, useToast } from '../../components/ui';
import { addWorkout, deleteWorkout, updateWorkout } from '../../db/gym';
import type { ExerciseEntry, Workout, WorkoutType } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatDayShort, todayISO } from '../../lib/dates';
import { bestWeight, exerciseKey, formatEntry, lastPerformance, SUGGESTED_EXERCISES, volume } from '../../lib/gym';
import type { SessionPlan, Target } from '../../lib/program';
import ms from '../money/money.module.css';
import s from './gym.module.css';

/** While editing, numbers are kept as text so fields can be blank. */
interface Row {
  /** Stable React key, so removing a middle row doesn't shuffle the inputs. */
  key: number;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  minutes: string;
}

let nextKey = 0;
const emptyRow = (): Row => ({ key: nextKey++, name: '', sets: '3', reps: '10', weight: '', minutes: '' });
const toRow = (e: ExerciseEntry): Row => ({
  key: nextKey++,
  name: e.name,
  sets: String(e.sets),
  reps: String(e.reps),
  weight: e.weight ? String(e.weight) : '',
  minutes: e.minutes ? String(e.minutes) : '',
});
/** A row pre-filled with a program target (blank weight = "choose your weight"). */
const targetRow = (target: Target): Row => ({
  key: nextKey++,
  name: target.name,
  sets: String(target.sets),
  reps: String(target.reps),
  weight: target.weight ? String(target.weight) : '',
  minutes: '',
});
const num = (text: string) => {
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const toEntry = (r: Row, cardio: boolean): ExerciseEntry =>
  cardio
    ? { name: r.name, sets: 1, reps: 1, weight: 0, minutes: num(r.minutes) }
    : { name: r.name, sets: num(r.sets), reps: num(r.reps), weight: num(r.weight) };

const TYPES: WorkoutType[] = ['upper', 'lower', 'full', 'cardio'];

interface Props {
  open: boolean;
  onClose: () => void;
  /** The workout to edit; leave out to log a new one. */
  workout?: Workout;
  /** A program session to start from: fills in the exercises and today's targets. */
  plan?: SessionPlan;
  /** All workouts, for "last time" numbers and personal bests. */
  history: Workout[];
}

/** Log a workout. Each exercise shows what you did last time, so you know what to beat. */
export function WorkoutSheet({ open, onClose, workout, plan, history }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<WorkoutType>('upper');
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(workout?.date ?? todayISO());
    setType(workout?.type ?? plan?.day.type ?? 'upper');
    setRows(
      workout?.exercises.length
        ? workout.exercises.map(toRow)
        : plan
          ? plan.targets.map(targetRow)
          : [emptyRow()],
    );
    setNotes(workout?.notes ?? '');
    setConfirmDelete(false);
  }, [open, workout, plan]);

  const cardio = type === 'cardio';
  const lastOfType = useMemo(
    () =>
      [...history]
        .filter((w) => w.type === type && w.id !== workout?.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0],
    [history, type, workout?.id],
  );

  // Your own exercise names first, then suggestions for this type.
  const nameOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const w of history) for (const e of w.exercises) seen.set(exerciseKey(e.name), e.name);
    for (const name of SUGGESTED_EXERCISES[type]) if (!seen.has(exerciseKey(name))) seen.set(exerciseKey(name), name);
    return [...seen.values()];
  }, [history, type]);

  const update = (i: number, changes: Partial<Row>) =>
    setRows((current) => current.map((r, j) => (j === i ? { ...r, ...changes } : r)));

  // Prefill with the last workout of this type: same exercises, same numbers to beat.
  function repeatLast() {
    if (lastOfType) setRows(lastOfType.exercises.map(toRow));
  }

  const hasExercise = rows.some((r) => exerciseKey(r.name));

  async function save() {
    if (!hasExercise) return;
    const input = {
      date,
      type,
      exercises: rows.map((r) => toEntry(r, cardio)),
      notes,
      programDay: workout?.programDay ?? plan?.day.id,
    };
    if (workout?.id) await updateWorkout(workout.id, input);
    else await addWorkout(input);
    toast(t.gym.saved);
    onClose();
  }

  async function remove() {
    if (!workout?.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteWorkout(workout.id);
    toast(t.gym.deleted);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={workout ? t.gym.editWorkout : t.gym.logWorkout}>
      <div className="stack">
        <div className="form-row">
          <Field label={t.gym.date}>
            <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div />
        </div>

        <Segmented<WorkoutType>
          label={t.gym.type}
          value={type}
          onChange={setType}
          options={TYPES.map((value) => ({ value, label: t.gym.types[value] }))}
        />

        {!workout && !plan && lastOfType && (
          <Button variant="secondary" block icon={<Repeat />} onClick={repeatLast}>
            {t.gym.repeatLast(t.gym.types[type])}
          </Button>
        )}

        <datalist id="exercise-names">
          {nameOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {rows.map((row, i) => (
          <ExerciseRow
            key={row.key}
            row={row}
            cardio={cardio}
            history={history}
            date={date}
            workoutId={workout?.id}
            onChange={(changes) => update(i, changes)}
            onRemove={rows.length > 1 ? () => setRows(rows.filter((_, j) => j !== i)) : undefined}
          />
        ))}

        <Button variant="ghost" icon={<Plus />} onClick={() => setRows([...rows, emptyRow()])}>
          {t.gym.addExercise}
        </Button>

        <Field label={t.gym.notes}>
          <input className="input" value={notes} placeholder={t.gym.notesPlaceholder} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button variant="primary" size="lg" block onClick={save} disabled={!hasExercise}>
          {t.gym.save}
        </Button>
        {workout && (
          <Button variant="subtle" block onClick={remove}>
            {confirmDelete ? t.gym.deleteConfirm : t.gym.deleteWorkout}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

function ExerciseRow({
  row,
  cardio,
  history,
  date,
  workoutId,
  onChange,
  onRemove,
}: {
  row: Row;
  cardio: boolean;
  history: Workout[];
  date: string;
  workoutId?: number;
  onChange: (changes: Partial<Row>) => void;
  onRemove?: () => void;
}) {
  const last = exerciseKey(row.name) ? lastPerformance(history, row.name, date, workoutId) : null;
  const best = exerciseKey(row.name) ? bestWeight(history, row.name, workoutId) : 0;
  const current = toEntry(row, cardio);
  const isNewBest = !cardio && best > 0 && current.weight > best;
  const beatsLast = !!last && volume(current) > volume(last.entry);

  return (
    <div className={s.exercise}>
      <div className={s.exerciseTop}>
        <input
          className="input"
          list="exercise-names"
          value={row.name}
          placeholder={t.gym.exercisePlaceholder}
          aria-label={t.gym.exercise}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        {onRemove && (
          <button type="button" className={ms.removeButton} aria-label={t.gym.removeExercise} onClick={onRemove} style={{ alignSelf: 'center' }}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={`${s.numbers} ${cardio ? s.cardio : ''}`}>
        {cardio ? (
          <NumberField label={t.gym.minutes} value={row.minutes} onChange={(minutes) => onChange({ minutes })} />
        ) : (
          <>
            <NumberField label={t.gym.sets} value={row.sets} onChange={(sets) => onChange({ sets })} />
            <NumberField label={t.gym.reps} value={row.reps} onChange={(reps) => onChange({ reps })} />
            <NumberField label={t.gym.kg} value={row.weight} decimal onChange={(weight) => onChange({ weight })} />
          </>
        )}
      </div>

      {exerciseKey(row.name) && (
        <div className={s.last}>
          {last ? t.gym.last(formatEntry(last.entry), formatDayShort(last.date)) : t.gym.firstTime}
          {isNewBest ? (
            <span className={s.better}>
              <Trophy size={13} aria-hidden="true" /> {t.gym.newBest}
            </span>
          ) : (
            beatsLast && <span className={s.better}>{t.gym.beatLast}</span>
          )}
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
}) {
  return (
    <label className={s.number}>
      <span>{label}</span>
      <input
        className="input"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, ''))}
      />
    </label>
  );
}
