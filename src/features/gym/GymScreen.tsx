import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, Flame, Trophy } from 'lucide-react';
import { useCallback, useState, type CSSProperties } from 'react';
import { Fab, GlassCard, ListRow, PageHeader, ProgressBar } from '../../components/ui';
import { db, type Workout } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatDayShort, formatShortDate, toISODate, weekStart } from '../../lib/dates';
import { formatEntry, gymSessionsByDate, personalBests, sessionsByWeek, weeklyStreak } from '../../lib/gym';
import { weeklyTargets } from '../../lib/targets';
import s from './gym.module.css';
import { WorkoutSheet } from './WorkoutSheet';

/** Gym: this week vs the goal, the streak, recent workouts and personal bests. */
export default function GymScreen() {
  const [sheet, setSheet] = useState<{ workout?: Workout } | null>(null);
  const close = useCallback(() => setSheet(null), []);

  const data = useLiveQuery(async () => {
    const [workouts, days] = await Promise.all([db.workouts.toArray(), db.days.toArray()]);
    return { workouts, days };
  });

  if (!data) return null;
  const { workouts, days } = data;

  const targets = weeklyTargets(false); // the gym goal is the same in exam mode
  const thisWeek = toISODate(weekStart());
  const byWeek = sessionsByWeek(gymSessionsByDate(workouts, days));
  const count = byWeek[thisWeek] ?? 0;
  const streak = weeklyStreak(byWeek, thisWeek, targets.gymMinimum);
  const recent = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const bests = personalBests(workouts).slice(0, 6);

  return (
    <>
      <PageHeader title={t.gym.title} />

      <div className="stack">
        <GlassCard title={t.gym.weekTitle}>
          <p className={s.weekNumber}>{t.gym.weekCount(count, targets.gym)}</p>
          <ProgressBar value={count} max={targets.gym} color="var(--c-gym)" />
          <p className="muted small" style={{ marginTop: 10 }}>
            {count >= targets.gym
              ? t.gym.goalMet
              : count >= targets.gymMinimum
                ? t.gym.minimumMet
                : t.gym.weekGoalHint(targets.gymMinimum)}
          </p>
          {streak > 0 ? (
            <span className={s.streak}>
              <Flame aria-hidden="true" />
              {t.gym.streak(streak)}
            </span>
          ) : (
            <p className="faint small" style={{ marginTop: 10 }}>
              {t.gym.noStreak}
            </p>
          )}
        </GlassCard>

        <GlassCard title={t.gym.historyTitle}>
          {recent.length === 0 ? (
            <p className="muted small">{t.gym.noWorkouts}</p>
          ) : (
            <div className="list">
              {recent.slice(0, 12).map((w) => (
                <ListRow
                  key={w.id}
                  icon={Dumbbell}
                  color="var(--c-gym)"
                  label={
                    <>
                      {formatDayShort(w.date)} <span className={s.typeChip}>{t.gym.types[w.type]}</span>
                    </>
                  }
                  sub={w.exercises
                    .slice(0, 3)
                    .map((e) => `${e.name} ${formatEntry(e)}`)
                    .join(' · ')}
                  onClick={() => setSheet({ workout: w })}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {bests.length > 0 && (
          <GlassCard title={t.gym.bestsTitle} style={{ '--item-color': 'var(--c-gym)' } as CSSProperties}>
            <div className="list">
              {bests.map((b) => (
                <ListRow
                  key={b.name}
                  icon={Trophy}
                  color="var(--c-gym)"
                  label={b.name}
                  sub={formatShortDate(b.date)}
                  detail={`${b.weight} kg`}
                />
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      <Fab label={t.gym.logWorkout} onClick={() => setSheet({})} />
      <WorkoutSheet open={sheet !== null} onClose={close} workout={sheet?.workout} history={workouts} />
    </>
  );
}
