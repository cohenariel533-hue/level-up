/** Claude's weekly plans: asking for one, and keeping it on the phone. */
import { useLiveQuery } from 'dexie-react-hooks';
import { loadBrainSummary } from '../features/brain/loadBrainSummary';
import { brainPlanSchema, planWeekStart, requestPlan, type BrainPlan, type PlanResult } from '../lib/brain';
import { db } from './schema';
import { getSetting } from './settings';

/** Builds the summary, asks Claude (through Study Planner) and stores the plan for that week. */
export async function makeWeeklyPlan(onWaiting?: (seconds: number) => void): Promise<PlanResult> {
  const [url, key] = await Promise.all([getSetting('studyPlannerUrl'), getSetting('studyPlannerKey')]);
  const summary = await loadBrainSummary();
  const result = await requestPlan(url, key, summary, onWaiting);
  if (result.ok) {
    await db.brainPlans.put({ weekStart: summary.planWeekStarting, createdAt: new Date().toISOString(), plan: result.plan });
  }
  return result;
}

export interface StoredPlan {
  weekStart: string;
  createdAt: string;
  plan: BrainPlan;
}

/** A week's plan, or null (none yet, or saved by an older version). */
export async function loadPlan(weekStart: string): Promise<StoredPlan | null> {
  const row = await db.brainPlans.get(weekStart);
  const parsed = row ? brainPlanSchema.safeParse(row.plan) : null;
  return row && parsed?.success ? { weekStart: row.weekStart, createdAt: row.createdAt, plan: parsed.data } : null;
}

/** React hook: the plan for the week being planned (see planWeekStart). */
export function usePlan(weekStart: string = planWeekStart()) {
  return useLiveQuery(() => loadPlan(weekStart), [weekStart]);
}
