import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addOrder } from '../src/db/hustle';
import { loadPlan, makeWeeklyPlan } from '../src/db/brain';
import { db } from '../src/db/schema';
import { setSetting } from '../src/db/settings';
import { loadBrainSummary } from '../src/features/brain/loadBrainSummary';
import { loadCoachContext } from '../src/features/coach/loadCoachContext';
import { brainMoveId, planUrlFrom, planWeekStart, requestPlan, type BrainPlan } from '../src/lib/brain';
import { proposeMoves } from '../src/lib/coach';
import { toISODate, weekStart } from '../src/lib/dates';

const PLAN: BrainPlan = {
  headline: 'Midterm week: study first, keep the gym',
  encouragement: 'You hit 3 gym sessions last week.',
  focus: { school: 'Statistics', gym: '3 sessions', hustle: 'Demo site', money: 'Eat in' },
  days: [{ day: 0, note: 'Sunday: plan' }],
  tasks: [
    { pillar: 'school', title: 'Practice exam 1', minutes: 60, why: 'Midterm Thursday' },
    { pillar: 'hustle', title: 'Write your offer', minutes: 20, why: 'Step 7 of your path' },
    { pillar: 'money', title: 'Cook twice', minutes: 45, why: 'Eating out is your top leak' },
  ],
  habit: { title: 'Phone in the kitchen at night', why: 'Sleep' },
  watchOut: ['Friday night out before the exam'],
};

/** A fake Study Planner: the POST answers with a job, then "running" once, then the plan. */
function fakeStudyPlanner(final: object = { status: 'done', plan: PLAN }) {
  let polls = 0;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({ job: 'abc' }), { status: 202 });
    polls += 1;
    return new Response(JSON.stringify(polls < 2 ? { status: 'running' } : final), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const noSleep = async () => {};

describe('talking to Study Planner', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('finds the plan address next to the feed', () => {
    expect(planUrlFrom('https://mac.ts.net/api/levelup/feed')).toBe('https://mac.ts.net/api/levelup/plan');
  });

  it('plans the coming week on Saturday, this week otherwise', () => {
    expect(planWeekStart(new Date(2026, 10, 7))).toBe('2026-11-08'); // Saturday → next Sunday
    expect(planWeekStart(new Date(2026, 10, 4))).toBe('2026-11-01');
  });

  it('starts a job, waits, and returns the plan', async () => {
    const fetchMock = fakeStudyPlanner();
    const waited: number[] = [];
    const result = await requestPlan('https://mac/api/levelup/feed', 'key', { week: 1 }, (s) => waited.push(s), noSleep);
    expect(result).toEqual({ ok: true, plan: PLAN });
    expect(fetchMock.mock.calls[0][0]).toBe('https://mac/api/levelup/plan');
    expect(fetchMock.mock.calls[1][0]).toBe('https://mac/api/levelup/plan/abc');
    expect(waited.length).toBe(2);
  });

  it('explains what went wrong', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    expect(await requestPlan('https://x/feed', 'k', {}, undefined, noSleep)).toMatchObject({ reason: 'wrong-key' });

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'a plan is already being made' }), { status: 429 })));
    expect(await requestPlan('https://x/feed', 'k', {}, undefined, noSleep)).toMatchObject({ reason: 'busy' });

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    expect(await requestPlan('https://x/feed', 'k', {}, undefined, noSleep)).toMatchObject({ reason: 'unreachable' });

    fakeStudyPlanner({ status: 'error', error: "Claude didn't answer" });
    expect(await requestPlan('https://x/feed', 'k', {}, undefined, noSleep)).toEqual({ ok: false, reason: 'claude', detail: "Claude didn't answer" });

    fakeStudyPlanner({ status: 'done', plan: { headline: 'no tasks' } });
    expect(await requestPlan('https://x/feed', 'k', {}, undefined, noSleep)).toMatchObject({ reason: 'bad-plan' });

    expect(await requestPlan('', '', {})).toMatchObject({ reason: 'not-set-up' });
  });
});

describe('the summary and the plan in the app', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('builds a summary with your numbers but no client names', async () => {
    await addOrder({ client: 'Noa Levi', occasion: 'anniversary', package: 'basic', rush: false, price: 149, deadline: null, notes: 'secret notes', status: 'lead', paid: false });
    const summary = await loadBrainSummary(new Date(2026, 10, 4, 10, 0));
    expect(summary.planWeekStarting).toBe('2026-11-01');
    expect(summary.lastFourWeeks).toHaveLength(4);
    expect(summary.hustle.orders.leads).toBe(1);
    const text = JSON.stringify(summary);
    expect(text).not.toContain('Noa');
    expect(text).not.toContain('secret notes');
  });

  it('saves the plan, and its tasks become daily moves until done', async () => {
    await setSetting('studyPlannerUrl', 'https://mac/api/levelup/feed');
    await setSetting('studyPlannerKey', 'key');
    fakeStudyPlanner();
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout);

    expect((await makeWeeklyPlan()).ok).toBe(true);
    const week = planWeekStart();
    expect((await loadPlan(week))?.plan.headline).toBe(PLAN.headline);

    // Only the current week's plan feeds the moves.
    if (week === toISODate(weekStart())) {
      const firstTask = brainMoveId(week, 0);
      expect(proposeMoves(await loadCoachContext()).map((m) => m.id)).toContain(firstTask);

      await db.moves.put({ date: toISODate(new Date()), generatedAt: '', moves: [{ id: firstTask, pillar: 'school', title: '', minutes: 60, status: 'done' }] });
      const ids = proposeMoves(await loadCoachContext()).map((m) => m.id);
      expect(ids).not.toContain(firstTask);
      expect(ids).toContain(brainMoveId(week, 1));
    }
    vi.restoreAllMocks();
  });
});
