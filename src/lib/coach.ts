/**
 * The coach: turns everything Level Up knows into a few small, concrete moves
 * for today. Pure functions only (no database, no React), tested in
 * tests/coach.test.ts.
 *
 * How a day's moves are picked:
 *   1. Rules (one family per pillar) look at your data and propose moves,
 *      each with a priority from 0 to 100 (an exam tomorrow beats a tidy-up).
 *   2. The picker adjusts for you: moves left open yesterday get a boost,
 *      kinds of moves you keep skipping sink, and when you've been finishing
 *      few moves lately it prefers short, easy versions.
 *   3. It takes the top 3, from different pillars unless something is urgent.
 *
 * Moves are "kind:subject" ids (e.g. "exam-study:task-2"). The kind is what
 * the coach learns from: skipping "lead-follow-up" twice makes all
 * follow-ups sink for a while.
 */
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import type { DayMoves, ReviewPillar, ShiftKind, StoredMove } from '../db/schema';
import { t } from '../i18n/en';
import { formatDayShort, toISODate } from './dates';
import { formatILS } from './format';
import type { Profile } from './profile';
import type { StudyExam, StudyFeed } from './studyFeed';
import { formatDuration } from './time';

export type MovePillar = 'school' | 'gym' | 'hustle' | 'money' | 'life';

export interface Move {
  id: string;
  pillar: MovePillar;
  title: string;
  detail?: string;
  minutes: number;
  to?: string;
  /** Ticks itself once its condition is gone (allowance added, review done…). */
  auto?: boolean;
  priority: number;
  /** A smaller version, used when you've been finishing few moves lately. */
  easy?: { title: string; minutes: number };
}

export interface CoachOrder {
  id: number;
  client: string;
  status: 'lead' | 'paid' | 'building' | 'delivered' | 'reviewed';
  deadline: string | null;
  createdAt: string;
}

/** Everything the rules look at. Gathered by features/coach/loadCoachContext.ts. */
export interface CoachContext {
  now: Date;
  date: string;
  weekStart: string;
  profile: Profile;
  focusSet: boolean;
  examMode: boolean;
  gym: {
    done: number;
    goal: number;
    minimum: number;
    workoutToday: boolean;
    blockToday: string | null;
    /** The next program session (lib/program.ts): its name, first lifts and the lift to beat. */
    session: { name: string; lifts: string; beat: string | null } | null;
  };
  hustle: {
    minutesThisWeek: number;
    goalHours: number;
    orders: CoachOrder[];
    /** The next step on the hustle path (lib/hustlePath.ts), if any. */
    pathStep: { id: string; title: string; why: string; minutes: number } | null;
  };
  money: {
    month: string;
    allowanceSet: boolean;
    moneyCheckDone: boolean;
    funLeft: number;
    funPlan: number;
    waitReady: { id: number; name: string }[];
    expensesToday: number;
    /** Watched categories (from About me) and what's been spent on each this week. */
    watched: { label: string; amount: number }[];
  };
  study: Pick<StudyFeed, 'exams' | 'deadlines'> & { studiedTodayMin: number; plannedTodayMin: number } | null;
  review: { done: boolean; weekGoals: Record<ReviewPillar, string> | null };
  /** Days since the last backup export (null = never), and since the app was first opened. */
  backup: { daysSince: number | null; installedDaysAgo: number };
  /** Tasks from Claude's plan for this week (lib/brain.ts) that aren't done yet, in plan order. */
  brainTasks: { id: string; pillar: MovePillar; title: string; minutes: number; why: string }[];
  /** This week's accepted 1% shift (lib/rhythm.ts), and whether its hustle session already happened. */
  shift: { kind: ShiftKind; target?: string; weekday?: number; hustlePeakDone: boolean } | null;
}

export const kindOf = (id: string) => id.split(':')[0];

const daysUntil = (iso: string, now: Date) => differenceInCalendarDays(parseISO(iso), now);

// ---------- the rules ----------

export function proposeMoves(ctx: CoachContext): Move[] {
  return [
    ...lifeMoves(ctx),
    ...schoolMoves(ctx),
    ...gymMoves(ctx),
    ...hustleMoves(ctx),
    ...moneyMoves(ctx),
    ...reviewMoves(ctx),
    ...shiftMoves(ctx),
    ...brainMoves(ctx),
  ];
}

