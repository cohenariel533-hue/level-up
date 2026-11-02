import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { activityDayOf, noteActivity } from '../src/db/activity';
import { db, type ActivityDay, type DayMoves } from '../src/db/schema';
import { acceptShift, ensureWeekShift, skipShift } from '../src/db/shifts';
import { proposeMoves, type CoachContext } from '../src/lib/coach';
import { DEFAULT_PROFILE } from '../src/lib/profile';
import { analyzeRhythm, daysOnTarget, median, suggestShift, type Rhythm, type RhythmInput } from '../src/lib/rhythm';

/** Local time ISO for a date + "HH:mm" (+ optional extra days for after-midnight). */
const at = (date: string, hhmm: string, plusDays = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d + plusDays, h, mi).toISOString();
};
/** n days before 2026-11-22 (a Sunday), as "YYYY-MM-DD". */
const daysBefore = (n: number) => {
  const d = new Date(2026, 10, 22 - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TODAY = '2026-11-22';
const week = (wake: string, bed: string, after = 1): ActivityDay[] =>
  Array.from({ length: 7 }, (_, i) => {
    const date = daysBefore(i + after);
    return { date, firstAt: at(date, wake), lastAt: bed < '04:00' ? at(date, bed, 1) : at(date, bed) };
  });

const empty: RhythmInput = { today: TODAY, activity: [], workouts: [], sessions: [], funExpenses: [], moves: [], studyMinutesByDay: null };
const profile = { ...DEFAULT_PROFILE, wakeGoal: '07:30', bedGoal: '23:30', energyPeak: 'morning' as const, completedAt: 'x' };

describe('reading your day', () => {
  it('uses the middle (median) of your first and last use, bedtime past midnight as 24:xx', () => {
    const r = analyzeRhythm({ ...empty, activity: week('08:40', '00:30') });
    expect(r.wake).toBe(8 * 60 + 40);
    expect(r.bed).toBe(24 * 60 + 30);
    expect(r.sampleDays).toBe(7);
  });

  it('waits for 5 days before saying anything about wake-up and bedtime', () => {
    const r = analyzeRhythm({ ...empty, activity: week('08:40', '00:30').slice(0, 4) });
    expect([r.wake, r.bed]).toEqual([null, null]);
  });

  it('ignores today (not finished yet) and the far past', () => {
    const r = analyzeRhythm({ ...empty, activity: [{ date: TODAY, firstAt: at(TODAY, '05:00'), lastAt: at(TODAY, '05:00') }, ...week('09:00', '23:00')] });
    expect(r.wake).toBe(9 * 60);
  });

  it('treats 01:30 as the night before', () => {
    expect(activityDayOf(new Date(2026, 10, 22, 1, 30))).toBe('2026-11-21');
    expect(activityDayOf(new Date(2026, 10, 22, 7, 0))).toBe('2026-11-22');
  });

  it('works out a median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });
});

describe('patterns', () => {
  it('spots late-night fun spending', () => {
    const funExpenses = [
      { amount: 80, createdAt: at(daysBefore(2), '22:30') },
      { amount: 60, createdAt: at(daysBefore(3), '23:10') },
      { amount: 30, createdAt: at(daysBefore(4), '13:00') },
      { amount: 20, createdAt: at(daysBefore(5), '12:00') },
    ];
    expect(analyzeRhythm({ ...empty, funExpenses }).insights).toContainEqual({ kind: 'lateSpending', share: 74 });
  });

  it('compares study on gym days with other days', () => {
    const gymDates = [2, 4, 6].map(daysBefore);
    const studyMinutesByDay: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) studyMinutesByDay[daysBefore(i)] = gymDates.includes(daysBefore(i)) ? 120 : 60;
    const r = analyzeRhythm({ ...empty, studyMinutesByDay, workouts: gymDates.map((date) => ({ date, createdAt: at(date, '19:00') })) });
    const insight = r.insights.find((i) => i.kind === 'gymStudy');
    expect(insight && insight.kind === 'gymStudy' && insight.diff).toBeGreaterThan(15);
  });

  it('finds your hardest weekday for moves', () => {
    const moves: DayMoves[] = Array.from({ length: 14 }, (_, i) => {
      const date = daysBefore(i + 1);
      const wednesday = new Date(date).getDay() === 3 || new Date(`${date}T12:00`).getDay() === 3;
      return {
        date,
        generatedAt: '',
        moves: [0, 1, 2].map((n) => ({ id: `m${n}:x`, pillar: 'life', title: '', minutes: 5, status: wednesday || n > 1 ? ('open' as const) : ('done' as const) })),
      };
    });
    const weak = analyzeRhythm({ ...empty, moves }).insights.find((i) => i.kind === 'weakDay');
    expect(weak).toMatchObject({ weekday: 3, rate: 0 });
  });
});

describe('one shift a week', () => {
  const rhythm = (over: Partial<Rhythm>): Rhythm => ({ sampleDays: 7, wake: null, bed: null, gymStart: null, hustleStart: null, insights: [], ...over });

  it('moves the bigger gap first, 15 minutes at a time, never past your goal', () => {
    const r = rhythm({ wake: 8 * 60 + 40, bed: 24 * 60 + 30 }); // wake 70 min late, bed 60 min late
    expect(suggestShift(r, profile, null, [])).toEqual({ kind: 'wake', from: '08:40', target: '08:25' });
    expect(suggestShift(rhythm({ wake: 7 * 60 + 45 }), profile, null, [])).toEqual({ kind: 'wake', from: '07:45', target: '07:30' });
    // under 15 minutes off is close enough: nothing to shift
    expect(suggestShift(rhythm({ wake: 7 * 60 + 40 }), profile, null, [])).toBeNull();
  });

  it('suggests moving gym blocks to when you really train', () => {
    expect(suggestShift(rhythm({ gymStart: 20 * 60 + 10 }), profile, 17 * 60, [])).toEqual({ kind: 'gymTime', from: '17:00', target: '20:15' });
  });

  it('suggests hustle at your energy peak', () => {
    expect(suggestShift(rhythm({ hustleStart: 22 * 60 }), profile, null, [])?.kind).toBe('hustlePeak');
    expect(suggestShift(rhythm({ hustleStart: 9 * 60 }), profile, null, [])).toBeNull();
  });

  it('doesn’t push something you skipped in the last two weeks', () => {
    const r = rhythm({ wake: 8 * 60 + 40, bed: 24 * 60 + 30 });
    const recent = [{ weekStart: '2026-11-15', kind: 'wake' as const, status: 'skipped' as const }];
    expect(suggestShift(r, profile, null, recent)?.kind).toBe('bed');
  });

  it('counts days on target this week', () => {
    const activity = week('07:35', '23:00');
    expect(daysOnTarget('wake', '07:30', activity, daysBefore(7), TODAY)).toEqual({ hit: 7, of: 7 });
    expect(daysOnTarget('wake', '07:00', activity, daysBefore(7), TODAY)).toEqual({ hit: 0, of: 7 });
  });
});

describe('coach moves for an accepted shift', () => {
  const base = (over: Partial<CoachContext>): CoachContext => ({
    now: new Date(2026, 10, 24, 21, 0), // Tuesday 21:00
    date: '2026-11-24',
    weekStart: '2026-11-22',
    profile,
    focusSet: true,
    examMode: false,
    gym: { done: 3, goal: 4, minimum: 3, workoutToday: true, blockToday: null, session: null },
    hustle: { minutesThisWeek: 600, goalHours: 7, orders: [], pathStep: null },
    money: { month: '2026-11', allowanceSet: true, moneyCheckDone: true, funLeft: 300, funPlan: 500, waitReady: [], expensesToday: 1, watched: [] },
    study: { exams: [], deadlines: [], studiedTodayMin: 0, plannedTodayMin: 0 },
    review: { done: false, weekGoals: null },
    shift: null,
    brainTasks: [],
    backup: { daysSince: 1, installedDaysAgo: 30 },
    ...over,
  });

  it('turns a bedtime shift into "phone down by", replacing the generic wind-down', () => {
    const ids = proposeMoves(base({ shift: { kind: 'bed', target: '00:15', hustlePeakDone: false } })).map((m) => m.id);
    expect(ids).toContain('shift-bed');
    expect(ids).not.toContain('bedtime');
  });

  it('turns a wake-up shift into an evening alarm reminder', () => {
    const move = proposeMoves(base({ shift: { kind: 'wake', target: '08:25', hustlePeakDone: false } })).find((m) => m.id === 'shift-wake');
    expect(move?.title).toBe('Set an alarm for 08:25');
  });

  it('asks to plan the hardest day the evening before', () => {
    const ids = proposeMoves(base({ shift: { kind: 'weakDay', weekday: 3, hustlePeakDone: false } })).map((m) => m.id);
    expect(ids).toContain('shift-plan-tomorrow');
  });
});

describe('with the database', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('keeps the first time and moves the last time forward', async () => {
    await noteActivity(new Date(2026, 10, 22, 8, 10));
    await noteActivity(new Date(2026, 10, 22, 13, 0));
    await noteActivity(new Date(2026, 10, 23, 0, 40)); // still the 22nd's evening
    const day = await db.activity.get('2026-11-22');
    expect(new Date(day!.firstAt).getHours()).toBe(8);
    expect(new Date(day!.lastAt).getHours()).toBe(0);
  });

  it('offers a shift once a week, and accepting a gym-time shift moves the gym blocks', async () => {
    await db.templateBlocks.bulkAdd([
      { day: 0, title: 'Gym', pillar: 'gym', start: '17:00', minutes: 75 },
      { day: 2, title: 'Gym', pillar: 'gym', start: '17:00', minutes: 75 },
    ]);
    for (const date of [2, 4, 6, 9].map(daysBefore)) await db.workouts.add({ date, type: 'upper', exercises: [], notes: '', createdAt: at(date, '21:15') });
    const now = new Date(2026, 10, 22, 12, 0);

    const shift = await ensureWeekShift(now);
    expect(shift).toMatchObject({ kind: 'gymTime', target: '20:15', status: 'offered' });
    expect((await ensureWeekShift(now))?.weekStart).toBe(shift?.weekStart);

    await acceptShift(shift!.weekStart);
    expect((await db.templateBlocks.toArray()).map((b) => b.start)).toEqual(['20:15', '20:15']);
    expect((await db.shifts.get(shift!.weekStart))?.status).toBe('accepted');
  });

  it('skipping just records it', async () => {
    await db.shifts.put({ weekStart: '2026-11-22', kind: 'wake', target: '08:25', status: 'offered' });
    await skipShift('2026-11-22');
    expect((await db.shifts.get('2026-11-22'))?.status).toBe('skipped');
  });
});
