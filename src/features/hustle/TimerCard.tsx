import { Play, Plus, Square, X } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Button, Field, GlassCard, Sheet } from '../../components/ui';
import { addManualSession, deleteSession, startTimer, stopTimer } from '../../db/hustle';
import type { HustleSession, Order } from '../../db/schema';
import { useNow } from '../../hooks/useNow';
import { t } from '../../i18n/en';
import { formatDayShort, todayISO, toISODate } from '../../lib/dates';
import { formatTimer, sessionMinutes } from '../../lib/hustle';
import { formatDuration, formatHours } from '../../lib/time';
import s from './hustle.module.css';
import ms from '../money/money.module.css';

/**
 * Start/stop timer for hustle work. The running session lives in the
 * database, so it keeps counting even if the app is closed.
 */
export function TimerCard({ weekSessions, orders }: { weekSessions: HustleSession[]; orders: Order[] }) {
  const now = useNow(1000);
  const running = weekSessions.find((x) => x.end === null);
  const [orderId, setOrderId] = useState<string>('');
  const [manualOpen, setManualOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== 'reviewed');
  const weekMinutes = weekSessions.reduce((sum, x) => sum + sessionMinutes(x, now), 0);
  const elapsed = running ? now.getTime() - new Date(running.start).getTime() : 0;
  const runningOrder = running?.orderId ? orders.find((o) => o.id === running.orderId) : undefined;

  return (
    <GlassCard
      title={t.hustle.timerTitle}
      action={<span className="faint small">{t.hustle.thisWeek(formatHours(weekMinutes / 60))}</span>}
    >
      <p className="muted small" style={{ textAlign: 'center' }}>
        {running ? (
          <>
            <span className={s.pulse} />
            {t.hustle.timerRunning}
            {runningOrder && ` · ${runningOrder.client}`}
          </>
        ) : (
          t.hustle.timerIdle
        )}
      </p>
      <p className={`${s.timer} ${running ? s.timerRunning : ''}`}>{formatTimer(elapsed)}</p>

      {!running && activeOrders.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Field label={t.hustle.workingOn}>
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">{t.hustle.noOrder}</option>
              {activeOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.client} · {t.hustle.occasions[o.occasion]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {running ? (
        <Button variant="secondary" size="lg" block icon={<Square />} onClick={stopTimer}>
          {t.hustle.stop}
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          block
          icon={<Play />}
          onClick={() => startTimer(orderId ? Number(orderId) : undefined)}
          style={{ '--accent': 'var(--c-hustle)' } as CSSProperties}
        >
          {t.hustle.start}
        </Button>
      )}

      <h3 className="card-title" style={{ margin: '22px 0 4px' }}>
        {t.hustle.recentSessions}
      </h3>
      {weekSessions.filter((x) => x.end).length === 0 ? (
        <p className="faint small">{t.hustle.noSessions}</p>
      ) : (
        <div className="list">
          {weekSessions
            .filter((x) => x.end)
            .sort((a, b) => b.start.localeCompare(a.start))
            .map((x) => {
              const order = x.orderId ? orders.find((o) => o.id === x.orderId) : undefined;
              const minutes = sessionMinutes(x);
              return (
                <div key={x.id} className="list-row" style={{ cursor: 'default' }}>
                  <span className="list-text">
                    <span className="list-label">{minutes < 1 ? '<1m' : formatDuration(Math.round(minutes))}</span>
                    <span className="list-sub">
                      {formatDayShort(toISODate(new Date(x.start)))}
                      {order ? ` · ${order.client}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={ms.removeButton}
                    aria-label={t.hustle.removeSession}
                    onClick={() => deleteSession(x.id!)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      <Button variant="ghost" icon={<Plus />} onClick={() => setManualOpen(true)} style={{ marginTop: 8 }}>
        {t.hustle.addTime}
      </Button>

      <ManualTimeSheet open={manualOpen} onClose={() => setManualOpen(false)} orders={activeOrders} />
    </GlassCard>
  );
}

/** Log time after the fact, for when the timer wasn't running. */
function ManualTimeSheet({ open, onClose, orders }: { open: boolean; onClose: () => void; orders: Order[] }) {
  const [minutes, setMinutes] = useState('60');
  const [date, setDate] = useState(todayISO());
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    if (open) {
      setMinutes('60');
      setDate(todayISO());
      setOrderId('');
    }
  }, [open]);

  const value = Number(minutes);

  async function add() {
    if (!(value > 0)) return;
    await addManualSession(date, value, orderId ? Number(orderId) : undefined);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.hustle.addTimeTitle}>
      <div className="stack">
        <div className="form-row">
          <Field label={t.hustle.minutes}>
            <input
              className="input"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label={t.hustle.date}>
            <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {orders.length > 0 && (
          <Field label={t.hustle.workingOn}>
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">{t.hustle.noOrder}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.client}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Button variant="primary" size="lg" block onClick={add} disabled={!(value > 0)}>
          {t.hustle.add}
        </Button>
      </div>
    </Sheet>
  );
}
