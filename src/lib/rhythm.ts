/**
 * Your real day, and one small shift a week toward the day you want.
 * Pure functions only, tested in tests/rhythm.test.ts.
 *
 * What it reads (last 3–4 weeks, never today, which isn't finished):
 *   - first and last use of Level Up each day (a rough stand-in for waking
 *     up and going to bed),
 *   - when workouts were logged, when hustle timer sessions started,
 *     when fun money was spent, how many daily moves got done,
 *   - study minutes per day from Study Planner, if connected.
 * Nothing is guessed from too little data: each number and pattern needs a
 * minimum number of days or events before it shows up.
 */
import { differenceInCalendarDays, getDay, parseISO, startOfDay, subDays } from 'date-fns';
import type { ActivityDay, DayMoves, ShiftKind, WeeklyShift } from '../db/schema';
import { toISODate } from './dates';
import type { EnergyPeak, Profile } from './profile';
import { fromMinutes, toMinutes } from './time';

export const WINDOW_DAYS = 21;
/** Days of activity needed before wake/bed times are shown or shifted. */
export const MIN_DAYS = 5;

export interface RhythmInput {
  /** Today's activity day ("YYYY-MM-DD"); it and later days are left out. */
  today: string;
  activity: ActivityDay[];
  workouts: { date: string; createdAt: string }[];
  sessions: { start: string }[];
  /** Fun expenses only. */
  funExpenses: { amount: number; createdAt: string }[];
  moves: DayMoves[];
  studyMinutesByDay: Record<string, number> | null;
}

export type Insight =
  | { kind: 'gymStudy'; diff: number }
  | { kind: 'lateSpending'; share: number }
  | { kind: 'bestHustleDay'; weekday: number; sessions: number }
  | { kind: 'weakDay'; weekday: number; rate: number }
  | { kind: 'wakeSwing'; spread: number };

export interface Rhythm {
  sampleDays: number;
  /** Typical times as minutes after midnight (bed can go past 1440 = after midnight). */
  wake: number | null;
  bed: number | null;
  /** When you typically start a workout (logged time minus an hour). */
  gymStart: number | null;
  hustleStart: number | null;
  insights: Insight[];
}

// ---------- helpers ----------

/** Minutes from `date`'s midnight to `iso` (local time). */
export const minutesFrom = (date: string, iso: string) =>
  Math.round((new Date(iso).getTime() - startOfDay(parseISO(date)).getTime()) / 60_000);

const minutesOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
};

const inWindow = (date: string, today: string, days = WINDOW_DAYS) => {
  const ago = differenceInCalendarDays(parseISO(today), parseISO(date));
  return ago >= 1 && ago <= days;
};

const round5 = (m: number) => Math.round(m / 5) * 5;
const round15 = (m: number) => Math.round(m / 15) * 15;

// ---------- reading your day ----------

export function analyzeRhythm(input: RhythmInput): Rhythm {
  const days = input.activity.filter((d) => inWindow(d.date, input.today));
  const wakes = days.map((d) => minutesFrom(d.date, d.firstAt));
  const beds = days.map((d) => minutesFrom(d.date, d.lastAt));
  const enough = days.length >= MIN_DAYS;

  const workouts = input.workouts.filter((w) => inWindow(w.date, input.today, 28));
  const gymLogged = workouts.length >= 3 ? median(workouts.map((w) => minutesOfDay(w.createdAt))) : null;

  const sessions = input.sessions.filter((s) => inWindow(s.start.slice(0, 10), input.today, 28));
  const hustleStart = sessions.length >= 3 ? median(sessions.map((s) => minutesOfDay(s.start))) : null;

  return {
    sampleDays: days.length,
    wake: enough ? median(wakes) : null,
    bed: enough ? median(beds) : null,
    gymStart: gymLogged === null ? null : gymLogged - 60,
    hustleStart,
    insights: findInsights(input, enough ? wakes : []),
  };
}

