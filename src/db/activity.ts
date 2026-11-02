/**
 * Noting when you use Level Up, for "My rhythm". Only two times a day are
 * kept: the first and the last. Nothing else about what you did.
 */
import { subHours } from 'date-fns';
import { toISODate } from '../lib/dates';
import { db } from './schema';

/** Days run 04:00 → 04:00: using the app at 01:30 belongs to the evening before. */
export const DAY_STARTS_AT_HOUR = 4;

export const activityDayOf = (at: Date) => toISODate(subHours(at, DAY_STARTS_AT_HOUR));

/** Records "you're here now": sets the day's first time once, and moves its last time forward. */
export async function noteActivity(at: Date = new Date()) {
  const date = activityDayOf(at);
  const iso = at.toISOString();
  await db.transaction('rw', db.activity, async () => {
    const day = await db.activity.get(date);
    if (!day) await db.activity.put({ date, firstAt: iso, lastAt: iso });
    else if (iso > day.lastAt) await db.activity.update(date, { lastAt: iso });
  });
}
