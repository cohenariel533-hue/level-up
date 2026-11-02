/**
 * The hustle path: a step-by-step ladder from "not started" to "local
 * businesses", so there's always one clear next thing to do. Pure functions,
 * tested in tests/hustlePath.test.ts. The wording lives in i18n (t.path.steps).
 *
 * Steps are ticked by you ("Done ✓"), or tick themselves from the orders
 * board (first lead, first sale, first review, 5 customers). Where you start
 * depends on your hustle stage in About me: with a demo already, the
 * showcase level counts as done; with customers, the first three levels do.
 */
import type { HustleStage } from './profile';

export type PathLevel = 'showcase' | 'seen' | 'first' | 'system' | 'local';
export const PATH_LEVELS: PathLevel[] = ['showcase', 'seen', 'first', 'system', 'local'];

/** What the orders board says, for the self-ticking steps. */
export interface PathFacts {
  orders: number;
  paid: number;
  reviewed: number;
  customers: number;
}

export interface PathStep {
  id: string;
  level: PathLevel;
  minutes: number;
  /** For self-ticking steps: done when this is true. */
  auto?: (f: PathFacts) => boolean;
}

/** The whole path, in order. */
export const PATH: PathStep[] = [
  { id: 'niche', level: 'showcase', minutes: 15 },
  { id: 'brand', level: 'showcase', minutes: 20 },
  { id: 'demoPlan', level: 'showcase', minutes: 30 },
  { id: 'demoBuild', level: 'showcase', minutes: 120 },
  { id: 'demoPublish', level: 'showcase', minutes: 30 },
  { id: 'demoVideo', level: 'showcase', minutes: 20 },

  { id: 'offer', level: 'seen', minutes: 20 },
  { id: 'instagram', level: 'seen', minutes: 45 },
  { id: 'warmList', level: 'seen', minutes: 20 },
  { id: 'outreach', level: 'seen', minutes: 30 },
  { id: 'status', level: 'seen', minutes: 10 },

  { id: 'firstLead', level: 'first', minutes: 20, auto: (f) => f.orders >= 1 },
  { id: 'launchDeal', level: 'first', minutes: 10 },
  { id: 'firstSale', level: 'first', minutes: 20, auto: (f) => f.paid >= 1 },
  { id: 'wowDelivery', level: 'first', minutes: 60 },
  { id: 'firstReview', level: 'first', minutes: 10, auto: (f) => f.reviewed >= 1 },

  { id: 'template', level: 'system', minutes: 90 },
  { id: 'intakeForm', level: 'system', minutes: 30 },
  { id: 'testimonial', level: 'system', minutes: 15 },
  { id: 'referral', level: 'system', minutes: 15 },
  { id: 'fiveCustomers', level: 'system', minutes: 30, auto: (f) => f.customers >= 5 },

  { id: 'bizDemo', level: 'local', minutes: 120 },
  { id: 'bizList', level: 'local', minutes: 30 },
  { id: 'bizReach', level: 'local', minutes: 45 },
  { id: 'bizPrice', level: 'local', minutes: 20 },
];

/** Levels already behind you, from your About me hustle stage. */
const SKIPPED_BY_STAGE: Record<HustleStage, PathLevel[]> = {
  notStarted: [],
  demo: ['showcase'],
  customers: ['showcase', 'seen', 'first'],
};

export type StepState = 'done' | 'auto-done' | 'skipped' | 'open';

export interface PathStatus {
  steps: { step: PathStep; state: StepState }[];
  /** The next step to do, or null when the whole path is done. */
  current: PathStep | null;
  /** The 2 steps after it. */
  upcoming: PathStep[];
  levelIndex: number;
  /** Steps finished in the current level / steps in it. */
  levelDone: number;
  levelTotal: number;
}

/**
 * Where you are on the path.
 * @param done  step id → when you ticked it ("Done ✓")
 */
export function pathStatus(done: Record<string, string>, facts: PathFacts, stage: HustleStage): PathStatus {
  const skipped = new Set(SKIPPED_BY_STAGE[stage]);
  const steps = PATH.map((step) => {
    let state: StepState = 'open';
    if (done[step.id]) state = 'done';
    else if (step.auto?.(facts)) state = 'auto-done';
    else if (skipped.has(step.level)) state = 'skipped';
    return { step, state };
  });

  const open = steps.filter((s) => s.state === 'open').map((s) => s.step);
  const current = open[0] ?? null;
  const level = current?.level ?? PATH_LEVELS[PATH_LEVELS.length - 1];
  const inLevel = steps.filter((s) => s.step.level === level);
  return {
    steps,
    current,
    upcoming: open.slice(1, 3),
    levelIndex: PATH_LEVELS.indexOf(level),
    levelDone: inLevel.filter((s) => s.state !== 'open').length,
    levelTotal: inLevel.length,
  };
}

/** Counts from the orders board (distinct customers = distinct paid client names). */
export function pathFacts(orders: { client: string; status: string; paid: boolean }[]): PathFacts {
  return {
    orders: orders.length,
    paid: orders.filter((o) => o.paid).length,
    reviewed: orders.filter((o) => o.status === 'reviewed').length,
    customers: new Set(orders.filter((o) => o.paid).map((o) => o.client.trim().toLowerCase())).size,
  };
}
