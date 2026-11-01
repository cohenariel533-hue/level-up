import { Target } from 'lucide-react';
import type { CSSProperties } from 'react';
import { GlassCard, ProgressBar } from '../../components/ui';
import { t } from '../../i18n/en';
import { formatILS } from '../../lib/format';
import { HUSTLE_GOAL, type GoalProgress, type HustleStats } from '../../lib/hustle';
import s from './hustle.module.css';

/** Total earned, this month, customers, ₪ per hour. */
export function StatsCard({ stats }: { stats: HustleStats }) {
  const tiles = [
    [t.hustle.totalEarned, formatILS(stats.totalEarned)],
    [t.hustle.thisMonth, formatILS(stats.earnedThisMonth)],
    [t.hustle.customers, String(stats.customers)],
    [t.hustle.perHour, stats.perHour === null ? '—' : formatILS(stats.perHour)],
  ];
  return (
    <GlassCard title={t.hustle.statsTitle}>
      <div className={s.stats}>
        {tiles.map(([label, value]) => (
          <div key={label} className={s.stat}>
            <p className="eyebrow">{label}</p>
            <p className={s.statValue}>{value}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/** The 90-day goal: two bars, days left, and a gentle pace note. */
export function GoalCard({ goal }: { goal: GoalProgress }) {
  const reached = goal.customers >= HUSTLE_GOAL.customers && goal.earned >= HUSTLE_GOAL.earned;
  const customersLeft = Math.max(HUSTLE_GOAL.customers - goal.customers, 0);
  const weeksLeft = Math.max(Math.ceil(goal.daysLeft / 7), 1);

  return (
    <GlassCard
      title={t.hustle.goalTitle}
      action={<span className="chip" style={{ '--item-color': 'var(--c-hustle)' } as CSSProperties}>{t.hustle.daysLeft(goal.daysLeft)}</span>}
    >
      <p className="muted small" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Target size={14} aria-hidden="true" />
        {t.hustle.goalSubtitle}
      </p>
      <div className="stack" style={{ '--gap': '16px' } as CSSProperties}>
        <ProgressBar
          label={t.hustle.customersGoal}
          value={goal.customers}
          max={HUSTLE_GOAL.customers}
          color="var(--c-hustle)"
          detail={`${goal.customers} / ${HUSTLE_GOAL.customers}`}
        />
        <ProgressBar
          label={t.hustle.earnedGoal}
          value={goal.earned}
          max={HUSTLE_GOAL.earned}
          color="var(--c-money)"
          detail={`${formatILS(goal.earned)} / ${formatILS(HUSTLE_GOAL.earned)}`}
        />
      </div>
      <p className="small" style={{ marginTop: 14, color: goal.onPace || reached ? 'var(--c-money)' : 'var(--text-2)' }}>
        {reached ? t.hustle.goalReached : goal.onPace ? t.hustle.onPace : t.hustle.behindPace(customersLeft, weeksLeft)}
      </p>
    </GlassCard>
  );
}
