import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addOrder, moveOrder, togglePathStep } from '../src/db/hustle';
import { db } from '../src/db/schema';
import { getSetting } from '../src/db/settings';
import { t } from '../src/i18n/en';
import { PATH, pathFacts, pathStatus } from '../src/lib/hustlePath';

const none = { orders: 0, paid: 0, reviewed: 0, customers: 0 };
const doneUpTo = (lastId: string) => {
  const done: Record<string, string> = {};
  for (const step of PATH) {
    done[step.id] = '2026-11-01T10:00:00Z';
    if (step.id === lastId) break;
  }
  return done;
};

describe('the path', () => {
  it('has words for every step', () => {
    for (const step of PATH) {
      const words = t.path.steps[step.id as keyof typeof t.path.steps];
      expect(words?.title, step.id).toBeTruthy();
      expect(words.tips.length, step.id).toBeGreaterThan(0);
    }
  });

  it('starts at the very first step from zero', () => {
    const status = pathStatus({}, none, 'notStarted');
    expect(status.current?.id).toBe('niche');
    expect(status.upcoming.map((s) => s.id)).toEqual(['brand', 'demoPlan']);
    expect(status.levelIndex).toBe(0);
    expect([status.levelDone, status.levelTotal]).toEqual([0, 6]);
  });

  it('moves on as you tick steps', () => {
    const status = pathStatus({ niche: 'x', brand: 'x' }, none, 'notStarted');
    expect(status.current?.id).toBe('demoPlan');
    expect(status.levelDone).toBe(2);
  });

  it('skips levels you’re already past (About me stage)', () => {
    expect(pathStatus({}, none, 'demo').current?.id).toBe('offer');
    expect(pathStatus({}, none, 'customers').current?.id).toBe('template');
  });

  it('waits on self-ticking steps until the orders board says so', () => {
    const atLead = pathStatus(doneUpTo('status'), none, 'notStarted');
    expect(atLead.current?.id).toBe('firstLead');
    expect(atLead.current?.auto).toBeTruthy();

    const afterLead = pathStatus(doneUpTo('status'), { ...none, orders: 1 }, 'notStarted');
    expect(afterLead.current?.id).toBe('launchDeal');

    const afterSale = pathStatus(doneUpTo('launchDeal'), { orders: 1, paid: 1, reviewed: 0, customers: 1 }, 'notStarted');
    expect(afterSale.current?.id).toBe('wowDelivery');
  });

  it('is complete when every step is done', () => {
    const all = Object.fromEntries(PATH.map((s) => [s.id, 'x']));
    const status = pathStatus(all, none, 'notStarted');
    expect(status.current).toBeNull();
    expect(status.levelIndex).toBe(4);
  });

  it('counts orders, paid, reviewed and distinct customers', () => {
    expect(
      pathFacts([
        { client: 'Noa', status: 'reviewed', paid: true },
        { client: ' noa', status: 'building', paid: true },
        { client: 'Dani', status: 'lead', paid: false },
      ]),
    ).toEqual({ orders: 3, paid: 2, reviewed: 1, customers: 1 });
  });
});

describe('with the database', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('ticks and un-ticks steps', async () => {
    await togglePathStep('niche');
    expect(Object.keys(await getSetting('hustlePathDone'))).toEqual(['niche']);
    await togglePathStep('niche');
    expect(await getSetting('hustlePathDone')).toEqual({});
  });

  it('a real paid order ticks "first lead" and "close your first sale"', async () => {
    const id = await addOrder({
      client: 'Noa',
      occasion: 'anniversary',
      package: 'basic',
      rush: false,
      price: 149,
      deadline: null,
      notes: '',
      status: 'lead',
      paid: false,
    });
    await moveOrder(id, 'paid');
    // Ticked by hand: everything before "first lead", plus the launch deal.
    const done = { ...doneUpTo('status'), launchDeal: 'x' };
    const status = pathStatus(done, pathFacts(await db.orders.toArray()), 'notStarted');
    const states = Object.fromEntries(status.steps.map((s) => [s.step.id, s.state]));
    expect(states.firstLead).toBe('auto-done');
    expect(states.firstSale).toBe('auto-done');
    expect(status.current?.id).toBe('wowDelivery');
  });
});
