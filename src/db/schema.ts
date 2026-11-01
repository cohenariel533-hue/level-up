import Dexie, { type Table } from 'dexie';

/**
 * Level Up's local database (IndexedDB, via Dexie). Nothing leaves the device.
 *
 * Conventions for every table:
 * - Dates are ISO strings ("2026-11-01", or a full timestamp), never Date
 *   objects, so JSON backups restore exactly.
 * - Money is a plain number of shekels.
 *
 * Adding tables later: each build stage adds a new `this.version(n)` block
 * below with only the new or changed tables. Never edit an old block —
 * Dexie uses them to upgrade existing data safely.
 */

/** One app setting, stored as a key → value pair (see settings.ts). */
export interface SettingRow {
  key: string;
  value: unknown;
}

// ---------- Money (stage 2) ----------

export interface Income {
  id?: number;
  /** "YYYY-MM": the month this income belongs to. */
  month: string;
  /** Allowance is one entry per month; hustle income can be many payments. */
  source: 'allowance' | 'hustle';
  amount: number;
  date: string;
  note?: string;
}

export interface Expense {
  id?: number;
  date: string;
  amount: number;
  /** A category id from features/money/categories.ts */
  category: string;
  note?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id?: number;
  name: string;
  /** null = sized automatically (the "one month of needs" goal). */
  target: number | null;
  /** buffer and month are the two built-in goals; custom ones come after. */
  kind: 'buffer' | 'month' | 'custom';
  order: number;
}

/** Money moved into savings (positive) or taken out (negative). */
export interface SavingsMove {
  id?: number;
  date: string;
  amount: number;
  note?: string;
}

/** An item on the 48-hour list. */
export interface WaitItem {
  id?: number;
  name: string;
  price: number;
  category: string;
  addedAt: string;
  status: 'waiting' | 'bought' | 'skipped';
  decidedAt?: string;
}

/** The answers from one Saturday money check. */
export interface MoneyCheck {
  /** ISO date of the Sunday that starts the week. */
  weekStart: string;
  completedAt: string;
  spent: number;
  planned: number;
  movedSavings: boolean;
  biggestLeak: string;
  note: string;
}

export class LevelUpDB extends Dexie {
  settings!: Table<SettingRow, string>;
  incomes!: Table<Income, number>;
  expenses!: Table<Expense, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  savingsMoves!: Table<SavingsMove, number>;
  waitlist!: Table<WaitItem, number>;
  moneyChecks!: Table<MoneyCheck, string>;

  constructor(name = 'level-up') {
    super(name);

    // v1 — Stage 1: app settings (theme, exam mode, last backup date…)
    this.version(1).stores({
      settings: 'key',
    });

    // v2 — Stage 2: money
    this.version(2).stores({
      incomes: '++id, month, source',
      expenses: '++id, date, category',
      savingsGoals: '++id, order',
      savingsMoves: '++id, date',
      waitlist: '++id, status, addedAt',
      moneyChecks: 'weekStart',
    });
  }
}

export const db = new LevelUpDB();