/** The next two not-yet-done tasks from Claude's weekly plan. */
function brainMoves(ctx: CoachContext): Move[] {
  return ctx.brainTasks.slice(0, 2).map((task, i) => ({
    id: task.id,
    pillar: task.pillar,
    title: task.title,
    detail: task.why,
    minutes: task.minutes,
    to: '/plan',
    priority: 54 - i * 4,
  }));
}

function lifeMoves(ctx: CoachContext): Move[] {
  const moves: Move[] = [];
  const hour = ctx.now.getHours();
  if (!ctx.profile.completedAt) {
    moves.push({ id: 'about-me', pillar: 'life', title: t.coach.m.aboutMe, detail: t.coach.m.aboutMeDetail, minutes: 2, to: '/me', auto: true, priority: 70 });
  }
  // Everything lives only on this phone: a gentle backup reminder after the first week, then every 2 weeks.
  const { daysSince, installedDaysAgo } = ctx.backup;
  if ((daysSince === null && installedDaysAgo >= 7) || (daysSince !== null && daysSince >= 14)) {
    moves.push({ id: 'backup', pillar: 'life', title: t.coach.m.backup, detail: t.coach.m.backupDetail, minutes: 1, to: '/settings', auto: true, priority: 40 });
  }
  if (!ctx.focusSet && hour < 14) {
    moves.push({ id: 'focus', pillar: 'life', title: t.coach.m.setFocus, detail: t.coach.m.setFocusDetail, minutes: 1, auto: true, priority: 60 });
  }
  // (An accepted bedtime shift gives its own, more specific move instead.)
  if (ctx.profile.completedAt && hour >= 20 && ctx.shift?.kind !== 'bed') {
    moves.push({ id: 'bedtime', pillar: 'life', title: t.coach.m.bedtime(ctx.profile.bedGoal), detail: t.coach.m.bedtimeDetail, minutes: 5, priority: 30 });
  }
  return moves;
}

function schoolMoves(ctx: CoachContext): Move[] {
  if (!ctx.study) {
    return [{ id: 'connect-study', pillar: 'school', title: t.coach.m.connectStudy, detail: t.coach.m.connectStudyDetail, minutes: 3, to: '/settings', auto: true, priority: 25 }];
  }
  const moves: Move[] = [];
  const peak = t.coach.peak[ctx.profile.energyPeak];

  // The nearest exam (within 2 weeks) or quiz (within 5 days): the closer, the more urgent.
  const exam = ctx.study.exams.find((e: StudyExam) => {
    const d = daysUntil(e.at, ctx.now);
    return d >= 0 && (e.kind === 'exam' ? d <= 14 : d <= 5);
  });
  if (exam) {
    const d = daysUntil(exam.at, ctx.now);
    const course = exam.course || exam.title;
    moves.push({
      id: `exam-study:${exam.id}`,
      pillar: 'school',
      title: t.coach.m.examStudy(course, d),
      detail: peak,
      minutes: 45,
      priority: exam.kind === 'exam' ? 95 - d * 4 : 80 - d * 5,
      easy: { title: t.coach.m.examStudyEasy(course), minutes: 20 },
    });
  }

  // The nearest deadline in 3 days that still has work left.
  const deadline = ctx.study.deadlines.find((d) => daysUntil(d.due, ctx.now) <= 3 && d.effortMin > d.doneMin);
  if (deadline) {
    const d = Math.max(daysUntil(deadline.due, ctx.now), 0);
    const left = deadline.effortMin - deadline.doneMin;
    moves.push({
      id: `deadline:${deadline.id}`,
      pillar: 'school',
      title: t.coach.m.deadlineWork(deadline.title, formatDuration(left)),
      detail: t.coach.m.deadlineDetail(formatDayShort(deadline.due.slice(0, 10))),
      minutes: Math.min(left, 60),
      priority: 88 - d * 8,
      easy: { title: t.coach.m.deadlineWork(deadline.title, formatDuration(left)), minutes: 25 },
    });
  }

  // Study Planner planned blocks for today that aren't done yet.
  const leftToday = ctx.study.plannedTodayMin - ctx.study.studiedTodayMin;
  if (leftToday >= 20) {
    moves.push({
      id: 'planned-study',
      pillar: 'school',
      title: t.coach.m.plannedStudy(formatDuration(leftToday)),
      detail: t.coach.m.plannedStudyDetail,
      minutes: Math.min(leftToday, 90),
      priority: 55,
    });
  }
  return moves;
}

