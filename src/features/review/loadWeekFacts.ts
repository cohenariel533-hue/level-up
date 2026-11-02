import { addDays, parseISO } from 'date-fns';
import { db } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { toISODate } from '../../lib/dates';
import { gymSessionsByDate } from '../../lib/gym';
import { minutesByDate } from '../../lib/hustle';
import type { WeekFacts } from '../../lib/review';
import { weeklyTargets, weekProgress } from '../../lib/targets';

/**
 * Everything the review needs to know about one week (Sunday `week` through
 * Saturday), using the same rules as the Today rings.
 */
export async function loadWeekFacts(week: string): Promise<WeekFacts> {
  const start = parseISO(week);
  const lastDay = toISODate(addDays(start, 6));
  const nextWeekStart = addDays(start, 7).toISOString();

  const [days, workouts, sessions, moneyCheck, template, classes, examMode, profile] = await Promise.all([
    db.days.where('date').between(week, lastDay, true, true).toArray(),
    db.workouts.where('date').between(week, lastDay, true, true).toArray(),
    db.hustleSessions.where('start').between(start.toISOString(), nextWeekStart, true, false).toArray(),
    db.moneyChecks.get(week),
    db.templateBlocks.toArray(),
    db.classes.toArray(),
    getSetting('examMode'),
    getSetting('profile'),
  ]);

  const progress = weekProgress(days, minutesByDate(sessions), gymSessionsByDate(workouts, days));

  return {
    // Every study block and class in the weekly plan…
    schoolPlanned: template.filter((b) => b.pillar === 'school').length + classes.length,
    // …versus how many were ticked off on Today.
    schoolDone: days.reduce((n, d) => n + d.done.filter((b) => b.pillar === 'school').length, 0),
    gymSessions: progress.gym,
    gymMinimum: weeklyTargets(examMode, profile.gymDays).gymMinimum,
    hustleHours: Math.round((progress.hustleMinutes / 60) * 10) / 10,
    moneyCheckDone: !!moneyCheck,
    examMode,
  };
}
