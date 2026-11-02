import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { Fab, PageHeader } from '../../components/ui';
import { db, type Order } from '../../db/schema';
import { useNow } from '../../hooks/useNow';
import { t } from '../../i18n/en';
import { weekStart } from '../../lib/dates';
import { goalProgress, hustleStats } from '../../lib/hustle';
import { OrderSheet } from './OrderSheet';
import { OrdersBoard } from './OrdersBoard';
import { PathCard } from './PathCard';
import { GoalCard, StatsCard } from './StatsCards';
import { TimerCard } from './TimerCard';

/** Side hustle: your path, orders board, hours timer, stats and the 90-day goal. */
export default function HustleScreen() {
  const now = useNow(60_000); // stats with a running timer refresh each minute
  const [sheet, setSheet] = useState<{ order?: Order } | null>(null);
  const close = useCallback(() => setSheet(null), []);

  const data = useLiveQuery(async () => {
    const [orders, sessions] = await Promise.all([
      db.orders.orderBy('createdAt').toArray(),
      db.hustleSessions.toArray(),
    ]);
    return { orders, sessions };
  });

  if (!data) return null;
  const { orders, sessions } = data;
  const weekStartISO = weekStart(now).toISOString();
  const weekSessions = sessions.filter((x) => x.start >= weekStartISO);

  return (
    <>
      <PageHeader eyebrow={t.hustle.subtitle} title={t.hustle.title} />

      <div className="stack">
        <PathCard orders={orders} />
        {orders.length === 0 && <p className="muted small" style={{ marginInline: 4 }}>{t.hustle.emptyBoard}</p>}
        <OrdersBoard orders={orders} onSelect={(order) => setSheet({ order })} />
        <TimerCard weekSessions={weekSessions} orders={orders} />
        <GoalCard goal={goalProgress(orders, now)} />
        <StatsCard stats={hustleStats(orders, sessions, now)} />
      </div>

      <Fab label={t.hustle.newOrder} onClick={() => setSheet({})} />
      <OrderSheet open={sheet !== null} onClose={close} order={sheet?.order} />
    </>
  );
}
