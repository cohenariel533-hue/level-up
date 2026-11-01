import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  parseISO,
  startOfWeek,
} from 'date-fns';

/** Weeks run Sunday → Saturday everywhere in the app. */
export const WEEK_STARTS_ON = 0 as const;

export const weekStart = (d: Date = new Date()) => startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });
export const weekEnd = (d: Date = new Date()) => endOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });

/**
 * A local calendar date as "YYYY-MM-DD". Uses local time, not UTC, so a
 * workout logged at 01:00 in Israel still counts for the right day.
 */
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayISO = () => toISODate(new Date());

/** e.g. "Sunday, 1 November" */
export const formatLongDate = (d: Date = new Date()) => format(d, 'EEEE, d MMMM');

/** e.g. "1 Nov 2026" */
export const formatShortDate = (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'd MMM yyyy');

/** e.g. "Wed 4 Nov" */
export const formatDayShort = (iso: string) => format(parseISO(iso), 'EEE d MMM');

// ---------- Months, as "YYYY-MM" keys ----------

export const monthKey = (d: Date = new Date()) => format(d, 'yyyy-MM');
const monthStart = (key: string) => parseISO(`${key}-01`);

/** First and last day of a month as ISO dates, for database range queries. */
export function monthBounds(key: string) {
  const start = monthStart(key);
  return { first: toISODate(start), last: toISODate(endOfMonth(start)) };
}

export const shiftMonth = (key: string, delta: number) => monthKey(addMonths(monthStart(key), delta));

/** e.g. "November 2026" */
export const formatMonth = (key: string) => format(monthStart(key), 'MMMM yyyy');

export const daysInMonthOf = (key: string) => getDaysInMonth(monthStart(key));

/** Whole calendar days between an ISO date/timestamp and now (0 = today). */
export const daysSince = (iso: string, now: Date = new Date()) => differenceInCalendarDays(now, parseISO(iso));

export type GreetingKey = 'morning' | 'afternoon' | 'evening' | 'night';

export function greetingFor(hour: number): GreetingKey {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}
