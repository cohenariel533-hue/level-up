import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { useNow } from '../../hooks/useNow';
import { toISODate, weekEnd, weekStart } from '../../lib/dates';
import { gymSessionsByDate } from '../../lib/gym';
import { minutesByDate } from '../../lib/hustle';
import { weeklyTargets, weekProgress, type WeekProgress, type WeeklyTargets } from '../../lib/targets';

export interface WeekRings {
  progress: WeekProgress;
  targets: WeeklyTargets;
  examMode: boolean;
  moneyCheckDone: boolean;
  /** ISO start time of the running hustle timer, if any. */
  timerRunningSince: string | null;
}

/** Live numbers for this week's rings (Sunday → Saturday). */
export function useWeekProgress(): WeekRings | undefined {
  // Re-read every minute so a running hustle timer moves the ring.
  const now = useNow(60_000);
  const start = weekStart(now);
  const startISO = toISODate(start);
  const endISO = toISODate(weekEnd(now));
  const minute = Math.floor(now.getTime() / 60_000);

  return useLiveQuery(async () => {
    const [days, examMode, moneyCheck, sessions, workouts, profile] = await Promise.all([
      db.days.where('date').between(startISO, endISO, true, true).toArray(),
      getSetting('examMode'),
      db.moneyChecks.get(startISO),
      db.hustleSessions.where('start').aboveOrEqual(start.toISOString()).toArray(),
      db.workouts.where('date').between(startISO, endISO, true, true).toArray(),
      getSetting('profile'),
    ]);
    return {
      progress: weekProgress(days, minutesByDate(sessions), gymSessionsByDate(workouts, days)),
      targets: weeklyTargets(examMode, profile.gymDays),
      examMode,
      moneyCheckDone: !!moneyCheck,
      timerRunningSince: sessions.find((s) => s.end === null)?.start ?? null,
    };
  }, [startISO, endISO, minute]);
}
