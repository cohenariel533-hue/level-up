import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, NotebookPen } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, GlassCard, ListRow, PageHeader, StepCard, useToast } from '../../components/ui';
import { saveReview } from '../../db/review';
import { db, type ReviewPillar, type WeeklyReview } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatShortDate, toISODate, weekStart } from '../../lib/dates';
import {
  autoMinimums,
  countHit,
  defaultReviewWeek,
  hustleMinimum,
  previousWeek,
  REVIEW_PILLARS,
  type WeekFacts,
} from '../../lib/review';
import { GoalList, hasGoals, REVIEW_COLORS } from './GoalList';
import { loadWeekFacts } from './loadWeekFacts';
import s from './review.module.css';

/**
 * The Saturday weekly review: minimums, wins, obstacles and next week's
 * goals, saved per week, with past reviews underneath.
 * /review opens the right week automatically; /review/2026-11-01 opens that week.
 */
export default function ReviewScreen() {
  const { week: weekParam } = useParams();
  const reviews = useLiveQuery(() => db.reviews.toArray());
  if (!reviews) return null;

  const thisWeek = toISODate(weekStart());
  const week = weekParam ?? defaultReviewWeek(new Date(), new Set(reviews.map((r) => r.weekStart)));
  const history = [...reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return (
    <>
      {weekParam && weekParam !== thisWeek && (
        <Link to="/review" className="btn btn-ghost" style={{ marginInlineStart: -10 }}>
          <ChevronLeft aria-hidden="true" />
          {t.review.backToThisWeek}
        </Link>
      )}
      <PageHeader eyebrow={t.review.eyebrow(formatShortDate(week))} title={t.review.title} />

      <div className="stack">
        {/* key = week, so switching weeks starts a fresh form */}
        <ReviewForm key={week} week={week} isThisWeek={week === thisWeek} />

        <GlassCard title={t.review.historyTitle}>
          {history.length === 0 ? (
            <p className="muted small">{t.review.noHistory}</p>
          ) : (
            <div className="list">
              {history.map((r) => (
                <ListRow
                  key={r.weekStart}
                  icon={NotebookPen}
                  color="var(--c-review)"
                  label={t.money.check.weekOf(formatShortDate(r.weekStart))}
                  sub={[t.review.historyRow(countHit(r.minimums)), r.wins].filter(Boolean).join(' · ')}
                  to={`/review/${r.weekStart}`}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

function ReviewForm({ week, isThisWeek }: { week: string; isThisWeek: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();

  const data = useLiveQuery(async () => {
    const [facts, existing, previous] = await Promise.all([
      loadWeekFacts(week),
      db.reviews.get(week),
      db.reviews.get(previousWeek(week)),
    ]);
    return { facts, existing, previous };
  }, [week]);

  const [minimums, setMinimums] = useState<Record<ReviewPillar, boolean> | null>(null);
  const [wins, setWins] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [goals, setGoals] = useState<Record<ReviewPillar, string>>({ school: '', gym: '', hustle: '', money: '' });

  // Fill the form once: from the saved review if there is one, else from the week's data.
  const filled = useRef(false);
  useEffect(() => {
    if (!data || filled.current) return;
    filled.current = true;
    if (data.existing) {
      setMinimums(data.existing.minimums);
      setWins(data.existing.wins);
      setObstacles(data.existing.obstacles);
      setGoals(data.existing.nextGoals);
    } else {
      setMinimums(autoMinimums(data.facts));
    }
  }, [data]);

  // Doing the money check from here ticks it automatically.
  useEffect(() => {
    if (data?.facts.moneyCheckDone) setMinimums((m) => (m && !m.money ? { ...m, money: true } : m));
  }, [data?.facts.moneyCheckDone]);

  if (!data || !minimums) return null;
  const { facts, existing, previous } = data;
  const hit = countHit(minimums);

  async function save() {
    if (!minimums) return;
    const review: Omit<WeeklyReview, 'completedAt'> = {
      weekStart: week,
      minimums,
      stats: {
        schoolDone: facts.schoolDone,
        schoolPlanned: facts.schoolPlanned,
        gymSessions: facts.gymSessions,
        hustleHours: facts.hustleHours,
      },
      wins,
      obstacles,
      nextGoals: goals,
    };
    await saveReview(review);
    toast(t.review.saved);
    navigate('/');
  }

  return (
    <>
      {!isThisWeek && !existing && (
        <Link to={`/review/${toISODate(weekStart())}`} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
          {t.review.reviewThisWeek}
        </Link>
      )}

      {hasGoals(previous?.nextGoals) && (
        <GlassCard title={t.review.lastWeekGoals}>
          <GoalList goals={previous!.nextGoals} />
        </GlassCard>
      )}

      <StepCard number={1} title={t.review.step1} color="var(--c-review)">
        <MinimumsList facts={facts} minimums={minimums} onChange={setMinimums} />
        <p className="faint small" style={{ marginTop: 10 }}>
          {t.review.adjustHint}
        </p>
        <p className={s.hitCount}>{t.review.hitCount(hit)}</p>
      </StepCard>

      <StepCard number={2} title={t.review.step2} color="var(--c-review)">
        <textarea
          className="input"
          rows={3}
          value={wins}
          placeholder={t.review.winsPlaceholder}
          aria-label={t.review.step2}
          onChange={(e) => setWins(e.target.value)}
        />
      </StepCard>

      <StepCard number={3} title={t.review.step3} color="var(--c-review)">
        <textarea
          className="input"
          rows={3}
          value={obstacles}
          placeholder={t.review.obstaclesPlaceholder}
          aria-label={t.review.step3}
          onChange={(e) => setObstacles(e.target.value)}
        />
      </StepCard>

      <StepCard number={4} title={t.review.step4} color="var(--c-review)">
        {REVIEW_PILLARS.map((p) => (
          <label key={p} className={s.goalRow} style={{ '--item-color': REVIEW_COLORS[p] } as CSSProperties}>
            <span className={s.goalLabel}>
              <span className={s.dot} />
              {t.review.pillars[p]}
            </span>
            <input
              className="input"
              value={goals[p]}
              placeholder={t.review.goalPlaceholders[p]}
              onChange={(e) => setGoals({ ...goals, [p]: e.target.value })}
            />
          </label>
        ))}
      </StepCard>

      <Button variant="primary" size="lg" block onClick={save} style={{ '--accent': 'var(--c-review)' } as CSSProperties}>
        {existing ? t.review.update : t.review.save}
      </Button>
    </>
  );
}

/** The four minimums, each pre-ticked from the data and tappable. */
function MinimumsList({
  facts,
  minimums,
  onChange,
}: {
  facts: WeekFacts;
  minimums: Record<ReviewPillar, boolean>;
  onChange: (m: Record<ReviewPillar, boolean>) => void;
}) {
  const labels: Record<ReviewPillar, string> = {
    school: t.review.minimumSchool(facts.schoolDone, facts.schoolPlanned),
    gym: t.review.minimumGym(facts.gymSessions, facts.gymMinimum),
    hustle: t.review.minimumHustle(facts.hustleHours, hustleMinimum(facts.examMode)),
    money: t.review.minimumMoney(facts.moneyCheckDone),
  };

  return (
    <div>
      {REVIEW_PILLARS.map((p) => (
        <div key={p} className={s.minimumRow}>
          <button
            type="button"
            role="checkbox"
            aria-checked={minimums[p]}
            className={s.minimum}
            onClick={() => onChange({ ...minimums, [p]: !minimums[p] })}
          >
            <span className={s.tick}>
              <Check aria-hidden="true" strokeWidth={3} />
            </span>
            <span className={s.minimumText}>{labels[p]}</span>
          </button>
          {p === 'money' && !facts.moneyCheckDone && (
            <Link to="/money/check" className="btn btn-subtle" style={{ minHeight: 34, padding: '4px 12px', fontSize: 14 }}>
              {t.review.doMoneyCheck}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