function gymMoves(ctx: CoachContext): Move[] {
  const { done, goal, minimum, workoutToday, blockToday } = ctx.gym;
  if (workoutToday || done >= goal) return [];
  const session = ctx.gym.session;
  if (blockToday) {
    return [{
      id: 'gym-today',
      pillar: 'gym',
      title: session ? t.coach.m.gymSession(session.name, session.lifts) : t.coach.m.gymToday,
      detail: session ? t.coach.m.gymSessionDetail(blockToday, session.beat) : t.coach.m.gymTodayDetail(blockToday),
      minutes: 75,
      to: '/gym',
      auto: true,
      priority: 75,
    }];
  }
  // No gym block today: suggest one only when the week needs it.
  const daysLeft = 7 - ctx.now.getDay(); // including today
  const behind = minimum - done;
  const urgent = behind > 0 && daysLeft <= behind + 1;
  if (!urgent && done >= minimum) return [];
  return [{
    id: 'gym-catch-up',
    pillar: 'gym',
    title: t.coach.m.gymCatchUp(done, goal),
    detail: t.coach.m.gymCatchUpDetail,
    minutes: 45,
    to: '/gym',
    auto: true,
    priority: urgent ? 70 : 35,
    easy: { title: t.coach.m.gymCatchUpEasy, minutes: 20 },
  }];
}

function hustleMoves(ctx: CoachContext): Move[] {
  const moves: Move[] = [];
  const { orders } = ctx.hustle;

  for (const o of orders) {
    if ((o.status === 'paid' || o.status === 'building') && o.deadline) {
      const d = daysUntil(o.deadline, ctx.now);
      if (d <= 3) {
        moves.push({ id: `order-finish:${o.id}`, pillar: 'hustle', title: t.coach.m.finishOrder(o.client, d), minutes: 60, to: '/hustle', priority: 85 - Math.max(d, 0) * 5 });
        continue;
      }
    }
    if (o.status === 'paid') {
      moves.push({ id: `order-start:${o.id}`, pillar: 'hustle', title: t.coach.m.startPaidOrder(o.client), minutes: 60, to: '/hustle', priority: 60 });
    } else if (o.status === 'delivered') {
      moves.push({ id: `ask-review:${o.id}`, pillar: 'hustle', title: t.coach.m.askReview(o.client), detail: t.coach.m.askReviewDetail, minutes: 5, to: '/hustle', priority: 45 });
    }
  }

  // The oldest lead that's been waiting 2+ days.
  const lead = orders
    .filter((o) => o.status === 'lead' && differenceInCalendarDays(ctx.now, parseISO(o.createdAt)) >= 2)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (lead) {
    moves.push({ id: `lead-follow-up:${lead.id}`, pillar: 'hustle', title: t.coach.m.followUpLead(lead.client), detail: t.coach.m.followUpDetail, minutes: 5, to: '/hustle', priority: 50 });
  }

  // The next step on the hustle path. A bit more urgent before the first order,
  // when it's the only thing moving the hustle forward. Ticks itself once done.
  const step = ctx.hustle.pathStep;
  if (step) {
    moves.push({
      id: `hustle-path:${step.id}`,
      pillar: 'hustle',
      title: step.title,
      detail: step.why,
      minutes: step.minutes,
      to: '/hustle',
      auto: true,
      priority: orders.length === 0 ? 58 : 48,
    });
  }

  // Behind on hours for this point in the week.
  const goalMin = ctx.hustle.goalHours * 60;
  const expectedByNow = goalMin * ((ctx.now.getDay() + 1) / 7);
  if (goalMin > 0 && ctx.hustle.minutesThisWeek < expectedByNow - 30) {
    moves.push({
      id: 'hustle-hours',
      pillar: 'hustle',
      title: t.coach.m.hustleHours(formatDuration(Math.round(goalMin - ctx.hustle.minutesThisWeek))),
      minutes: 30,
      to: '/hustle',
      priority: 40,
    });
  }
  return moves;
}

