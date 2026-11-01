import { differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';

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
