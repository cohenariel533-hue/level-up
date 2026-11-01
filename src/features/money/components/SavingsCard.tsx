import { ArrowDownToLine, ArrowUpFromLine, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button, GlassCard, ProgressBar } from '../../../components/ui';
import { t } from '../../../i18n/en';
import { formatILS } from '../../../lib/format';
import s from '../money.module.css';
import type { GoalView, MoneyView } from '../useMoney';

export const goalName = (g: GoalView) =>
  g.kind === 'buffer' ? t.money.savings.goalBuffer : g.kind === 'month' ? t.money.savings.goalMonth : g.name;

/** Total saved, buttons to move money in/out, and the goals filling in order. */
export function SavingsCard({
  view,
  onMove,
  onEditGoal,
  onAddGoal,
}: {
  view: MoneyView;
  onMove: (direction: 'in' | 'out') => void;
  onEditGoal: (goal: GoalView) => void;
  onAddGoal: () => void;
}) {
  const stillToMove = view.plan.savings - Math.max(view.savedThisMonth, 0);

  return (
    <GlassCard title={t.money.savings.title}>
      <p className="eyebrow">{t.money.savings.total}</p>
      <p className={s.bigNumber} style={{ marginBottom: stillToMove > 0 ? 4 : 18 }}>
        {formatILS(view.totalSaved)}
      </p>
      {stillToMove > 0 && (
        <p className="muted small" style={{ marginBottom: 16 }}>
          {t.money.savings.toMoveThisMonth(formatILS(stillToMove))}
        </p>
      )}

      <div className={s.buttonPair} style={{ marginBottom: 22 }}>
        <Button variant="primary" icon={<ArrowDownToLine />} onClick={() => onMove('in')}>
          {t.money.savings.moveIn}
        </Button>
        <Button variant="subtle" icon={<ArrowUpFromLine />} onClick={() => onMove('out')}>
          {t.money.savings.takeOut}
        </Button>
      </div>

      <div className="stack" style={{ '--gap': '18px' } as CSSProperties}>
        {view.goals.map(({ goal, saved, target, done }, i) => (
          <button key={goal.id} type="button" className={s.goalButton} onClick={() => onEditGoal(goal)}>
            <ProgressBar
              label={`${i + 1}. ${goalName(goal)}`}
              value={saved}
              max={target}
              color={done ? 'var(--c-money)' : 'color-mix(in srgb, var(--c-money) 75%, var(--c-school))'}
              detail={
                goal.unsized
                  ? t.money.savings.goalMonthUnsized
                  : done
                    ? `✓ ${t.money.savings.reached}`
                    : `${formatILS(saved)} / ${formatILS(target)}`
              }
            />
          </button>
        ))}
        {view.extraSaved > 0 && <p className="muted small">{t.money.savings.extra(formatILS(view.extraSaved))}</p>}
      </div>

      <Button variant="ghost" icon={<Plus />} onClick={onAddGoal} style={{ marginTop: 10 }}>
        {t.money.savings.addGoal}
      </Button>
    </GlassCard>
  );
}