function moneyMoves(ctx: CoachContext): Move[] {
  const m = ctx.money;
  const moves: Move[] = [];
  if (!m.allowanceSet) {
    moves.push({ id: `allowance:${m.month}`, pillar: 'money', title: t.coach.m.addAllowance, detail: t.coach.m.addAllowanceDetail, minutes: 1, to: '/money', auto: true, priority: 80 });
  }
  if (ctx.now.getDay() === 6 && !m.moneyCheckDone) {
    moves.push({ id: `money-check:${ctx.weekStart}`, pillar: 'money', title: t.coach.m.moneyCheck, minutes: 3, to: '/money/check', auto: true, priority: 78 });
  }
  const ready = m.waitReady[0];
  if (ready) {
    moves.push({ id: `wait-decide:${ready.id}`, pillar: 'money', title: t.coach.m.decideWait(ready.name), detail: t.coach.m.decideWaitDetail, minutes: 1, to: '/money', auto: true, priority: 55 });
  }
  if (m.funPlan > 0 && m.funLeft < m.funPlan * 0.15) {
    moves.push({ id: 'no-spend-fun', pillar: 'money', title: t.coach.m.noSpendFun, detail: t.coach.m.noSpendFunDetail(formatILS(Math.max(m.funLeft, 0))), minutes: 0, priority: 45 });
  }
  const watched = [...m.watched].sort((a, b) => b.amount - a.amount)[0];
  if (watched && watched.amount > 0) {
    moves.push({ id: `watch-spend:${watched.label}`, pillar: 'money', title: t.coach.m.watchSpend(watched.label), detail: t.coach.m.watchSpendDetail(formatILS(watched.amount)), minutes: 0, priority: 30 });
  }
  if (ctx.now.getHours() >= 18 && m.expensesToday === 0) {
    moves.push({ id: 'log-spending', pillar: 'money', title: t.coach.m.logSpending, detail: t.coach.m.logSpendingDetail, minutes: 1, to: '/money', priority: 35 });
  }
  return moves;
}

function reviewMoves(ctx: CoachContext): Move[] {
  const moves: Move[] = [];
  if (ctx.now.getDay() === 6 && !ctx.review.done) {
    moves.push({ id: `weekly-review:${ctx.weekStart}`, pillar: 'life', title: t.coach.m.weeklyReview, minutes: 30, to: '/review', auto: true, priority: 82 });
  }
  // One of last review's goals for this week, a different pillar each day.
  const goals = ctx.review.weekGoals;
  if (goals) {
    const pillars = (Object.keys(goals) as ReviewPillar[]).filter((p) => goals[p]);
    if (pillars.length) {
      const p = pillars[ctx.now.getDate() % pillars.length];
      moves.push({
        id: `week-goal:${p}`,
        pillar: p,
        title: t.coach.m.weekGoal(t.review.pillars[p], goals[p]),
        detail: t.coach.m.weekGoalDetail,
        minutes: 30,
        priority: 42,
      });
    }
  }
  return moves;
}

/** Daily moves for this week's accepted 1% shift. */
function shiftMoves(ctx: CoachContext): Move[] {
  const s = ctx.shift;
  if (!s) return [];
  const hour = ctx.now.getHours();
  const m = t.rhythm.moves;
  if (s.kind === 'wake' && s.target && hour >= 19) {
    return [{ id: 'shift-wake', pillar: 'life', title: m.alarm(s.target), detail: m.alarmDetail, minutes: 1, priority: 55 }];
  }
  if (s.kind === 'bed' && s.target && hour >= 20) {
    return [{ id: 'shift-bed', pillar: 'life', title: m.phoneDown(s.target), detail: m.phoneDownDetail, minutes: 5, priority: 58 }];
  }
  if (s.kind === 'hustlePeak' && !s.hustlePeakDone) {
    const peak = t.rhythm.peaks[ctx.profile.energyPeak];
    return [{ id: 'shift-hustle-peak', pillar: 'hustle', title: m.hustlePeak(peak), detail: m.hustlePeakDetail, minutes: 45, to: '/hustle', auto: true, priority: 47 }];
  }
  if (s.kind === 'weakDay' && s.weekday === (ctx.now.getDay() + 1) % 7 && hour >= 18) {
    return [{ id: 'shift-plan-tomorrow', pillar: 'life', title: m.planTomorrow(t.week.days[s.weekday]), detail: m.planTomorrowDetail, minutes: 2, to: '/week', priority: 50 }];
  }
  return [];
}

