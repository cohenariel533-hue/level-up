import { useLiveQuery } from 'dexie-react-hooks';
import { NotebookPen } from 'lucide-react';
import { GlassCard, ListRow } from '../../components/ui';
import { db } from '../../db/schema';
import { t } from '../../i18n/en';
import { toISODate, weekStart } from '../../lib/dates';
import { previousWeek } from '../../lib/review';
import { GoalList, hasGoals } from '../review/GoalList';

/**
 * Two small things from the weekly review on Today:
 * - On Saturday, until it's done: a nudge to do this week's review.
 * - All week: the goals you set in last week's review.
 */
export function ReviewCard() {
  const thisWeek = toISODate(weekStart());
  const data = useLiveQuery(async () => {
    const [current, last] = await Promise.all([db.reviews.get(thisWeek), db.reviews.get(previousWeek(thisWeek))]);
    return { reviewedThisWeek: !!current, goals: last?.nextGoals };
  }, [thisWeek]);

  if (!data) return null;
  const showNudge = new Date().getDay() === 6 && !data.reviewedThisWeek;

  return (
    <>
      {showNudge && (
        <GlassCard strong>
          <div className="list">
            <ListRow
              to="/review"
              icon={NotebookPen}
              color="var(--c-review)"
              label={t.review.todayNudgeTitle}
              sub={t.review.todayNudge}
            />
          </div>
        </GlassCard>
      )}
      {hasGoals(data.goals) && (
        <GlassCard title={t.review.weekGoalsTitle}>
          <GoalList goals={data.goals!} />
        </GlassCard>
      )}
    </>
  );
}
