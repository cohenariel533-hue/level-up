import { Hourglass, Plus } from 'lucide-react';
import { Button, GlassCard, useToast } from '../../../components/ui';
import { decideWaitItem } from '../../../db/money';
import type { WaitItem } from '../../../db/schema';
import { useNow } from '../../../hooks/useNow';
import { t } from '../../../i18n/en';
import { formatILS } from '../../../lib/format';
import { waitStatus } from '../../../lib/money';
import s from '../money.module.css';

/**
 * The 48-hour rule. Big wants wait two days. "Buy" unlocks when the timer
 * ends; "Skip" is always allowed, since deciding not to buy is a win.
 */
export function WaitListCard({
  items,
  notSpent,
  onAdd,
}: {
  items: WaitItem[];
  notSpent: number;
  onAdd: () => void;
}) {
  const now = useNow();
  const toast = useToast();

  async function decide(id: number, decision: 'bought' | 'skipped') {
    await decideWaitItem(id, decision);
    toast(decision === 'bought' ? t.money.wait.bought : t.money.wait.skipped);
  }

  return (
    <GlassCard
      title={t.money.wait.title}
      action={<Button variant="ghost" icon={<Plus />} aria-label={t.money.wait.addTitle} onClick={onAdd} />}
    >
      <p className="muted small" style={{ marginBottom: 8 }}>
        {t.money.wait.intro}
      </p>

      {items.length === 0 && <p className="faint small">{t.money.wait.empty}</p>}

      {items.map((item) => {
        const status = waitStatus(item.addedAt, now);
        return (
          <div key={item.id} className={s.waitItem}>
            <Hourglass size={20} color={status.ready ? 'var(--c-money)' : 'var(--c-fun)'} aria-hidden="true" />
            <div className={s.waitInfo}>
              <div className="list-label">
                {item.name} · {formatILS(item.price)}
              </div>
              <div className="list-sub">{status.ready ? t.money.wait.ready : t.money.wait.hoursLeft(status.hoursLeft)}</div>
            </div>
            <div className={s.waitActions}>
              <Button variant="subtle" onClick={() => decide(item.id!, 'skipped')}>
                {t.money.wait.skip}
              </Button>
              {status.ready && (
                <Button variant="secondary" onClick={() => decide(item.id!, 'bought')}>
                  {t.money.wait.buy}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {notSpent > 0 && (
        <p className="small" style={{ marginTop: 12, color: 'var(--c-money)' }}>
          {t.money.wait.notSpent(formatILS(notSpent))}
        </p>
      )}
    </GlassCard>
  );
}