function findInsights(input: RhythmInput, wakes: number[]): Insight[] {
  const insights: Insight[] = [];
  const { today } = input;

  // Study on gym days vs other days (needs Study Planner).
  if (input.studyMinutesByDay) {
    const gymDays = new Set(input.workouts.filter((w) => inWindow(w.date, today, 28)).map((w) => w.date));
    const all = Array.from({ length: 28 }, (_, i) => toISODate(subDays(parseISO(today), i + 1)));
    const studied = (d: string) => input.studyMinutesByDay![d] ?? 0;
    const onGym = all.filter((d) => gymDays.has(d)).map(studied);
    const offGym = all.filter((d) => !gymDays.has(d)).map(studied);
    if (onGym.length >= 3 && offGym.length >= 3) {
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const diff = Math.round(avg(onGym) - avg(offGym));
      if (Math.abs(diff) >= 15) insights.push({ kind: 'gymStudy', diff });
    }
  }

  // Fun spending late at night.
  const fun = input.funExpenses.filter((e) => inWindow(e.createdAt.slice(0, 10), today, 28));
  const total = fun.reduce((a, e) => a + e.amount, 0);
  if (total >= 100 && fun.length >= 4) {
    const late = fun.filter((e) => {
      const h = new Date(e.createdAt).getHours();
      return h >= 21 || h < 4;
    });
    const share = late.reduce((a, e) => a + e.amount, 0) / total;
    if (share >= 0.4) insights.push({ kind: 'lateSpending', share: Math.round(share * 100) });
  }

  // Your best hustle weekday.
  const sessions = input.sessions.filter((s) => inWindow(s.start.slice(0, 10), today, 28));
  if (sessions.length >= 4) {
    const byDay = new Array(7).fill(0);
    for (const s of sessions) byDay[getDay(new Date(s.start))] += 1;
    const best = byDay.indexOf(Math.max(...byDay));
    if (byDay[best] >= 2) insights.push({ kind: 'bestHustleDay', weekday: best, sessions: byDay[best] });
  }

  // Your hardest weekday for daily moves.
  const moveDays = input.moves.filter((d) => inWindow(d.date, today, 28) && d.moves.length);
  if (moveDays.length >= 7) {
    const rate = (d: DayMoves) => d.moves.filter((m) => m.status === 'done').length / d.moves.length;
    const overall = moveDays.reduce((a, d) => a + rate(d), 0) / moveDays.length;
    let weak: { weekday: number; rate: number } | null = null;
    for (let wd = 0; wd < 7; wd++) {
      const these = moveDays.filter((d) => getDay(parseISO(d.date)) === wd);
      if (these.length < 2) continue;
      const r = these.reduce((a, d) => a + rate(d), 0) / these.length;
      if (r < 0.5 && r <= overall - 0.15 && (!weak || r < weak.rate)) weak = { weekday: wd, rate: r };
    }
    if (weak) insights.push({ kind: 'weakDay', weekday: weak.weekday, rate: Math.round(weak.rate * 100) });
  }

  // A wake-up time that swings a lot.
  if (wakes.length >= MIN_DAYS) {
    const spread = percentile(wakes, 0.8) - percentile(wakes, 0.2);
    if (spread >= 75) insights.push({ kind: 'wakeSwing', spread });
  }
  return insights;
}

// ---------- one shift a week ----------

export interface ShiftSuggestion {
  kind: ShiftKind;
  /** "HH:mm" target for time shifts. */
  target?: string;
  /** Where you are now ("HH:mm"), to show "from → to". */
  from?: string;
  weekday?: number;
}

/** Peak hours from About me, as [start, end) minutes. */
export const PEAK_WINDOWS: Record<EnergyPeak, [number, number]> = {
  morning: [6 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 22 * 60],
};

/** A bedtime goal like "00:30" means after midnight: compare it as 24:30. */
const bedMinutes = (hhmm: string) => {
  const m = toMinutes(hhmm);
  return m < 12 * 60 ? m + 24 * 60 : m;
};

/**
 * Picks this week's 1% shift, or null when there's nothing worth changing
 * yet. Bedtime and wake-up go 15 minutes at a time toward your goals (the
 * bigger gap first); then gym blocks that don't match when you really train,
 * hustle sessions far from your energy peak, and your hardest weekday.
 * Anything you skipped in the last 2 weeks waits.
 */
export function suggestShift(
  r: Rhythm,
  profile: Profile,
  gymBlockStart: number | null,
  recentShifts: WeeklyShift[],
): ShiftSuggestion | null {
  const skippedLately = new Set(recentShifts.slice(0, 2).filter((s) => s.status === 'skipped').map((s) => s.kind));
  const options: { s: ShiftSuggestion; gap: number }[] = [];

  if (r.bed !== null) {
    const goal = bedMinutes(profile.bedGoal);
    const gap = r.bed - goal;
    if (gap >= 15) options.push({ gap, s: { kind: 'bed', from: fromMinutes(r.bed), target: fromMinutes(Math.max(goal, round5(r.bed - 15))) } });
  }
  if (r.wake !== null) {
    const goal = toMinutes(profile.wakeGoal);
    const gap = r.wake - goal;
    if (gap >= 15) options.push({ gap, s: { kind: 'wake', from: fromMinutes(r.wake), target: fromMinutes(Math.max(goal, round5(r.wake - 15))) } });
  }
  options.sort((a, b) => b.gap - a.gap);

  if (r.gymStart !== null && gymBlockStart !== null && Math.abs(r.gymStart - gymBlockStart) >= 90) {
    options.push({ gap: 0, s: { kind: 'gymTime', from: fromMinutes(gymBlockStart), target: fromMinutes(round15(r.gymStart)) } });
  }
  if (r.hustleStart !== null) {
    const [start, end] = PEAK_WINDOWS[profile.energyPeak];
    if (r.hustleStart < start || r.hustleStart >= end) {
      options.push({ gap: 0, s: { kind: 'hustlePeak', from: fromMinutes(r.hustleStart) } });
    }
  }
  const weak = r.insights.find((i) => i.kind === 'weakDay');
  if (weak && weak.kind === 'weakDay') options.push({ gap: 0, s: { kind: 'weakDay', weekday: weak.weekday } });

  return options.find((o) => !skippedLately.has(o.s.kind))?.s ?? null;
}

/** Days this week (so far, before today) that hit a wake-up or bedtime target. */
export function daysOnTarget(kind: 'wake' | 'bed', target: string, activity: ActivityDay[], weekStart: string, today: string) {
  const days = activity.filter((d) => d.date >= weekStart && d.date < today);
  const goal = kind === 'wake' ? toMinutes(target) : bedMinutes(target);
  const hit = days.filter((d) => {
    const m = minutesFrom(d.date, kind === 'wake' ? d.firstAt : d.lastAt);
    return m <= goal + 10;
  }).length;
  return { hit, of: days.length };
}
