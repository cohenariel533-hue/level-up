/**
 * Money math. Pure functions only (no database, no React), so every rule
 * here is easy to test in tests/money.test.ts. All amounts are in shekels.
 */

/** How allowance is divided, in percent. Must add up to 100. */
export interface BudgetSplit {
  needs: number;
  fun: number;
  savings: number;
}

/** How side-hustle income is divided until the safety buffer is full, in percent. */
export interface HustleSplit {
  savings: number;
  reinvest: number;
  fun: number;
}

export const DEFAULT_BUDGET_SPLIT: BudgetSplit = { needs: 60, fun: 25, savings: 15 };
export const DEFAULT_HUSTLE_SPLIT: HustleSplit = { savings: 50, reinvest: 30, fun: 20 };
export const SAFETY_BUFFER_TARGET = 1500;

/** The 48-hour rule: "fun" purchases above this wait two days. */
export const WAIT_THRESHOLD = 150;
export const WAIT_HOURS = 48;

/** What a category's spending counts against. */
export type SpendKind = 'need' | 'fun' | 'reinvest';

/** This month's budget per bucket. */
export interface MonthPlan {
  needs: number;
  fun: number;
  savings: number;
  reinvest: number;
}

const part = (amount: number, percent: number) => (amount * percent) / 100;

/**
 * Splits the month's income into buckets.
 * - Allowance always follows the normal split (60/25/15 by default).
 * - Hustle income follows the hustle split (50/30/20) until the safety
 *   buffer is full; after that it follows the normal split too.
 * Results are rounded to whole shekels.
 */
export function planMonth(
  allowance: number,
  hustle: number,
  split: BudgetSplit,
  hustleSplit: HustleSplit,
  bufferFull: boolean,
): MonthPlan {
  const plan: MonthPlan = {
    needs: part(allowance, split.needs),
    fun: part(allowance, split.fun),
    savings: part(allowance, split.savings),
    reinvest: 0,
  };

  if (bufferFull) {
    plan.needs += part(hustle, split.needs);
    plan.fun += part(hustle, split.fun);
    plan.savings += part(hustle, split.savings);
  } else {
    plan.savings += part(hustle, hustleSplit.savings);
    plan.reinvest += part(hustle, hustleSplit.reinvest);
    plan.fun += part(hustle, hustleSplit.fun);
  }

  return {
    needs: Math.round(plan.needs),
    fun: Math.round(plan.fun),
    savings: Math.round(plan.savings),
    reinvest: Math.round(plan.reinvest),
  };
}

export interface SpentByKind {
  needs: number;
  fun: number;
  reinvest: number;
}

/** Adds up expenses per bucket, using `kindOf` to look up each category's bucket. */
export function sumByKind(
  expenses: { amount: number; category: string }[],
  kindOf: (category: string) => SpendKind,
): SpentByKind {
  const spent: SpentByKind = { needs: 0, fun: 0, reinvest: 0 };
  for (const e of expenses) {
    const kind = kindOf(e.category);
    if (kind === 'need') spent.needs += e.amount;
    else if (kind === 'fun') spent.fun += e.amount;
    else spent.reinvest += e.amount;
  }
  return spent;
}

export interface GoalFill<T> {
  goal: T;
  target: number;
  saved: number;
  done: boolean;
}

/**
 * Savings goals fill in order, like a waterfall: the first goal fills up
 * completely before money counts toward the second, and so on.
 * `extra` is anything saved beyond all goals.
 */
export function fillGoals<T extends { target: number }>(goals: T[], totalSaved: number) {
  let remaining = Math.max(totalSaved, 0);
  const items: GoalFill<T>[] = goals.map((goal) => {
    const saved = Math.min(remaining, Math.max(goal.target, 0));
    remaining -= saved;
    return { goal, target: goal.target, saved, done: goal.target > 0 && saved >= goal.target };
  });
  return { items, extra: remaining };
}

/** A monthly amount scaled to one week, for the Saturday check. */
export function weeklyShare(monthlyAmount: number, daysInMonth: number): number {
  return Math.round((monthlyAmount * 7) / daysInMonth);
}

/** How long until a 48-hour-list item can be decided. */
export function waitStatus(addedAt: string, now: Date = new Date()) {
  const msLeft = WAIT_HOURS * 3_600_000 - (now.getTime() - new Date(addedAt).getTime());
  // Clamp to 0–48: a clock read a moment before the item was added shouldn't show "49h".
  const hoursLeft = Math.min(WAIT_HOURS, Math.max(0, Math.ceil(msLeft / 3_600_000)));
  return { ready: msLeft <= 0, hoursLeft };
}

/**
 * Reads an amount typed on a phone. Accepts "45", "45.5", "45,50", "₪1,200".
 * Returns null for anything that isn't a positive number.
 */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/[₪\s]/g, '');
  // "45,50" is a decimal comma; "1,200" is a thousands separator.
  t = /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  if (!/^\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? Math.round(n * 100) / 100 : null;
}

/** True when all parts are whole, non-negative and add up to 100. */
export function isValidSplit(split: object): boolean {
  const values = Object.values(split) as number[];
  return values.every((v) => Number.isInteger(v) && v >= 0) && values.reduce((a, b) => a + b, 0) === 100;
}