// ---------- learning from you ----------

export interface CoachHistory {
  /** How often each kind of move was skipped in the last 7 days. */
  skipsByKind: Record<string, number>;
  /** Share of moves done in the last 7 days (null if too few to tell). */
  completionRate: number | null;
  /** Moves left open yesterday. */
  carried: StoredMove[];
}

/** Reads the last week of days (not today) into what the picker learns from. */
export function learnFromHistory(pastDays: DayMoves[], today: string): CoachHistory {
  const recent = pastDays.filter((d) => d.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const skipsByKind: Record<string, number> = {};
  let done = 0;
  let total = 0;
  for (const day of recent) {
    for (const m of day.moves) {
      total += 1;
      if (m.status === 'done') done += 1;
      if (m.status === 'skipped') skipsByKind[kindOf(m.id)] = (skipsByKind[kindOf(m.id)] ?? 0) + 1;
    }
  }
  const yesterday = recent.find((d) => differenceInCalendarDays(parseISO(today), parseISO(d.date)) === 1);
  return {
    skipsByKind,
    completionRate: total >= 3 ? done / total : null,
    carried: yesterday ? yesterday.moves.filter((m) => m.status === 'open') : [],
  };
}

// ---------- picking ----------

export const STRUGGLING_BELOW = 0.4;

/** Picks today's moves: adjusted for you, top first, from different pillars unless urgent. */
export function pickMoves(candidates: Move[], history: CoachHistory, count = 3): Move[] {
  const struggling = history.completionRate !== null && history.completionRate < STRUGGLING_BELOW;
  const carriedIds = new Set(history.carried.map((m) => m.id));

  const scored = candidates
    .map((original) => {
      const m = struggling && original.easy ? { ...original, ...original.easy } : original;
      let score = m.priority;
      if (carriedIds.has(m.id)) score += 10;
      score -= 12 * Math.min(history.skipsByKind[kindOf(m.id)] ?? 0, 3);
      if (struggling && m.minutes > 30) score -= 10;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked: Move[] = [];
  const perPillar: Record<string, number> = {};
  for (const { m, score } of scored) {
    if (picked.length === count) break;
    const n = perPillar[m.pillar] ?? 0;
    if (n === 0 || (score >= 85 && n < 2)) {
      picked.push(m);
      perPillar[m.pillar] = n + 1;
    }
  }
  // Not enough variety today? Fill up with the best of the rest.
  for (const { m } of scored) {
    if (picked.length === count) break;
    if (!picked.includes(m)) picked.push(m);
  }
  return picked;
}

/** A picked move as stored for the day. */
export function toStored(m: Move, carried: boolean): StoredMove {
  return { id: m.id, pillar: m.pillar, title: m.title, detail: m.detail, minutes: m.minutes, to: m.to, auto: m.auto, carried: carried || undefined, status: 'open' };
}

/**
 * Self-ticking moves whose condition is gone (allowance added, workout
 * logged, review saved…) are marked done. Returns null if nothing changed.
 */
export function autoComplete(day: DayMoves, candidates: Move[]): DayMoves | null {
  const stillNeeded = new Set(candidates.map((c) => c.id));
  let changed = false;
  const moves = day.moves.map((m) => {
    if (m.status === 'open' && m.auto && !stillNeeded.has(m.id)) {
      changed = true;
      return { ...m, status: 'done' as const };
    }
    return m;
  });
  return changed ? { ...day, moves } : null;
}

/**
 * Days in a row with at least 2 moves done. Today counts once it gets there,
 * but an unfinished today never breaks the run.
 */
export function momentum(days: DayMoves[], today: string): number {
  const doneOn = new Map(days.map((d) => [d.date, d.moves.filter((m) => m.status === 'done').length]));
  let streak = (doneOn.get(today) ?? 0) >= 2 ? 1 : 0;
  let cursor = parseISO(today);
  for (;;) {
    cursor = subDays(cursor, 1);
    if ((doneOn.get(toISODate(cursor)) ?? 0) < 2) return streak;
    streak += 1;
  }
}
