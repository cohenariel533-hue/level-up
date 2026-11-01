import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { toISODate, weekEnd, weekStart } from '../../lib/dates';
import { weeklyTargets, weekProgress, type WeekProgress, type WeeklyTargets } from '../../lib/targets';

export interface WeekRings {
  progress: WeekProgress;
  targets: WeeklyTargets;
  examMode: boolean;
  moneyCheckDone: boolean;
}

/** Live numbers for this week's rings (Sunday → Saturday). */
export function useWeekProgress(now: Date = new Date()): WeekRings | undefined {
  const startISO = toISODate(weekStart(now));
  const endISO = toISODate(weekEnd(now));

  return useLiveQuery(async () => {
    const [days, examMode, moneyCheck] = await Promise.all([
      db.days.where('date').between(startISO, endISO, true, true).toArray(),
      getSetting('examMode'),
      db.moneyChecks.get(startISO),
    ]);
    return {
      progress: weekProgress(days),
      targets: weeklyTargets(examMode),
      examMode,
      moneyCheckDone: !!moneyCheck,
    };
  }, [startISO, endISO]);
}
