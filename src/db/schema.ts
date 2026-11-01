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

// ---------- Week & Today (stage 3) ----------

/** The part of life a block belongs to. Drives its color, icon and which ring it feeds. */
export type Pillar = 'school' | 'gym' | 'hustle' | 'review' | 'rest' | 'other';

/** One block in the weekly template, e.g. "Gym, Sunday 17:00, 75 min". */
export interface TemplateBlock {
  id?: number;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  title: string;
  pillar: Pillar;
  /** "HH:mm", or null for an untimed block like "Rest". */
  start: string | null;
  minutes: number;
}

/** A real class. Shows as a locked school block on its day. */
export interface ClassSlot {
  id?: number;
  name: string;
  day: number;
  start: string;
  end: string;
}

/** A block ticked off on a given day, with a snapshot so later template edits don't rewrite history. */
export interface DoneBlock {
  /** "tpl-12" for a template block, "class-3" for a class. */
  key: string;
  pillar: Pillar;
  minutes: number;
}

/** What happened on one calendar day. */
export interface DayLog {
  /** "YYYY-MM-DD" */
  date: string;
  /** "The one thing that matters today" */
  focus: string;
  done: DoneBlock[];
}

// ---------- Side hustle (stage 4) ----------

export type OrderStatus = 'lead' | 'paid' | 'building' | 'delivered' | 'reviewed';
export type Occasion = 'anniversary' | 'birthday' | 'proposal' | 'business' | 'other';
export type PackageId = 'basic' | 'premium' | 'business';

/** One gift-website order on the board. */
export interface Order {
  id?: number;
  client: string;
  occasion: Occasion;
  package: PackageId;
  rush: boolean;
  price: number;
  /** ISO date, or null when there's no deadline yet. */
  deadline: string | null;
  notes: string;
  status: OrderStatus;
  paid: boolean;
  paidAt?: string;
  /** The side-hustle income entry created in Money when it was paid. */
  incomeId?: number;
  createdAt: string;
}

/** A stretch of hustle work from the timer (or added by hand). */
export interface HustleSession {
  id?: number;
  /** ISO timestamp */
  start: string;
  /** ISO timestamp, or null while the timer is running. */
  end: string | null;
  orderId?: number;
}

// ---------- Gym (stage 5) ----------

export type WorkoutType = 'upper' | 'lower' | 'full' | 'cardio';

/** One exercise in a workout: sets × reps × weight, or minutes for cardio. */
export interface ExerciseEntry {
  name: string;
  sets: number;
  reps: number;
  /** kg; 0 for bodyweight */
  weight: number;
  /** Cardio only */
  minutes?: number;
}

export interface Workout {
  id?: number;
  date: string;
  type: WorkoutType;
  exercises: ExerciseEntry[];
  notes: string;
  createdAt: string;
}

// ---------- Weekly review (stage 7) ----------

/** The four areas a weekly review checks and sets goals for. */
export type ReviewPillar = 'school' | 'gym' | 'hustle' | 'money';

/** One Saturday review, saved per week. */
export interface WeeklyReview {
  /** ISO date of the Sunday that starts the reviewed week. */
  weekStart: string;
  completedAt: string;
  /** Did I hit the minimum? Pre-filled from the week's data, adjustable by hand. */
  minimums: Record<ReviewPillar, boolean>;
  /** The numbers behind the minimums, as they were when the review was saved. */
  stats: { schoolDone: number; schoolPlanned: number; gymSessions: number; hustleHours: number };
  wins: string;
  obstacles: string;
  /** Next week's single most important goal per pillar. */
  nextGoals: Record<ReviewPillar, string>;
}

export class LevelUpDB extends Dexie {
  settings!: Table<SettingRow, string>;
  incomes!: Table<Income, number>;
  expenses!: Table<Expense, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  savingsMoves!: Table<SavingsMove, number>;
  waitlist!: Table<WaitItem, number>;
  moneyChecks!: Table<MoneyCheck, string>;
  templateBlocks!: Table<TemplateBlock, number>;
  classes!: Table<ClassSlot, number>;
  days!: Table<DayLog, string>;
  orders!: Table<Order, number>;
  hustleSessions!: Table<HustleSession, number>;
  workouts!: Table<Workout, number>;
  reviews!: Table<WeeklyReview, string>;

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

    // v3 — Stage 3: weekly template, classes, daily focus + ticked blocks
    this.version(3).stores({
      templateBlocks: '++id, day',
      classes: '++id, day',
      days: 'date',
    });

    // v4 — Stage 4: side hustle orders and the hours timer
    this.version(4).stores({
      orders: '++id, status, createdAt',
      hustleSessions: '++id, start',
    });

    // v5 — Stage 5: workouts
    this.version(5).stores({
      workouts: '++id, date, type',
    });

    // v6 — YouTube dropped from the app: remove its template blocks and ticks.
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('templateBlocks')
          .filter((b) => b.pillar === 'youtube')
          .delete();
        await tx
          .table('days')
          .toCollection()
          .modify((d: DayLog) => {
            d.done = d.done.filter((x) => (x.pillar as string) !== 'youtube');
          });
      });

    // v7 — Stage 7: weekly reviews
    this.version(7).stores({
      reviews: 'weekStart',
    });
  }
}

export const db = new LevelUpDB();
