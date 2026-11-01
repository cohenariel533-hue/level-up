import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense, type Income, type SavingsGoal, type WaitItem } from '../../db/schema';
import { getSetting } from '../../db/settings';
import { daysInMonthOf, monthBounds } from '../../lib/dates';
import {
  fillGoals,
  planMonth,
  sumByKind,
  type BudgetSplit,
  type GoalFill,
  type HustleSplit,
  type MonthPlan,
  type SpentByKind,
} from '../../lib/money';
import { kindOf } from './categories';

/** A savings goal with its target worked out (the "month of needs" goal sizes itself). */
export interface GoalView extends SavingsGoal {
  target: number;
  /** True while the month-of-needs goal has nothing to size from yet. */
  unsized: boolean;
}

/** Everything the Money screen shows for one month. */
export interface MoneyView {
  month: string;
  allowance: Income | undefined;
  hustlePayments: Income[];
  hustleTotal: number;
  bufferFull: boolean;
  plan: MonthPlan;
  spent: SpentByKind;
  expenses: Expense[];
  savedThisMonth: number;
  totalSaved: number;
  goals: GoalFill<GoalView>[];
  extraSaved: number;
  waitlist: WaitItem[];
  notSpentByWaiting: number;
  split: BudgetSplit;
  hustleSplit: HustleSplit;
  kinds: Record<string, 'need' | 'fun'>;
  daysInMonth: number;
}

/**
 * Live view of one month's money. Re-computes whenever any money data or
 * money setting changes. Returns undefined while loading.
 */
export function useMoney(month: string): MoneyView | undefined {
  return useLiveQuery(() => loadMoney(month), [month]);
}

export async function loadMoney(month: string): Promise<MoneyView> {
  const { first, last } = monthBounds(month);

  const [incomes, expenses, goalRows, moves, waitlist, split, hustleSplit, kinds] = await Promise.all([
    db.incomes.where('month').equals(month).toArray(),
    db.expenses.where('date').between(first, last, true, true).toArray(),
    db.savingsGoals.orderBy('order').toArray(),
    db.savingsMoves.toArray(),
    db.waitlist.toArray(),
    getSetting('budgetSplit'),
    getSetting('hustleSplit'),
    getSetting('categoryKinds'),
  ]);

  const allowance = incomes.find((i) => i.source === 'allowance');
  const hustlePayments = incomes.filter((i) => i.source === 'hustle').sort((a, b) => b.date.localeCompare(a.date));
  const hustleTotal = hustlePayments.reduce((sum, i) => sum + i.amount, 0);

  // All-time savings balance; goals fill from it in order.
  const totalSaved = moves.reduce((sum, m) => sum + m.amount, 0);
  const savedThisMonth = moves.filter((m) => m.date >= first && m.date <= last).reduce((sum, m) => sum + m.amount, 0);

  // Hustle income uses its own split until the safety buffer goal is reached.
  const buffer = goalRows.find((g) => g.kind === 'buffer');
  const bufferFull = buffer ? totalSaved >= (buffer.target ?? 0) : true;

  const plan = planMonth(allowance?.amount ?? 0, hustleTotal, split, hustleSplit, bufferFull);

  const goalViews: GoalView[] = goalRows.map((g) => {
    const auto = g.kind === 'month' && g.target === null;
    const target = auto ? plan.needs : (g.target ?? 0);
    return { ...g, target, unsized: auto && target === 0 };
  });
  const { items: goals, extra: extraSaved } = fillGoals(goalViews, totalSaved);

  return {
    month,
    allowance,
    hustlePayments,
    hustleTotal,
    bufferFull,
    plan,
    spent: sumByKind(expenses, (c) => kindOf(c, kinds)),
    expenses: expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    savedThisMonth,
    totalSaved,
    goals,
    extraSaved,
    waitlist: waitlist.filter((w) => w.status === 'waiting').sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
    notSpentByWaiting: waitlist.filter((w) => w.status === 'skipped').reduce((sum, w) => sum + w.price, 0),
    split,
    hustleSplit,
    kinds,
    daysInMonth: daysInMonthOf(month),
  };
}
