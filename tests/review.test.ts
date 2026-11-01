import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addWorkout } from '../src/db/gym';
import { saveReview } from '../src/db/review';
import { db } from '../src/db/schema';
import { setSetting } from '../src/db/settings';
import { toggleBlockDone } from '../src/db/week';
import { loadWeekFacts } from '../src/features/review/loadWeekFacts';
import { autoMinimums, countHit, defaultReviewWeek, hustleMinimum } from '../src/lib/review';

const facts = {
  schoolPlanned: 5,
  schoolDone: 5,
  gymSessions: 3,
  hustleHours: 5,
  moneyCheckDone: true,
  examMode: false,
};

describe('minimums', () => {
  it('ticks everything for a week that hit them all', () => {
    const m = autoMinimums(facts);
    expect(m).toEqual({ school: true, gym: true, hustle: true, money: true });
    expect(countHit(m)).toBe(4);
  });

  it('leaves unticked what fell short', () => {
    expect(autoMinimums({ ...facts, schoolDone: 4, gymSessions: 2, hustleHours: 4.5, moneyCheckDone: false })).toEqual({
      school: false,
      gym: false,
      hustle: false,
      money: false,
    });
  });

  it('counts school as met when nothing was planned', () => {
    expect(autoMinimums({ ...facts, schoolPlanned: 0, schoolDone: 0 }).school).toBe(true);
  });

  it('lowers the hustle minimum to 2 h in exam mode', () => {
    expect(hustleMinimum(false)).toBe(5);
    expect(hustleMinimum(true)).toBe(2);
    expect(autoMinimums({ ...facts, hustleHours: 2, examMode: true }).hustle).toBe(true);
  });
});

describe('which week to review', () => {
  it('is this week from Monday to Saturday', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 7), new Set())).toBe('2026-11-01'); // Saturday
  });

  it('is last week on a Sunday if last week has no review', () => {
    expect(defaultReviewWeek(new Date(2026, 10, 8), new Set())).toBe('2026-11-01');
    expect(defaultReviewWeek(new Date(2026, 10, 8), new Set(['2026-11-01']))).toBe('2026-11-08');
  });
});

describe('week facts and saving', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('gathers the week from Today, Gym, Hustle and Money', async () => {
    await db.templateBlocks.bulkAdd([
      { day: 0, title: 'Study', pillar: 'school', start: '09:00', minutes: 420 },
      { day: 1, title: 'Study', pillar: 'school', start: '09:00', minutes: 420 },
    ]);
    await db.classes.add({ name: 'Stats', day: 2, start: '10:00', end: '11:30' });
    await toggleBlockDone('2026-11-01', { key: 'tpl-1', pillar: 'school', minutes: 420 });
    await toggleBlockDone('2026-11-02', { key: 'tpl-2', pillar: 'hustle', minutes: 90 });
    await addWorkout({ date: '2026-11-03', type: 'upper', notes: '', exercises: [{ name: 'Bench', sets: 3, reps: 8, weight: 60 }] });
    await addWorkout({ date: '2026-11-09', type: 'upper', notes: '', exercises: [{ name: 'Bench', sets: 3, reps: 8, weight: 60 }] }); // next week
    await db.moneyChecks.put({
      weekStart: '2026-11-01',
      completedAt: '2026-11-07T20:00:00Z',
      spent: 0,
      planned: 0,
      movedSavings: true,
      biggestLeak: '',
      note: '',
    });
    await setSetting('examMode', false);

    expect(await loadWeekFacts('2026-11-01')).toEqual({
      schoolPlanned: 3,
      schoolDone: 1,
      gymSessions: 1,
      hustleHours: 1.5,
      moneyCheckDone: true,
      examMode: false,
    });
  });

  it('saves one review per week, trimming text, and updates it in place', async () => {
    const base = {
      weekStart: '2026-11-01',
      minimums: { school: true, gym: false, hustle: true, money: true },
      stats: { schoolDone: 5, schoolPlanned: 5, gymSessions: 2, hustleHours: 6 },
      wins: '  First paid order  ',
      obstacles: '',
      nextGoals: { school: ' Chapter 4 ', gym: '4 sessions', hustle: '', money: '' },
    };
    await saveReview(base);
    await saveReview({ ...base, obstacles: 'Midterms' });
    const all = await db.reviews.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ wins: 'First paid order', obstacles: 'Midterms', nextGoals: { school: 'Chapter 4' } });
  });
});
