import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, Repeat, Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Button, GlassCard, ListRow, PageHeader, useToast } from '../../components/ui';
import { makeWeeklyPlan, usePlan } from '../../db/brain';
import { useSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import { planWeekStart } from '../../lib/brain';
import { formatShortDate } from '../../lib/dates';
import { REVIEW_COLORS } from '../review/GoalList';
import rs from '../review/review.module.css';

const PILLAR_COLOR: Record<string, string> = {
  school: 'var(--c-school)',
  gym: 'var(--c-gym)',
  hustle: 'var(--c-hustle)',
  money: 'var(--c-money)',
  life: 'var(--accent)',
};

/** "Plan my week with Claude": make the plan, then read it (focus, days, tasks, habit, watch-outs). */
export default function BrainScreen() {
  const toast = useToast();
  const week = planWeekStart();
  const stored = usePlan(week);
  const connected = !!useSetting('studyPlannerKey');
  const [waiting, setWaiting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function make() {
    setError(null);
    setWaiting(0);
    const result = await makeWeeklyPlan(setWaiting);
    setWaiting(null);
    if (result.ok) toast(t.brain.done);
    else setError(t.brain.errors[result.reason] + (result.detail && result.reason === 'claude' ? ` (${result.detail})` : ''));
  }

  if (stored === undefined) return null;
  const plan = stored?.plan;

  return (
    <>
      <PageHeader eyebrow={t.brain.planFor(formatShortDate(week))} title={t.brain.title} />

      <div className="stack">
        {!plan && (
          <p className="muted" style={{ margin: '-6px 4px 0' }}>
            {t.brain.intro}
          </p>
        )}

        <GlassCard strong={!plan} style={{ '--item-color': 'var(--c-review)' } as CSSProperties}>
          {waiting !== null ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Sparkles size={28} color="var(--c-review)" style={{ animation: 'soft-pulse 1.4s ease-in-out infinite' }} aria-hidden="true" />
              <p className="list-label" style={{ marginTop: 8 }}>
                {t.brain.thinking(waiting)}
              </p>
              <p className="faint small">{t.brain.thinkingHint}</p>
            </div>
          ) : (
            <>
              {!connected && <p className="small muted" style={{ marginBottom: 12 }}>{t.brain.notConnected}</p>}
              <Button
                variant={plan ? 'secondary' : 'primary'}
                size="lg"
                block
                icon={plan ? <Repeat /> : <Sparkles />}
                disabled={!connected}
                onClick={make}
                style={{ '--accent': 'var(--c-review)' } as CSSProperties}
              >
                {plan ? t.brain.remake : t.brain.make}
              </Button>
              {stored && <p className="faint small" style={{ marginTop: 10, textAlign: 'center' }}>{t.brain.madeAt(formatDistanceToNowStrict(new Date(stored.createdAt), { addSuffix: true }))}</p>}
            </>
          )}
          {error && (
            <p className="small" style={{ marginTop: 12, color: 'var(--c-over)' }}>
              {error}
            </p>
          )}
        </GlassCard>

        {plan && (
          <>
            <GlassCard>
              <h2 className="page-title" style={{ fontSize: 24, marginBottom: 8 }}>
                {plan.headline}
              </h2>
              <p className="muted">{plan.encouragement}</p>
            </GlassCard>

            <GlassCard title={t.brain.focusTitle}>
              <ul className={rs.goalList}>
                {(['school', 'gym', 'hustle', 'money'] as const)
                  .filter((p) => plan.focus[p])
                  .map((p) => (
                    <li key={p} style={{ '--item-color': REVIEW_COLORS[p] } as CSSProperties}>
                      <strong>{t.review.pillars[p]}</strong>
                      <span>{plan.focus[p]}</span>
                    </li>
                  ))}
              </ul>
            </GlassCard>

            <GlassCard title={t.brain.tasksTitle}>
              <p className="faint small" style={{ marginBottom: 6 }}>
                {t.brain.tasksHint}
              </p>
              <div className="list">
                {plan.tasks.map((task, i) => (
                  <div key={i} className="list-row" style={{ cursor: 'default', '--item-color': PILLAR_COLOR[task.pillar] } as CSSProperties}>
                    <span className="list-icon" style={{ fontSize: 13, fontWeight: 750 }}>
                      {i + 1}
                    </span>
                    <span className="list-text">
                      <span className="list-label">{task.title}</span>
                      <span className="list-sub">{[t.coach.minutes(task.minutes), task.why].filter(Boolean).join(' · ')}</span>
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {plan.days.length > 0 && (
              <GlassCard title={t.brain.daysTitle}>
                <div className="list">
                  {plan.days.map((d) => (
                    <ListRow key={d.day} label={t.week.days[d.day]} sub={d.note} />
                  ))}
                </div>
              </GlassCard>
            )}

            {plan.habit.title && (
              <GlassCard title={t.brain.habitTitle}>
                <p className="list-label">{plan.habit.title}</p>
                <p className="muted small">{plan.habit.why}</p>
              </GlassCard>
            )}

            {plan.watchOut.length > 0 && (
              <GlassCard title={t.brain.watchTitle}>
                <div className="list">
                  {plan.watchOut.map((w) => (
                    <ListRow key={w} icon={AlertTriangle} color="var(--c-fun)" label={w} />
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        )}

        <p className="faint small" style={{ margin: '0 4px' }}>
          {t.brain.privacy}
        </p>
      </div>
    </>
  );
}
