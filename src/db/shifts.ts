/**
 * The weekly "1% shift": offered once per week (Sunday–Saturday), then
 * accepted or skipped. Skipping is fine: the coach just learns not to push
 * that one for a couple of weeks.
 */
import { loadRhythm } from '../features/rhythm/loadRhythm';
import { suggestShift } from '../lib/rhythm';
import { db, type WeeklyShift } from './schema';

/** Offers this week's shift if there isn't one yet (and there's something worth shifting). */
export async function ensureWeekShift(now: Date = new Date()): Promise<WeeklyShift | undefined> {
  const data = await loadRhythm(now);
  if (data.shift) return data.shift;
  const suggestion = suggestShift(data.rhythm, data.profile, data.gymBlockStart, data.recentShifts);
  if (!suggestion) return undefined;
  const shift: WeeklyShift = {
    weekStart: data.weekStart,
    kind: suggestion.kind,
    target: suggestion.target,
    from: suggestion.from,
    weekday: suggestion.weekday,
    status: 'offered',
  };
  await db.shifts.put(shift);
  return shift;
}

/**
 * Accepts the shift. A gym-time shift moves your gym blocks on the Week
 * screen to when you really train; the others become daily coach moves.
 */
export async function acceptShift(weekStart: string) {
  await db.transaction('rw', db.shifts, db.templateBlocks, async () => {
    const shift = await db.shifts.get(weekStart);
    if (!shift) return;
    if (shift.kind === 'gymTime' && shift.target) {
      await db.templateBlocks.filter((b) => b.pillar === 'gym' && b.start !== null).modify({ start: shift.target });
    }
    await db.shifts.update(weekStart, { status: 'accepted', decidedAt: new Date().toISOString() });
  });
}

export function skipShift(weekStart: string) {
  return db.shifts.update(weekStart, { status: 'skipped', decidedAt: new Date().toISOString() });
}
