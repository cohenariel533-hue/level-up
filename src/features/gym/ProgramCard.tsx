import { Play, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button, GlassCard } from '../../components/ui';
import { t } from '../../i18n/en';
import type { Program, SessionPlan, Target } from '../../lib/program';
import type { Profile } from '../../lib/profile';
import s from './gym.module.css';

/** Your split, the next session with today's target for every exercise, and a button to start it. */
export function ProgramCard({
  program,
  plan,
  profile,
  onStart,
}: {
  program: Program;
  plan: SessionPlan;
  profile: Profile;
  onStart: () => void;
}) {
  return (
    <GlassCard title={t.gym.program.title} style={{ '--item-color': 'var(--c-gym)' } as CSSProperties}>
      <p className="small" style={{ margin: '-6px 0 14px', color: 'var(--c-gym)', fontWeight: 650 }}>
        {t.gym.program.splits[program.splitKey]}
      </p>

      <p className="eyebrow">{t.gym.program.next}</p>
      <h3 className={s.sessionTitle}>{t.gym.program.days[plan.day.id as keyof typeof t.gym.program.days]}</h3>
      {plan.examWeek && <p className="small muted" style={{ marginBottom: 8 }}>{t.gym.program.examWeek}</p>}
      {plan.comingBack && <p className="small muted" style={{ marginBottom: 8 }}>{t.gym.program.comingBack}</p>}

      <div className="list" style={{ marginBottom: 14 }}>
        {plan.targets.map((target) => {
          const exercise = plan.day.exercises.find((e) => e.name === target.name)!;
          return (
            <div key={target.name} className={s.targetRow}>
              <span className="list-text">
                <span className="list-label">{target.name}</span>
                <span className="list-sub">{reasonText(target, exercise.step)}</span>
              </span>
              <span className={s.targetValue}>
                {target.reason === 'up' && <TrendingUp aria-hidden="true" />}
                {formatTarget(target)}
              </span>
            </div>
          );
        })}
      </div>

      <Button variant="primary" size="lg" block icon={<Play />} onClick={onStart} style={{ '--accent': 'var(--c-gym)' } as CSSProperties}>
        {t.gym.program.start}
      </Button>
      <p className="faint small" style={{ marginTop: 12 }}>
        {t.gym.program.howItWorks}{' '}
        <Link to="/me" style={{ color: 'inherit' }}>
          {t.gym.program.setup(t.me.gymSetups[profile.gymSetup], t.me.gymLevels[profile.gymLevel])}
        </Link>
      </p>
    </GlassCard>
  );
}

/** "3×8 @ 62.5kg", "3×10" (bodyweight) or "3×6 @ your weight" (first time). */
export function formatTarget(target: Target): string {
  const base = `${target.sets}×${target.reps}`;
  if (target.weight === null) return `${base} @ ${t.gym.program.chooseWeight}`;
  return target.weight > 0 ? `${base} @ ${target.weight}kg` : base;
}

function reasonText(target: Target, step: number): string {
  const r = t.gym.program.reasons;
  if (target.reason === 'up') return r.up(step);
  return r[target.reason];
}
