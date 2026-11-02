import { subWeeks } from 'date-fns';
import { db } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { loadStudyFeed } from '../../db/studyFeed';
import { planWeekStart, weekDates } from '../../lib/brain';
import { monthKey, toISODate, weekStart } from '../../lib/dates';
import { goalProgress, HUSTLE_GOAL } from '../../lib/hustle';
import { pathFacts, pathStatus } from '../../lib/hustlePath';
import { buildProgram, planSession } from '../../lib/program';
import { studyMinutesInWeek } from '../../lib/studyFeed';
import { fromMinutes } from '../../lib/time';
import { loadCoachContext } from '../coach/loadCoachContext';
import { categoryLabel, kindOf } from '../money/categories';
import { loadMoney } from '../money/useMoney';
import { loadWeekFacts } from '../review/loadWeekFacts';
import { loadRhythm } from '../rhythm/loadRhythm';
import { t } from '../../i18n/en';

/**
 * The short summary Claude plans from. Only what a coach needs: your goals,
 * the last 4 weeks in numbers, what's coming up, and your last review. No
 * expense notes and no client names: orders are only counted.
 */
export async function loadBrainSummary(now: Date = new Date()) {
  const planFor = planWeekStart(now);
  const thisWeek = toISODate(weekStart(now));
  const [profile, examMode, coach, rhythm, money, study, orders, workouts, pathDone, lastReview] = await Promise.all([
    getSetting('profile'),
    getSetting('examMode'),
    loadCoachContext(now),
    loadRhythm(now),
    loadMoney(monthKey(now)),
    loadStudyFeed(),
    db.orders.toArray(),
    db.workouts.toArray(),
    getSetting('hustlePathDone'),
    db.reviews.orderBy('weekStart').last(),
  ]);

  // The last 4 weeks, oldest first (this week so far included).
  const weeks = [3, 2, 1, 0].map((n) => toISODate(subWeeks(weekStart(now), n)));
  const history = await Promise.all(
    weeks.map(async (w) => {
      const facts = await loadWeekFacts(w);
      const moves = await db.moves.where('date').anyOf(weekDates(w)).toArray();
      const all = moves.flatMap((d) => d.moves.filter((m) => m.status !== 'skipped'));
      return {
        week: w,
        gymSessions: facts.gymSessions,
        hustleHours: facts.hustleHours,
        studyHours: study ? Math.round(studyMinutesInWeek(study.feed, w) / 6) / 10 : null,
        movesDone: `${all.filter((m) => m.status === 'done').length}/${all.length}`,
        moneyCheck: facts.moneyCheckDone,
      };
    }),
  );

  // Where money went this month, top fun categories.
  const fun = new Map<string, number>();
  for (const e of money.expenses) if (kindOf(e.category, money.kinds) === 'fun') fun.set(e.category, (fun.get(e.category) ?? 0) + e.amount);
  const topFun = [...fun.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, amount]) => ({ category: categoryLabel(c), amount }));

  const path = pathStatus(pathDone, pathFacts(orders), profile.hustleStage);
  const pathStepText = path.current ? t.path.steps[path.current.id as keyof typeof t.path.steps]?.title : null;
  const goal = goalProgress(orders, now);
  const session = planSession(buildProgram(profile.gymDays, profile.gymSetup), profile.gymLevel, workouts, toISODate(now), examMode);

  return {
    today: toISODate(now),
    planWeekStarting: planFor,
    weekdayToday: t.week.days[now.getDay()],
    me: {
      name: profile.name || null,
      why: profile.why || null,
      energyPeak: profile.energyPeak,
      wakeGoal: profile.wakeGoal,
      bedGoal: profile.bedGoal,
      gym: { level: profile.gymLevel, setup: profile.gymSetup, sessionsPerWeek: profile.gymDays, goal: 'build muscle' },
    },
    examMode,
    lastFourWeeks: history,
    school: study
      ? {
          upcomingExams: study.feed.exams.slice(0, 5).map((e) => ({ course: e.course, kind: e.kind, at: e.at })),
          deadlines: study.feed.deadlines.slice(0, 5).map((d) => ({ title: d.title, course: d.course, due: d.due, hoursLeft: Math.round((d.effortMin - d.doneMin) / 6) / 10 })),
        }
      : 'Study Planner not connected',
    gym: { nextSession: session.day.id, firstLifts: session.targets.slice(0, 3).map((x) => `${x.name} ${x.sets}×${x.reps}${x.weight ? ` @ ${x.weight}kg` : ''}`) },
    hustle: {
      business: 'personalized gift websites (anniversaries, birthdays, proposals), later local businesses',
      pathNextStep: pathStepText,
      orders: { leads: orders.filter((o) => o.status === 'lead').length, inProgress: orders.filter((o) => o.status === 'paid' || o.status === 'building').length, delivered: orders.filter((o) => o.status === 'delivered' || o.status === 'reviewed').length },
      goal90Days: { customers: `${goal.customers}/${HUSTLE_GOAL.customers}`, earned: `₪${goal.earned}/₪${HUSTLE_GOAL.earned}`, daysLeft: goal.daysLeft, onPace: goal.onPace },
    },
    money: {
      thisMonth: { plan: money.plan, spent: money.spent, savedThisMonth: money.savedThisMonth },
      totalSaved: money.totalSaved,
      topFunSpending: topFun,
      waitingOn48HourList: money.waitlist.length,
    },
    rhythm: {
      typicalDayStart: rhythm.rhythm.wake === null ? null : fromMinutes(rhythm.rhythm.wake),
      typicalDayEnd: rhythm.rhythm.bed === null ? null : fromMinutes(rhythm.rhythm.bed),
      patterns: rhythm.rhythm.insights.map((i) => i.kind),
      thisWeeksShift: rhythm.shift?.status === 'accepted' ? { kind: rhythm.shift.kind, target: rhythm.shift.target ?? null } : null,
    },
    lastReview: lastReview
      ? {
          week: lastReview.weekStart,
          minimumsHit: lastReview.minimums,
          wins: lastReview.wins,
          gotInTheWay: lastReview.obstacles,
          goalsSet: lastReview.nextGoals,
        }
      : null,
    focusToday: coach.focusSet ? (await db.days.get(toISODate(now)))?.focus ?? null : null,
    thisWeekStarted: thisWeek,
  };
}
