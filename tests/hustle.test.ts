import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { addOrder, deleteOrder, moveOrder, startTimer, stopTimer, updateOrder, type OrderInput } from '../src/db/hustle';
import { db, type Order } from '../src/db/schema';
import {
  formatTimer,
  goalProgress,
  hustleStats,
  minutesByDate,
  nextStatus,
  sessionMinutes,
  suggestedPrice,
} from '../src/lib/hustle';

const order = (over: Partial<Order>): Order => ({
  client: 'Noa',
  occasion: 'anniversary',
  package: 'basic',
  rush: false,
  price: 149,
  deadline: null,
  notes: '',
  status: 'lead',
  paid: false,
  createdAt: '2026-11-01T10:00:00Z',
  ...over,
});

describe('pricing and stages', () => {
  it('suggests package prices, with rush on top', () => {
    expect(suggestedPrice('basic', false)).toBe(149);
    expect(suggestedPrice('premium', true)).toBe(379);
    expect(suggestedPrice('business', false)).toBeNull();
  });

  it('moves through the board in order', () => {
    expect(nextStatus('lead')).toBe('paid');
    expect(nextStatus('delivered')).toBe('reviewed');
    expect(nextStatus('reviewed')).toBeNull();
  });
});

describe('timer math', () => {
  it('measures finished and running sessions', () => {
    const now = new Date('2026-11-01T12:00:00Z');
    expect(sessionMinutes({ start: '2026-11-01T10:00:00Z', end: '2026-11-01T11:30:00Z' })).toBe(90);
    expect(sessionMinutes({ start: '2026-11-01T11:15:00Z', end: null }, now)).toBe(45);
  });

  it('formats the clock', () => {
    expect(formatTimer(2_533_000)).toBe('0:42:13');
    expect(formatTimer(3_600_000 * 2 + 5000)).toBe('2:00:05');
  });

  it('groups minutes by the local day each session started', () => {
    const sessions = [
      { start: new Date(2026, 10, 1, 18, 0).toISOString(), end: new Date(2026, 10, 1, 19, 0).toISOString() },
      { start: new Date(2026, 10, 1, 21, 0).toISOString(), end: new Date(2026, 10, 1, 21, 30).toISOString() },
      { start: new Date(2026, 10, 3, 10, 0).toISOString(), end: new Date(2026, 10, 3, 12, 0).toISOString() },
    ];
    expect(minutesByDate(sessions)).toEqual({ '2026-11-01': 90, '2026-11-03': 120 });
  });
});

describe('stats and goal', () => {
  const now = new Date(2026, 11, 16); // 16 Dec 2026, halfway through the goal window
  const orders = [
    order({ client: 'Noa', paid: true, price: 149, paidAt: '2026-11-10T10:00:00Z' }),
    order({ client: 'noa ', paid: true, price: 299, paidAt: '2026-12-02T10:00:00Z' }), // same customer
    order({ client: 'Dani', paid: true, price: 229, paidAt: '2026-12-05T10:00:00Z' }),
    order({ client: 'Lead only', paid: false, price: 299 }),
  ];
  const sessions = [{ start: '2026-11-01T10:00:00Z', end: '2026-11-01T20:00:00Z' }]; // 10 h

  it('adds up earnings, distinct customers and ₪ per hour', () => {
    expect(hustleStats(orders, sessions, now)).toEqual({
      totalEarned: 677,
      earnedThisMonth: 528,
      customers: 2,
      totalHours: 10,
      perHour: 68,
    });
  });

  it('shows no ₪ per hour before any time is logged', () => {
    expect(hustleStats(orders, [], now).perHour).toBeNull();
  });

  it('tracks the 90-day goal and pace', () => {
    const goal = goalProgress(orders, now);
    expect(goal).toMatchObject({ customers: 2, earned: 677, daysLeft: 46 });
    expect(goal.onPace).toBe(false);
  });
});

describe('orders and Money stay in sync', () => {
  const input: OrderInput = {
    client: 'Noa',
    occasion: 'anniversary',
    package: 'premium',
    rush: false,
    price: 299,
    deadline: null,
    notes: '',
    status: 'lead',
    paid: false,
  };

  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('creates hustle income when paid, updates it with the price, removes it when unpaid', async () => {
    const id = await addOrder(input);
    expect(await db.incomes.count()).toBe(0);

    await moveOrder(id, 'paid');
    let income = await db.incomes.toArray();
    expect(income).toHaveLength(1);
    expect(income[0]).toMatchObject({ source: 'hustle', amount: 299, note: 'Noa · Anniversary' });

    await updateOrder(id, { price: 379 });
    income = await db.incomes.toArray();
    expect(income).toHaveLength(1);
    expect(income[0].amount).toBe(379);

    await updateOrder(id, { paid: false, status: 'lead' });
    expect(await db.incomes.count()).toBe(0);
  });

  it('deleting a paid order removes its income but keeps logged hours', async () => {
    const id = await addOrder({ ...input, status: 'paid', paid: true });
    await startTimer(id);
    await stopTimer();
    await deleteOrder(id);
    expect(await db.incomes.count()).toBe(0);
    const sessions = await db.hustleSessions.toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].orderId).toBeUndefined();
  });

  it('only runs one timer at a time', async () => {
    await startTimer();
    await startTimer();
    expect(await db.hustleSessions.count()).toBe(1);
    await stopTimer();
    expect((await db.hustleSessions.toArray())[0].end).not.toBeNull();
  });
});
