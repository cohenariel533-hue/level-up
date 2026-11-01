import { CalendarClock } from 'lucide-react';
import { useToast } from '../../components/ui';
import { moveOrder } from '../../db/hustle';
import type { Order } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatILS } from '../../lib/format';
import { daysUntil, nextStatus, ORDER_STATUSES } from '../../lib/hustle';
import s from './hustle.module.css';

/**
 * Lead → Paid → Building → Delivered → Got review.
 * Swipe sideways between columns on iPhone. Each card has a one-tap
 * "→ next stage" button; tap the card itself to edit everything.
 */
export function OrdersBoard({ orders, onSelect }: { orders: Order[]; onSelect: (order: Order) => void }) {
  const toast = useToast();

  async function advance(order: Order) {
    const next = nextStatus(order.status);
    if (!next || !order.id) return;
    await moveOrder(order.id, next);
    toast(t.hustle.movedToast(order.client, t.hustle.statuses[next]));
  }

  return (
    <div className={s.board}>
      {ORDER_STATUSES.map((status) => {
        const column = orders.filter((o) => o.status === status);
        return (
          <section key={status} className={`glass ${s.lane}`} aria-label={t.hustle.statuses[status]}>
            <header className={s.laneHeader}>
              {t.hustle.statuses[status]}
              <span className={s.laneCount}>{column.length}</span>
            </header>
            {column.length === 0 && <p className="faint small">{t.hustle.emptyColumn}</p>}
            {column.map((order) => (
              <OrderCard key={order.id} order={order} onOpen={() => onSelect(order)} onAdvance={() => advance(order)} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onOpen, onAdvance }: { order: Order; onOpen: () => void; onAdvance: () => void }) {
  const next = nextStatus(order.status);
  const showDeadline = order.deadline && order.status !== 'delivered' && order.status !== 'reviewed';
  const days = order.deadline ? daysUntil(order.deadline) : 0;

  return (
    // A div with role=button so the "→ next" button inside it is valid HTML.
    <div
      role="button"
      tabIndex={0}
      className={s.card}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <div className={s.cardTop}>
        <span className={s.client}>{order.client}</span>
        <span className={s.price}>{formatILS(order.price)}</span>
      </div>
      <div className={s.cardMeta}>
        <span>{t.hustle.occasions[order.occasion]}</span>
        <span>· {order.paid ? t.hustle.paidBadge : t.hustle.unpaid}</span>
        {order.rush && <span>· Rush</span>}
      </div>
      {showDeadline && (
        <div className={`${s.cardMeta} ${days < 0 ? s.overdue : ''}`}>
          <CalendarClock size={13} aria-hidden="true" />
          {days === 0 ? t.hustle.dueToday : days > 0 ? t.hustle.dueIn(days) : t.hustle.overdue(-days)}
        </div>
      )}
      {next && (
        <button
          type="button"
          className={s.advance}
          onClick={(e) => {
            e.stopPropagation();
            onAdvance();
          }}
        >
          {t.hustle.moveTo(t.hustle.statuses[next])}
        </button>
      )}
    </div>
  );
}
