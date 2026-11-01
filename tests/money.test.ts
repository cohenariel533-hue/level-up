import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addExpense, addHustleIncome, decideWaitItem, addWaitItem, moveSavings, previousAllowance, setAllowance } from '../src/db/money';
import { db } from '../src/db/schema';
import { initDatabase } from '../src/db/seed';
import { loadMoney } from '../src/features/money/useMoney';
import {
  DEFAULT_BUDGET_SPLIT,
  DEFAULT_HUSTLE_SPLIT,
  fillGoals,
  isValidSplit,
  parseAmount,
  planMonth,
  sumByKind,
  waitStatus,
  weeklyShare,
} from '../src/lib/money';

describe('planMonth', () => {
  it('splits allowance 60 / 25 / 15', () => {
    expect(planMonth(2000, 0, DEFAULT_BUDGET_SPLIT, DEFAULT_HUSTLE_SPLIT, false)).toEqual({
      needs: 1200,
      fun: 500,
      savings: 300,
      reinvest: 0,
    });
  });

  it('splits hustle income 50 / 30 / 20 while the buffer is not full', () => {
    expect(planMonth(0, 1000, DEFAULT_BUDGET_SPLIT, DEFAULT_HUSTLE_SPLIT, false)).toEqual({
      needs: 0,
      fun: 200,
      savings: 500,
      reinvest: 300,
    });
  });

  it('puts hustle income on the normal split once the buffer is full', () => {
    expect(planMonth(0, 1000, DEFAULT_BUDGET_SPLIT, DEFAULT_HUSTLE_SPLIT, true)).toEqual({
      needs: 600,
      fun: 250,
      savings: 150,
      reinvest: 0,
    });
  });
});

describe('fillGoals', () => {
  const goals = [{ target: 1500 }, { target: 1200 }, { target: 500 }];

  it('fills goals in order, like a waterfall', () => {
    const { items, extra } = fillGoals(goals, 2000);
    expect(items.map((i) => i.saved)).toEqual([1500, 500, 0]);
    expect(items.map((i) => i.done)).toEqual([true, false, false]);
    expect(extra).toBe(0);
  });

  it('reports savings beyond all goals as extra', () => {
    expect(fillGoals(goals, 3500).extra).toBe(300);
  });

  it('never goes negative', () => {
    expect(fillGoals(goals, -100).items.every((i) => i.saved === 0)).toBe(true);
  });
});

describe('parseAmount', () => {
  it.each([
    ['45', 45],
    ['45.5', 45.5],
    ['45,50', 45.5],
    ['₪1,200', 1200],
    [' 30 ', 30],
  ])('reads %s as %d', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['', 'abc', '0', '-5', '1.2.3'])('rejects "%s"', (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe('small helpers', () => {
  it('sums spending per bucket', () => {
    const kinds: Record<string, 'need' | 'fun' | 'reinvest'> = { food: 'need', clothes: 'fun', hustle: 'reinvest' };
    const spent = sumByKind(
      [
        { amount: 50, category: 'food' },
        { amount: 120, category: 'clothes' },
        { amount: 30, category: 'food' },
        { amount: 40, category: 'hustle' },
      ],
      (c) => kinds[c],
    );
    expect(spent).toEqual({ needs: 80, fun: 120, reinvest: 40 });
  });

  it('scales a monthly plan to a week', () => {
    expect(weeklyShare(3000, 30)).toBe(700);
  });

  it('counts down 48 hours', () => {
    const added = new Date('2026-11-01T10:00:00Z').toISOString();
    expect(waitStatus(added, new Date('2026-11-02T10:00:00Z'))).toEqual({ ready: false, hoursLeft: 24 });
    expect(waitStatus(added, new Date('2026-11-03T10:00:00Z')).ready).toBe(true);
  });

  it('checks a split adds up to 100', () => {
    expect(isValidSplit({ a: 60, b: 25, c: 15 })).toBe(true);
    expect(isValidSplit({ a: 60, b: 25, c: 20 })).toBe(false);
  });
});

describe('money data', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    await initDatabase();
  });

  it('seeds the two built-in savings goals once', async () => {
    await initDatabase();
    const goals = await db.savingsGoals.orderBy('order').toArray();
    expect(goals.map((g) => g.kind)).toEqual(['buffer', 'month']);
  });

  it('keeps one allowance per month and remembers last month’s', async () => {
    await setAllowance('2026-10', 1800);
    await setAllowance('2026-11', 2000);
    await setAllowance('2026-11', 2100);
    expect(await db.incomes.where('month').equals('2026-11').count()).toBe(1);
    expect(await previousAllowance('2026-11')).toBe(1800);
  });

  it('builds the month view: plan, spending, goals', async () => {
    await setAllowance('2026-11', 2000);
    await addHustleIncome(300, '2026-11-05');
    await addExpense({ amount: 100, category: 'food', date: '2026-11-03' });
    await addExpense({ amount: 60, category: 'eatingOut', date: '2026-11-04' });
    await addExpense({ amount: 999, category: 'food', date: '2026-10-30' }); // other month, ignored
    await moveSavings(400);

    const view = await loadMoney('2026-11');
    // allowance 2000 → 1200/500/300; hustle 300 → savings 150, reinvest 90, fun 60
    expect(view.plan).toEqual({ needs: 1200, fun: 560, savings: 450, reinvest: 90 });
    expect(view.spent).toEqual({ needs: 100, fun: 60, reinvest: 0 });
    expect(view.bufferFull).toBe(false);
    expect(view.goals[0].saved).toBe(400);
    // "one month of needs" sizes itself from the needs budget
    expect(view.goals[1].target).toBe(1200);
  });

  it('respects your own need/fun choice for a category', async () => {
    await db.settings.put({ key: 'categoryKinds', value: { subscriptions: 'need' } });
    await setAllowance('2026-11', 1000);
    await addExpense({ amount: 40, category: 'subscriptions', date: '2026-11-02' });
    const view = await loadMoney('2026-11');
    expect(view.spent.needs).toBe(40);
    expect(view.spent.fun).toBe(0);
  });

  it('buying from the 48-hour list logs an expense; skipping does not', async () => {
    const a = await addWaitItem('Headphones', 300, 'clothes');
    const b = await addWaitItem('Jacket', 250, 'clothes');
    await decideWaitItem(a, 'bought');
    await decideWaitItem(b, 'skipped');
    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({ amount: 300, category: 'clothes', note: 'Headphones' });
  });
});
