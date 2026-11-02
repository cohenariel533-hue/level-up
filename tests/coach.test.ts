import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ensureTodayMoves, swapMove, toggleMove } from '../src/db/moves';
import { db, type DayMoves } from '../src/db/schema';
import { setSetting } from '../src/db/settings';
import { setFocus } from '../src/db/week';
import {
  autoComplete,
  kindOf,
  learnFromHistory,
  momentum,
  pickMoves,
  proposeMoves,
  type CoachContext,
  type Move,
} from '../src/lib/coach';
import { DEFAULT_PROFILE } from '../src/lib/profile';

/** Tue 3 Nov 2026, 10:00: a plain weekday morning with nothing urgent. */
function context(over: Partial<CoachContext> = {}): CoachContext {
  return {
    now: new Date(2026, 10, 3, 10, 0),
    date: '2026-11-03',
    weekStart: '2026-11-01',
    profile: { ...DEFAULT_PROFILE, completedAt: '2026-11-01T10:00:00Z' },
    focusSet: true,
    examMode: false,
    gym: { done: 1, goal: 4, minimum: 3, workoutToday: false, blockToday: null, session: null },
    hustle: { minutesThisWeek: 180, goalHours: 7, orders: [{ id: 1, client: 'Noa', status: 'building', deadline: null, createdAt: '2026-10-30T10:00:00Z' }], pathStep: null },
    money: { month: '2026-11', allowanceSet: true, moneyCheckDone: false, funLeft: 300, funPlan: 500, waitReady: [], expensesToday: 1, watched: [] },
    study: { exams: [], deadlines: [], studiedTodayMin: 0, plannedTodayMin: 0 },
    review: { done: false, weekGoals: null },
    shift: null,
    brainTasks: [],
    ...over,
  };
}

const ids = (moves: Move[]) => moves.map((m) => m.id);
const noHistory = { skipsByKind: {}, completionRate: null, carried: [] };

