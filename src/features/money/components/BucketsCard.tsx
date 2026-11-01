import { Wallet } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button, GlassCard, ProgressBar } from '../../../components/ui';
import { t } from '../../../i18n/en';
import { formatILS } from '../../../lib/format';
import { KIND_COLOR } from '../categories';
import s from '../money.module.css';
import type { MoneyView } from '../useMoney';

/** "Left to spend" plus one bar per bucket for the month. */
export function BucketsCard({ view, onAddAllowance }: { view: MoneyView; onAddAllowance: () => void }) {
  const { plan, spent, savedThisMonth } = view;
  const hasPlan = plan.needs + plan.fun + plan.savings + plan.reinvest > 0;

  if (!hasPlan) {
    return (
      <GlassCard style={{ '--item-color': 'var(--c-money)' } as CSSProperties}>
        <div className="empty">
          <div className="empty-icon">
            <Wallet aria-hidden="true" />
          </div>
          <h2 className="empty-title">{t.money.noPlanTitle}</h2>
          <p className="muted" style={{ marginBottom: 18 }}>
            {t.money.noPlanBody}
          </p>
          <Button variant="primary" size="lg" onClick={onAddAllowance}>
            {t.money.addAllowance}
          </Button>
        </div>
      </GlassCard>
    );
  }

  const left = plan.needs + plan.fun - spent.needs - spent.fun;

  return (
    <GlassCard>
      <p className="eyebrow">{t.money.leftToSpend}</p>
      <p className={s.bigNumber}>{formatILS(Math.max(left, 0))}</p>
      {left < 0 && <p className={s.overNote}>{t.money.overNote}</p>}

      <div className="stack" style={{ '--gap': '18px' } as CSSProperties}>
        <SpendBar label={t.money.buckets.needs} spent={spent.needs} plan={plan.needs} color={KIND_COLOR.need} />
        <SpendBar label={t.money.buckets.fun} spent={spent.fun} plan={plan.fun} color={KIND_COLOR.fun} />
        {(plan.reinvest > 0 || spent.reinvest > 0) && (
          <SpendBar
            label={t.money.buckets.reinvest}
            spent={spent.reinvest}
            plan={plan.reinvest}
            color={KIND_COLOR.reinvest}
          />
        )}
        <ProgressBar
          label={t.money.buckets.savings}
          value={Math.max(savedThisMonth, 0)}
          max={plan.savings}
          color={KIND_COLOR.savings}
          detail={t.money.movedOf(formatILS(Math.max(savedThisMonth, 0)), formatILS(plan.savings))}
        />
      </div>
    </GlassCard>
  );
}

/** A spending bucket: fills as you spend; turns warm amber (never red) if you go over. */
function SpendBar({ label, spent, plan, color }: { label: string; spent: number; plan: number; color: string }) {
  const over = spent > plan;
  return (
    <ProgressBar
      label={label}
      value={spent}
      max={over ? spent : plan}
      color={over ? 'var(--c-over)' : color}
      detail={over ? t.money.over(formatILS(spent - plan)) : t.money.left(formatILS(plan - spent))}
    />
  );
}
