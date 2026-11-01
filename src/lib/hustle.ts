/**
 * Side-hustle math: packages, timer durations, stats and the 90-day goal.
 * Pure functions only, tested in tests/hustle.test.ts.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { HustleSession, Order, OrderStatus, PackageId } from '../db/schema';
import { toISODate } from './dates';

export const PACKAGE_PRICES: Record<Exclude<PackageId, 'business'>, number> = { basic: 149, premium: 299 };
export const RUSH_FEE = 80;

/** The board's columns, left to right. */
export const ORDER_STATUSES: OrderStatus[] = ['lead', 'paid', 'building', 'delivered', 'reviewed'];

/** The 90-day goal: 10 customers and ₪1,500 by 31 Jan 2027. */
export const HUSTLE_GOAL = { customers: 10, earned: 1500, start: '2026-11-01', end: '2027-01-31' };

/** Suggested price for a package; business sites are priced by hand (null). */
export function suggestedPrice(pkg: PackageId, rush: boolean): number | null {
  if (pkg === 'business') return null;
  return PACKAGE_PRICES[pkg] + (rush ? RUSH_FEE : 0);
}

export const nextStatus = (status: OrderStatus): OrderStatus | null =>
  ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? null;

/** Length of a session in minutes; a running one counts up to `now`. */
export function sessionMinutes(session: HustleSession, now: Date = new Date()): number {
  const end = session.end ? new Date(session.end) : now;
  return Math.max(0, (end.getTime() - new Date(session.start).getTime()) / 60_000);
}

/** Timer minutes per calendar day (by the day each session started). */
export function minutesByDate(sessions: HustleSession[], now: Date = new Date()): Record<string, number> {
  const byDate: Record<string, number> = {};
  for (const s of sessions) {
    const date = toISODate(new Date(s.start));
    byDate[date] = (byDate[date] ?? 0) + sessionMinutes(s, now);
  }
  return byDate;
}

/** 2_533_000 ms → "0:42:13" */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Distinct paying customers (same name, any case, counts once). */
const customerCount = (orders: Order[]) => new Set(orders.map((o) => o.client.trim().toLowerCase())).size;

export interface HustleStats {
  totalEarned: number;
  earnedThisMonth: number;
  customers: number;
  totalHours: number;
  /** null until some time has been logged. */
  perHour: number | null;
}

export function hustleStats(orders: Order[], sessions: HustleSession[], now: Date = new Date()): HustleStats {
  const paid = orders.filter((o) => o.paid);
  const month = toISODate(now).slice(0, 7);
  const totalEarned = paid.reduce((sum, o) => sum + o.price, 0);
  const totalHours = sessions.reduce((sum, s) => sum + sessionMinutes(s, now), 0) / 60;
  return {
    totalEarned,
    earnedThisMonth: paid.filter((o) => (o.paidAt ?? '').startsWith(month)).reduce((sum, o) => sum + o.price, 0),
    customers: customerCount(paid),
    totalHours,
    perHour: totalHours > 0 ? Math.round(totalEarned / totalHours) : null,
  };
}

export interface GoalProgress {
  customers: number;
  earned: number;
  daysLeft: number;
  /** Where you'd be today on an even pace, as a 0–1 share of the way. */
  expectedShare: number;
  onPace: boolean;
}

/** Progress toward the 90-day goal, counting orders paid inside the goal window. */
export function goalProgress(orders: Order[], now: Date = new Date()): GoalProgress {
  const inWindow = orders.filter(
    (o) => o.paid && o.paidAt && o.paidAt.slice(0, 10) >= HUSTLE_GOAL.start && o.paidAt.slice(0, 10) <= HUSTLE_GOAL.end,
  );
  const customers = customerCount(inWindow);
  const earned = inWindow.reduce((sum, o) => sum + o.price, 0);

  const start = parseISO(HUSTLE_GOAL.start);
  const end = parseISO(HUSTLE_GOAL.end);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const elapsed = Math.min(Math.max(differenceInCalendarDays(now, start) + 1, 0), totalDays);
  const expectedShare = elapsed / totalDays;
  const share = Math.min(customers / HUSTLE_GOAL.customers, earned / HUSTLE_GOAL.earned);

  return {
    customers,
    earned,
    daysLeft: Math.max(differenceInCalendarDays(end, now), 0),
    expectedShare,
    onPace: share >= expectedShare,
  };
}

/** Days until a deadline: negative = past it, 0 = today. */
export const daysUntil = (deadline: string, now: Date = new Date()) =>
  differenceInCalendarDays(parseISO(deadline), now);