describe('rules', () => {
  it('puts a close exam at the top, the closer the more urgent', () => {
    const ctx = context({
      study: {
        exams: [{ id: 'task-2', title: 'Midterm', course: 'Statistics', kind: 'exam', at: '2026-11-05T09:00' }],
        deadlines: [],
        studiedTodayMin: 0,
        plannedTodayMin: 0,
      },
    });
    const exam = proposeMoves(ctx).find((m) => m.id === 'exam-study:task-2')!;
    expect(exam.priority).toBe(87); // 95 - 2 days × 4
    expect(exam.title).toContain('Statistics');
    expect(pickMoves(proposeMoves(ctx), noHistory)[0].id).toBe('exam-study:task-2');
  });

  it('asks for the allowance and the focus line, and ticks them once done', () => {
    const ctx = context({ focusSet: false, money: { ...context().money, allowanceSet: false } });
    expect(ids(proposeMoves(ctx))).toEqual(expect.arrayContaining(['focus', 'allowance:2026-11']));
  });

  it('suggests the gym on a gym day, and a catch-up only when the week needs it', () => {
    expect(ids(proposeMoves(context({ gym: { ...context().gym, blockToday: '17:00' } })))).toContain('gym-today');
    // With a program, the move names the session and the lift to beat
    const session = { name: 'Upper A', lifts: 'Bench press, Barbell row, Overhead press…', beat: 'Bench press 65kg×6' };
    const named = proposeMoves(context({ gym: { ...context().gym, blockToday: '17:00', session } })).find((m) => m.id === 'gym-today')!;
    expect(named.title).toBe('Upper A: Bench press, Barbell row, Overhead press…');
    expect(named.detail).toContain('beat Bench press 65kg×6');
    expect(ids(proposeMoves(context()))).not.toContain('gym-today');
    // Friday with 1 of 3 done: urgent catch-up
    const friday = context({ now: new Date(2026, 10, 6, 10, 0) });
    expect(proposeMoves(friday).find((m) => m.id === 'gym-catch-up')?.priority).toBe(70);
    // Already worked out today: no gym move
    expect(ids(proposeMoves(context({ gym: { ...context().gym, blockToday: '17:00', workoutToday: true } })))).not.toContain('gym-today');
  });

  it('keeps the hustle moving: due orders, waiting leads, reviews', () => {
    const ctx = context({
      hustle: {
        minutesThisWeek: 600,
        goalHours: 7,
        pathStep: null,
        orders: [
          { id: 1, client: 'Noa', status: 'building', deadline: '2026-11-04', createdAt: '2026-10-28T10:00:00Z' },
          { id: 2, client: 'Dani', status: 'lead', deadline: null, createdAt: '2026-10-30T10:00:00Z' },
          { id: 3, client: 'Maya', status: 'delivered', deadline: null, createdAt: '2026-10-20T10:00:00Z' },
        ],
      },
    });
    expect(ids(proposeMoves(ctx))).toEqual(expect.arrayContaining(['order-finish:1', 'lead-follow-up:2', 'ask-review:3']));
  });

  it('gives the next hustle path step, more urgent before the first order', () => {
    const pathStep = { id: 'demoPlan', title: 'Plan your demo', why: 'Demos sell', minutes: 30 };
    const none = proposeMoves(context({ hustle: { minutesThisWeek: 600, goalHours: 7, orders: [], pathStep } }));
    expect(none.find((m) => m.id === 'hustle-path:demoPlan')).toMatchObject({ priority: 58, auto: true, title: 'Plan your demo' });
    const some = proposeMoves(context({ hustle: { ...context().hustle, minutesThisWeek: 600, pathStep } }));
    expect(some.find((m) => m.id === 'hustle-path:demoPlan')?.priority).toBe(48);
  });

  it('nudges Saturday’s money check and review', () => {
    const saturday = context({ now: new Date(2026, 10, 7, 11, 0) });
    expect(ids(proposeMoves(saturday))).toEqual(expect.arrayContaining(['money-check:2026-11-01', 'weekly-review:2026-11-01']));
  });

  it('offers to connect Study Planner when it isn’t', () => {
    expect(ids(proposeMoves(context({ study: null })))).toContain('connect-study');
  });
});

describe('picking', () => {
  const moves: Move[] = [
    { id: 'exam-study:a', pillar: 'school', title: 'Exam', minutes: 45, priority: 90, easy: { title: 'Easy exam', minutes: 20 } },
    { id: 'deadline:b', pillar: 'school', title: 'Deadline', minutes: 60, priority: 86 },
    { id: 'gym-today', pillar: 'gym', title: 'Gym', minutes: 75, priority: 75 },
    { id: 'lead-follow-up:c', pillar: 'hustle', title: 'Follow up', minutes: 5, priority: 50 },
    { id: 'log-spending', pillar: 'money', title: 'Log', minutes: 1, priority: 35 },
  ];

  it('takes the top 3, allowing a second school move only when urgent', () => {
    expect(ids(pickMoves(moves, noHistory))).toEqual(['exam-study:a', 'deadline:b', 'gym-today']);
  });

  it('keeps pillars varied when nothing is urgent', () => {
    const calm = moves.map((m) => ({ ...m, priority: m.priority - 20 }));
    expect(ids(pickMoves(calm, noHistory))).toEqual(['exam-study:a', 'gym-today', 'lead-follow-up:c']);
  });

  it('sinks kinds you keep skipping', () => {
    const history = { ...noHistory, skipsByKind: { 'gym-today': 3 } };
    expect(ids(pickMoves(moves, history))).not.toContain('gym-today');
  });

  it('gives easier versions when you’ve been finishing few moves', () => {
    const picked = pickMoves(moves, { ...noHistory, completionRate: 0.2 });
    expect(picked.find((m) => m.id === 'exam-study:a')).toMatchObject({ title: 'Easy exam', minutes: 20 });
  });

  it('boosts what was left open yesterday', () => {
    const carried = [{ id: 'log-spending', pillar: 'money', title: 'Log', minutes: 1, status: 'open' as const }];
    const calm = moves.filter((m) => m.pillar !== 'school');
    const history = { ...noHistory, carried };
    expect(pickMoves(calm, history).map((m) => m.id)).toContain('log-spending');
  });
});

