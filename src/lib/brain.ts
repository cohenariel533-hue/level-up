/**
 * "Plan my week" with Claude: what Level Up sends (a short summary) and what
 * comes back (a plan). Claude runs on your Mac through Study Planner; see
 * levelup_brain.py there. This file has no database code: the summary is
 * built in features/brain/loadBrainSummary.ts.
 */
import { addDays, parseISO } from 'date-fns';
import { z } from 'zod';
import { toISODate, weekStart } from './dates';

/** The week to plan: on Saturday, the coming week; any other day, the current one. */
export function planWeekStart(now: Date = new Date()): string {
  const start = weekStart(now);
  return toISODate(now.getDay() === 6 ? addDays(start, 7) : start);
}

export const weekDates = (weekStartISO: string) =>
  Array.from({ length: 7 }, (_, i) => toISODate(addDays(parseISO(weekStartISO), i)));

// ---------- what comes back ----------

const pillar = z.enum(['school', 'gym', 'hustle', 'money', 'life']);

export const brainPlanSchema = z.object({
  headline: z.string(),
  encouragement: z.string(),
  focus: z.object({ school: z.string(), gym: z.string(), hustle: z.string(), money: z.string() }),
  days: z.array(z.object({ day: z.number().int().min(0).max(6), note: z.string() })),
  tasks: z.array(z.object({ pillar, title: z.string(), minutes: z.number(), why: z.string() })).min(1),
  habit: z.object({ title: z.string(), why: z.string() }),
  watchOut: z.array(z.string()),
});

export type BrainPlan = z.infer<typeof brainPlanSchema>;
export type BrainTask = BrainPlan['tasks'][number];

/** The id a plan task gets as a daily move, so the coach knows which ones are done. */
export const brainMoveId = (weekStartISO: string, index: number) => `brain:${weekStartISO}-${index}`;

// ---------- talking to Study Planner ----------

/** The plan address next to the feed address: …/api/levelup/feed → …/api/levelup/plan */
export const planUrlFrom = (feedUrl: string) => feedUrl.replace(/\/feed\/?$/, '/plan');

export type BrainError = 'not-set-up' | 'unreachable' | 'wrong-key' | 'busy' | 'claude' | 'timeout' | 'bad-plan';

export type PlanResult = { ok: true; plan: BrainPlan } | { ok: false; reason: BrainError; detail?: string };

const POLL_MS = 3000;
const GIVE_UP_MS = 5 * 60_000;

async function call(url: string, key: string, init: RequestInit = {}): Promise<Response | 'unreachable'> {
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${key}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch {
    return 'unreachable';
  }
}

/**
 * Sends the summary, then checks every 3 seconds until Claude is done (or
 * 5 minutes pass). `onWaiting` gets the seconds so far, for the progress line.
 * Never throws: problems come back as a reason the screen can explain.
 */
export async function requestPlan(
  feedUrl: string,
  key: string,
  summary: object,
  onWaiting: (seconds: number) => void = () => {},
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<PlanResult> {
  if (!feedUrl || !key) return { ok: false, reason: 'not-set-up' };
  const base = planUrlFrom(feedUrl);

  const started = await call(base, key, { method: 'POST', body: JSON.stringify(summary) });
  if (started === 'unreachable') return { ok: false, reason: 'unreachable' };
  if (started.status === 401) return { ok: false, reason: 'wrong-key' };
  if (started.status === 429) return { ok: false, reason: 'busy', detail: (await started.json().catch(() => ({}))).error };
  if (!started.ok) return { ok: false, reason: 'claude', detail: `HTTP ${started.status}` };
  const { job } = (await started.json()) as { job: string };

  const begin = Date.now();
  while (Date.now() - begin < GIVE_UP_MS) {
    await sleep(POLL_MS);
    onWaiting(Math.round((Date.now() - begin) / 1000));
    const res = await call(`${base}/${job}`, key);
    if (res === 'unreachable') continue; // a hiccup on the network: keep waiting
    if (!res.ok) return { ok: false, reason: res.status === 401 ? 'wrong-key' : 'claude', detail: `HTTP ${res.status}` };
    const status = (await res.json()) as { status: string; plan?: unknown; error?: string };
    if (status.status === 'error') return { ok: false, reason: 'claude', detail: status.error };
    if (status.status === 'done') {
      const parsed = brainPlanSchema.safeParse(status.plan);
      return parsed.success ? { ok: true, plan: parsed.data } : { ok: false, reason: 'bad-plan' };
    }
  }
  return { ok: false, reason: 'timeout' };
}
