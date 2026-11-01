/**
 * Everything that writes money data. Screens call these instead of touching
 * the tables directly, so the rules live in one place.
 */
import { todayISO } from '../lib/dates';
import { db, type Expense, type MoneyCheck } from './schema';

// ---------- Expenses ----------

export function addExpense(e: Omit<Expense, 'id' | 'createdAt'>) {
  return db.expenses.add({ ...e, createdAt: new Date().toISOString() });
}

export function updateExpense(id: number, changes: Partial<Omit<Expense, 'id' | 'createdAt'>>) {
  return db.expenses.update(id, changes);
}

export function deleteExpense(id: number) {
  return db.expenses.delete(id);
}

// ---------- Income ----------

/** Sets the allowance for a month (one entry per month). 0 removes it. */
export async function setAllowance(month: string, amount: number) {
  const existing = await db.incomes
    .where('month')
    .equals(month)
    .filter((i) => i.source === 'allowance')
    .first();

  if (amount <= 0) {
    if (existing?.id) await db.incomes.delete(existing.id);
    return;
  }
  await db.incomes.put({
    ...existing,
    month,
    source: 'allowance',
    amount,
    date: existing?.date ?? `${month}-01`,
  });
}

/** The most recent allowance before this month, to offer "same as last month". */
export async function previousAllowance(month: string): Promise<number | null> {
  const last = await db.incomes
    .where('month')
    .below(month)
    .reverse()
    .filter((i) => i.source === 'allowance')
    .first();
  return last?.amount ?? null;
}

export function addHustleIncome(amount: number, date: string, note?: string) {
  return db.incomes.add({ month: date.slice(0, 7), source: 'hustle', amount, date, note });
}

export function deleteIncome(id: number) {
  return db.incomes.delete(id);
}

// ---------- Savings ----------

/** Positive = moved into savings, negative = taken out. */
export function moveSavings(amount: number, note?: string) {
  return db.savingsMoves.add({ date: todayISO(), amount, note });
}

export async function addGoal(name: string, target: number) {
  const last = await db.savingsGoals.orderBy('order').last();
  return db.savingsGoals.add({ name, target, kind: 'custom', order: (last?.order ?? 0) + 1 });
}

export function updateGoal(id: number, changes: { name?: string; target?: number | null }) {
  return db.savingsGoals.update(id, changes);
}

export function deleteGoal(id: number) {
  return db.savingsGoals.delete(id);
}

// ---------- 48-hour list ----------

export function addWaitItem(name: string, price: number, category: string) {
  return db.waitlist.add({ name, price, category, addedAt: new Date().toISOString(), status: 'waiting' });
}

/** Buy logs it as today's expense; skip just closes it (and counts as money not spent). */
export async function decideWaitItem(id: number, decision: 'bought' | 'skipped') {
  await db.transaction('rw', db.waitlist, db.expenses, async () => {
    const item = await db.waitlist.get(id);
    if (!item) return;
    await db.waitlist.update(id, { status: decision, decidedAt: new Date().toISOString() });
    if (decision === 'bought') {
      await addExpense({ date: todayISO(), amount: item.price, category: item.category, note: item.name });
    }
  });
}

export function deleteWaitItem(id: number) {
  return db.waitlist.delete(id);
}

// ---------- Saturday money check ----------

export function saveMoneyCheck(check: MoneyCheck) {
  return db.moneyChecks.put(check);
}
