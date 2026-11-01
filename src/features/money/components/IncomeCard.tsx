import { HandCoins, Rocket } from 'lucide-react';
import { GlassCard, ListRow } from '../../../components/ui';
import { t } from '../../../i18n/en';
import { formatILS } from '../../../lib/format';
import type { MoneyView } from '../useMoney';

/** Allowance and side-hustle income, tracked separately. */
export function IncomeCard({
  view,
  onEditAllowance,
  onOpenHustle,
}: {
  view: MoneyView;
  onEditAllowance: () => void;
  onOpenHustle: () => void;
}) {
  const { hustleSplit: h } = view;
  return (
    <GlassCard title={t.money.income}>
      <div className="list">
        <ListRow
          icon={HandCoins}
          color="var(--c-money)"
          label={t.money.allowance}
          sub={t.money.allowanceSub}
          detail={view.allowance ? formatILS(view.allowance.amount) : t.money.notSet}
          onClick={onEditAllowance}
        />
        <ListRow
          icon={Rocket}
          color="var(--c-hustle)"
          label={t.money.hustleIncome}
          sub={view.bufferFull ? t.money.hustleNormalSub : t.money.hustleSplitSub(h.savings, h.reinvest, h.fun)}
          detail={formatILS(view.hustleTotal)}
          onClick={onOpenHustle}
        />
      </div>
    </GlassCard>
  );
}
