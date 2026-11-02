import { addDays } from 'date-fns';
import { db } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import { loadStudyFeed } from '../../db/studyFeed';
import type { CoachContext } from '../../lib/coach';
import { monthKey, toISODate, weekStart } from '../../lib/dates';
import { gymSessionsByDate } from '../../lib/gym';
import { minutesByDate } from '../../lib/hustle';
import { pathFacts, pathStatus } from '../../lib/hustlePath';
import { waitStatus } from '../../lib/money';
import { previousWeek } from '../../lib/review';
import { studyMinutesToday } from '../../lib/studyFeed';
import { weeklyTargets, weekProgress } from '../../lib/targets';
import { categoryLabel } from '../money/categories';
import { loadMoney } from '../money/useMoney';
import { blocksForDay } from '../week/schedule';

/** Reads everything the coach's rules look at, from every part of the app. */
export async function loadCoachContext(now: Date = new Date()): Promise<CoachContext> {
  const date = toISODate(now);
  const start = weekStart(now);
  const startISO = toISODate(start);
  const endISO = toISODate(addDays(start, 6));
  const month = monthKey(now);

  const [profile, pathDone, examMode, dayLog, weekDays, workouts, sessions, template, classes, orders, money, moneyCheck, review, lastReview, study, expensesWeek] =
    await Promise.all([
      getSetting('profile'),
      getSetting('hustlePathDone'),
      getSetting('examMode'),
      db.days.get(date),
      db.days.where('date').between(startISO, endISO, true, true).toArray(),
      db.workouts.where('date').between(startISO, endISO, true, true).toArray(),
      db.hustleSessions.where('start').aboveOrEqual(start.toISOString()).toArray(),
      db.templateBlocks.where('day').equals(now.getDay()).toArray(),
      db.classes.where('day').equals(now.getDay()).toArray(),
      db.orders.toArray(),
      loadMoney(month),
      db.moneyChecks.get(startISO),
      db.reviews.get(startISO),
      db.reviews.get(previousWeek(startISO)),
      loadStudyFeed(),
      db.expenses.where('date').between(startISO, endISO, true, true).toArray(),
    ]);

  const targets = weeklyTargets(examMode);
  const progress = weekProgress(weekDays, minutesByDate(sessions, now), gymSessionsByDate(workouts, weekDays));
  const gymBlock = blocksForDay(now.getDay(), template, classes).find((b) => b.pillar === 'gym');
  const step = pathStatus(pathDone, pathFacts(orders), profile.hustleStage).current;
  const stepText = step ? t.path.steps[step.id as keyof typeof t.path.steps] : null;

  return {
    now,
    date,
    weekStart: startISO,
    profile,
    focusSet: !!dayLog?.focus.trim(),
    examMode,
    gym: {
      done: progress.gym,
      goal: targets.gym,
      minimum: targets.gymMinimum,
      workoutToday: workouts.some((w) => w.date === date) || !!dayLog?.done.some((d) => d.pillar === 'gym'),
      // the block's time, or "anytime" for an untimed gym block; null when there's none today
      blockToday: gymBlock ? (gymBlock.start ?? t.today.anytime) : null,
    },
    hustle: {
      minutesThisWeek: progress.hustleMinutes,
      goalHours: targets.hustleHours,
      orders: orders.map((o) => ({ id: o.id!, client: o.client, status: o.status, deadline: o.deadline, createdAt: o.createdAt })),
      pathStep: step && stepText ? { id: step.id, title: stepText.title, why: stepText.why, minutes: step.minutes } : null,
    },
    money: {
      month,
      allowanceSet: !!money.allowance,
      moneyCheckDone: !!moneyCheck,
      funLeft: money.plan.fun - money.spent.fun,
      funPlan: money.plan.fun,
      waitReady: money.waitlist.filter((w) => waitStatus(w.addedAt, now).ready).map((w) => ({ id: w.id!, name: w.name })),
      expensesToday: money.expenses.filter((e) => e.date === date).length,
      watched: profile.moneyWatch.map((category) => ({
        label: categoryLabel(category),
        amount: expensesWeek.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
      })),
    },
    study: study
      ? {
          exams: study.feed.exams,
          deadlines: study.feed.deadlines,
          studiedTodayMin: studyMinutesToday(study.feed, now),
          plannedTodayMin: study.feed.plannedMinutesByDay[date] ?? 0,
        }
      : null,
    review: { done: !!review, weekGoals: lastReview?.nextGoals ?? null },
  };
}
