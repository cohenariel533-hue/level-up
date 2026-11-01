/**
 * Everything that writes side-hustle data.
 *
 * Orders and Money stay in sync: when an order is paid, a matching
 * side-hustle income entry is created in Money; unpaid or deleted, it's
 * removed; a price change updates it.
 */
import { t } from '../i18n/en';
import { todayISO } from '../lib/dates';
import { db, type Order, type OrderStatus } from './schema';

export type OrderInput = Omit<Order, 'id' | 'createdAt' | 'incomeId' | 'paidAt'>;

const incomeNote = (o: Pick<Order, 'client' | 'occasion'>) => `${o.client} · ${t.hustle.occasions[o.occasion]}`;

/** Creates, updates or removes the Money income entry so it matches the order. */
async function syncIncome(order: Order): Promise<Order> {
  if (order.paid) {
    const paidAt = order.paidAt ?? new Date().toISOString();
    const date = paidAt.slice(0, 10);
    const income = { month: date.slice(0, 7), source: 'hustle' as const, amount: order.price, date, note: incomeNote(order) };
    if (order.incomeId && (await db.incomes.get(order.incomeId))) {
      await db.incomes.update(order.incomeId, income);
      return { ...order, paidAt };
    }
    return { ...order, paidAt, incomeId: await db.incomes.add(income) };
  }
  if (order.incomeId) await db.incomes.delete(order.incomeId);
  return { ...order, paidAt: undefined, incomeId: undefined };
}

export async function addOrder(input: OrderInput) {
  return db.transaction('rw', db.orders, db.incomes, async () => {
    const order = await syncIncome({ ...input, createdAt: new Date().toISOString() });
    return db.orders.add(order);
  });
}

export async function updateOrder(id: number, input: Partial<OrderInput>) {
  await db.transaction('rw', db.orders, db.incomes, async () => {
    const existing = await db.orders.get(id);
    if (!existing) return;
    await db.orders.put(await syncIncome({ ...existing, ...input }));
  });
}

/** Moving an order into "Paid" (or any later column) marks it as paid. */
export async function moveOrder(id: number, status: OrderStatus) {
  await updateOrder(id, status === 'lead' ? { status } : { status, paid: true });
}

export async function deleteOrder(id: number) {
  await db.transaction('rw', db.orders, db.incomes, db.hustleSessions, async () => {
    const order = await db.orders.get(id);
    if (order?.incomeId) await db.incomes.delete(order.incomeId);
    // Keep the hours: they still count, just no longer linked to an order.
    await db.hustleSessions
      .filter((s) => s.orderId === id)
      .modify((s) => {
        delete s.orderId;
      });
    await db.orders.delete(id);
  });
}

// ---------- Timer ----------

export const runningSession = () => db.hustleSessions.filter((s) => s.end === null).first();

export async function startTimer(orderId?: number) {
  if (await runningSession()) return;
  await db.hustleSessions.add({ start: new Date().toISOString(), end: null, orderId });
}

export async function stopTimer() {
  const running = await runningSession();
  if (running?.id) await db.hustleSessions.update(running.id, { end: new Date().toISOString() });
}

/** For when you forgot the timer: logs `minutes` of work ending now (or at 18:00 on a past date). */
export function addManualSession(date: string, minutes: number, orderId?: number) {
  const end = date === todayISO() ? new Date() : new Date(`${date}T18:00:00`);
  const start = new Date(end.getTime() - minutes * 60_000);
  return db.hustleSessions.add({ start: start.toISOString(), end: end.toISOString(), orderId });
}

export const deleteSession = (id: number) => db.hustleSessions.delete(id);