describe('learning, self-ticking and momentum', () => {
  const day = (date: string, statuses: ('open' | 'done' | 'skipped')[], idPrefix = 'm'): DayMoves => ({
    date,
    generatedAt: `${date}T08:00:00Z`,
    moves: statuses.map((status, i) => ({ id: `${idPrefix}${i}:x`, pillar: 'life', title: '', minutes: 5, status })),
  });

  it('learns skip counts, completion rate and yesterday’s open moves', () => {
    const history = learnFromHistory([day('2026-11-01', ['done', 'skipped', 'done']), day('2026-11-02', ['open', 'done', 'done'])], '2026-11-03');
    expect(history.completionRate).toBeCloseTo(4 / 6);
    expect(history.skipsByKind).toEqual({ m1: 1 });
    expect(history.carried.map((m) => m.id)).toEqual(['m0:x']);
  });

  it('ticks self-completing moves whose condition is gone', () => {
    const today: DayMoves = {
      date: '2026-11-03',
      generatedAt: '',
      moves: [
        { id: 'allowance:2026-11', pillar: 'money', title: '', minutes: 1, auto: true, status: 'open' },
        { id: 'lead-follow-up:2', pillar: 'hustle', title: '', minutes: 5, status: 'open' },
      ],
    };
    const updated = autoComplete(today, []);
    expect(updated?.moves.map((m) => m.status)).toEqual(['done', 'open']);
    expect(autoComplete(updated!, [])).toBeNull();
  });

  it('counts days in a row with 2+ moves done, without breaking on today', () => {
    const days = [day('2026-10-31', ['done', 'done']), day('2026-11-01', ['done', 'done', 'open']), day('2026-11-02', ['done', 'done', 'done'])];
    expect(momentum(days, '2026-11-03')).toBe(3);
    expect(momentum([...days, day('2026-11-03', ['done', 'done'])], '2026-11-03')).toBe(4);
    expect(momentum([day('2026-11-01', ['done']), day('2026-11-02', ['done', 'done'])], '2026-11-03')).toBe(1);
  });

  it('uses the kind before the colon', () => {
    expect(kindOf('exam-study:task-2')).toBe('exam-study');
  });
});

describe('a day with the real database', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('picks once, keeps the same moves, ticks the focus move itself, and swaps', async () => {
    const now = new Date(2026, 10, 3, 9, 0);
    const first = await ensureTodayMoves(now);
    expect(first.moves).toHaveLength(3);
    expect(first.moves.map((m) => m.id)).toEqual(expect.arrayContaining(['about-me', 'allowance:2026-11']));

    const again = await ensureTodayMoves(now);
    expect(again.moves.map((m) => m.id)).toEqual(first.moves.map((m) => m.id));

    await setFocus('2026-11-03', 'Finish the demo site');
    await setSetting('profile', { ...DEFAULT_PROFILE, completedAt: now.toISOString() });
    const after = await ensureTodayMoves(now);
    expect(after.moves.find((m) => m.id === 'about-me')?.status).toBe('done');

    const open = after.moves.find((m) => m.status === 'open')!;
    await toggleMove('2026-11-03', open.id);
    expect((await db.moves.get('2026-11-03'))?.moves.find((m) => m.id === open.id)?.status).toBe('done');

    const stillOpen = (await db.moves.get('2026-11-03'))!.moves.find((m) => m.status === 'open');
    if (stillOpen) {
      expect(await swapMove('2026-11-03', stillOpen.id, now)).toBe(true);
      const swapped = (await db.moves.get('2026-11-03'))!;
      expect(swapped.moves.find((m) => m.id === stillOpen.id)?.status).toBe('skipped');
      expect(swapped.moves.filter((m) => m.status !== 'skipped')).toHaveLength(3);
    }
  });
});
