/**
 * Today's moves in the database: picked once per day (so they don't shuffle
 * while you look at them), then ticked, swapped or self-completed.
 */
import { subDays } from 'date-fns';
import { loadCoachContext } from '../features/coach/loadCoachContext';
import { autoComplete, learnFromHistory, pickMoves, proposeMoves, toStored, type Move } from '../lib/coach';
import { toISODate } from '../lib/dates';
import { db, type DayMoves } from './schema';

/**
 * Makes sure today has its moves: picks them the first time the app opens
 * today, and on later opens ticks any self-completing ones that are done.
 */
export async function ensureTodayMoves(now: Date = new Date()): Promise<DayMoves> {
  const date = toISODate(now);
  const candidates = proposeMoves(await loadCoachContext(now));
  const existing = await db.moves.get(date);

  if (existing) {
    const updated = autoComplete(existing, candidates);
    if (updated) await db.moves.put(updated);
    return updated ?? existing;
  }

  const past = await db.moves.where('date').between(toISODate(subDays(now, 8)), date, true, false).toArray();
  const history = learnFromHistory(past, date);
  const carriedIds = new Set(history.carried.map((m) => m.id));
  const day: DayMoves = {
    date,
    generatedAt: now.toISOString(),
    moves: pickMoves(candidates, history).map((m) => toStored(m, carriedIds.has(m.id))),
  };
  await db.moves.put(day);
  return day;
}

/** Ticks a move done, or back to open. */
export async function toggleMove(date: string, id: string) {
  await db.transaction('rw', db.moves, async () => {
    const day = await db.moves.get(date);
    if (!day) return;
    day.moves = day.moves.map((m) => (m.id === id ? { ...m, status: m.status === 'done' ? 'open' : 'done' } : m));
    await db.moves.put(day);
  });
}

/**
 * Swaps a move for the next best one: the old one is marked skipped (so the
 * coach learns), and the replacement goes in its place. Returns false if
 * there was nothing else to suggest.
 */
export async function swapMove(date: string, id: string, now: Date = new Date()): Promise<boolean> {
  const candidates = proposeMoves(await loadCoachContext(now));
  const past = await db.moves.where('date').below(date).reverse().limit(8).toArray();
  return db.transaction('rw', db.moves, async () => {
    const day = await db.moves.get(date);
    if (!day) return false;
    const used = new Set(day.moves.map((m) => m.id));
    const history = learnFromHistory(past, date);
    const next: Move | undefined = pickMoves(candidates.filter((c) => !used.has(c.id)), history, 1)[0];
    if (!next) return false;

    const index = day.moves.findIndex((m) => m.id === id);
    const skipped = { ...day.moves[index], status: 'skipped' as const };
    // The skipped one moves to the end (still counted for learning), the new one takes its place.
    day.moves = [...day.moves.slice(0, index), toStored(next, false), ...day.moves.slice(index + 1), skipped];
    await db.moves.put(day);
    return true;
  });
}
