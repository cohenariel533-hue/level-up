import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Button, GlassCard, ProgressBar, useToast } from '../../components/ui';
import { togglePathStep } from '../../db/hustle';
import type { Order } from '../../db/schema';
import { useSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import { PATH_LEVELS, pathFacts, pathStatus, type PathStep } from '../../lib/hustlePath';
import { DEFAULT_PROFILE } from '../../lib/profile';
import { formatDuration } from '../../lib/time';
import s from './hustle.module.css';

const text = (step: PathStep) => t.path.steps[step.id as keyof typeof t.path.steps];

/** The hustle path: the next step (with how-to tips), what's after it, and the whole ladder on demand. */
export function PathCard({ orders }: { orders: Order[] }) {
  const toast = useToast();
  const done = useSetting('hustlePathDone');
  const profile = useSetting('profile') ?? DEFAULT_PROFILE;
  const [showAll, setShowAll] = useState(false);
  if (!done) return null;

  const status = pathStatus(done, pathFacts(orders), profile.hustleStage);
  const { current } = status;

  async function finish(step: PathStep) {
    await togglePathStep(step.id);
    toast(t.path.stepDone);
  }

  return (
    <GlassCard
      title={t.path.title}
      style={{ '--item-color': 'var(--c-hustle)' } as CSSProperties}
    >
      <p className="small" style={{ margin: '-6px 0 10px', color: 'var(--c-hustle)', fontWeight: 650 }}>
        {t.path.level(status.levelIndex + 1, PATH_LEVELS.length, t.path.levels[PATH_LEVELS[status.levelIndex]])}
      </p>
      <ProgressBar value={status.levelDone} max={status.levelTotal} color="var(--c-hustle)" />

      {current ? (
        <div className={s.pathNext}>
          <p className="eyebrow">{t.path.next}</p>
          <h3 className={s.pathTitle}>{text(current).title}</h3>
          <p className="muted small">{text(current).why}</p>
          <ul className="checklist" style={{ margin: '10px 0 12px' }}>
            {text(current).tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <p className="faint small" style={{ marginBottom: 12 }}>
            ~{formatDuration(current.minutes)}
            {current.auto && ` · ${t.path.autoHint}`}
          </p>
          {!current.auto && (
            <Button variant="primary" block onClick={() => finish(current)} style={{ '--accent': 'var(--c-hustle)' } as CSSProperties}>
              {t.path.markDone}
            </Button>
          )}
        </div>
      ) : (
        <p className="small" style={{ marginTop: 14, color: 'var(--c-money)', fontWeight: 600 }}>
          <Sparkles size={14} aria-hidden="true" /> {t.path.complete}
        </p>
      )}

      {status.upcoming.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {t.path.upNext}
          </p>
          {status.upcoming.map((step) => (
            <p key={step.id} className="muted small" style={{ padding: '4px 0' }}>
              {text(step).title}
            </p>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        icon={showAll ? <ChevronUp /> : <ChevronDown />}
        onClick={() => setShowAll(!showAll)}
        style={{ marginTop: 6 }}
      >
        {showAll ? t.path.hideAll : t.path.showAll}
      </Button>

      {showAll && (
        <div className={s.pathAll}>
          {PATH_LEVELS.map((level) => (
            <div key={level}>
              <p className="eyebrow" style={{ margin: '12px 0 4px' }}>
                {t.path.levels[level]}
              </p>
              {status.steps
                .filter((x) => x.step.level === level)
                .map(({ step, state }) => {
                  const finished = state !== 'open';
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={s.pathStep}
                      aria-pressed={finished}
                      // Only your own ticks can be undone; self-ticking and skipped steps follow the data.
                      disabled={state !== 'done'}
                      title={state === 'done' ? t.path.undo : undefined}
                      onClick={() => togglePathStep(step.id)}
                    >
                      <span className={s.pathTick}>{finished && <Check aria-hidden="true" strokeWidth={3} />}</span>
                      <span className={finished ? 'faint' : undefined}>{text(step).title}</span>
                    </button>
                  );
                })}
            </div>
          ))}
          {profile.hustleStage !== 'notStarted' && <p className="faint small" style={{ marginTop: 10 }}>{t.path.startedAt}</p>}
        </div>
      )}
    </GlassCard>
  );
}
