import { subDays } from 'date-fns';
import { activityDayOf } from '../../db/activity';
import { db, type ActivityDay, type WeeklyShift } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { loadStudyFeed } from '../../db/studyFeed';
import { toISODate, weekStart } from '../../lib/dates';
import type { Profile } from '../../lib/profile';
import { analyzeRhythm, type Rhythm } from '../../lib/rhythm';
import { toMinutes } from '../../lib/time';
import { kindOf as categoryKind } from '../money/categories';

export interface RhythmData {
  rhythm: Rhythm;
  profile: Profile;
  activity: ActivityDay[];
  today: string;
  weekStart: string;
  /** Typical start of your gym blocks on the Week screen (most common time), in minutes. */
  gymBlockStart: number | null;
  /** This week's shift, and the last few weeks' (newest first). */
  shift: WeeklyShift | undefined;
  recentShifts: WeeklyShift[];
}

/** Everything "My rhythm" and the weekly shift need, from every part of the app. */
export async function loadRhythm(now: Date = new Date()): Promise<RhythmData> {
  const today = activityDayOf(now);
  const since = toISODate(subDays(now, 30));
  const week = toISODate(weekStart(now));

  const [activity, workouts, sessions, expenses, moves, study, profile, kinds, gymBlocks, shifts] = await Promise.all([
    db.activity.where('date').aboveOrEqual(since).toArray(),
    db.workouts.where('date').aboveOrEqual(since).toArray(),
    db.hustleSessions.where('start').aboveOrEqual(subDays(now, 30).toISOString()).toArray(),
    db.expenses.where('date').aboveOrEqual(since).toArray(),
    db.moves.where('date').aboveOrEqual(since).toArray(),
    loadStudyFeed(),
    getSetting('profile'),
    getSetting('categoryKinds'),
    db.templateBlocks.filter((b) => b.pillar === 'gym' && b.start !== null).toArray(),
    db.shifts.orderBy('weekStart').reverse().limit(6).toArray(),
  ]);

  const rhythm = analyzeRhythm({
    today,
    activity,
    workouts,
    sessions,
    funExpenses: expenses.filter((e) => categoryKind(e.category, kinds) === 'fun'),
    moves,
    studyMinutesByDay: study?.feed.studyMinutesByDay ?? null,
  });

  // The most common gym block start time on your week.
  const counts = new Map<string, number>();
  for (const b of gymBlocks) counts.set(b.start!, (counts.get(b.start!) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    rhythm,
    profile,
    activity,
    today,
    weekStart: week,
    gymBlockStart: common ? toMinutes(common) : null,
    shift: shifts.find((s) => s.weekStart === week),
    recentShifts: shifts.filter((s) => s.weekStart < week),
  };
}
