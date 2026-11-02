import { Sparkles } from 'lucide-react';
import { GlassCard, ListRow } from '../../components/ui';
import { usePlan } from '../../db/brain';
import { useSetting } from '../../db/settings';
import { t } from '../../i18n/en';

/**
 * On Today: this week's headline from Claude's plan, or (on weekends, when
 * Study Planner is connected and there's no plan yet) an invitation to make one.
 */
export function BrainCard() {
  const plan = usePlan();
  const connected = !!useSetting('studyPlannerKey');
  if (plan === undefined || !connected) return null;

  if (plan) {
    return (
      <GlassCard>
        <div className="list">
          <ListRow to="/plan" icon={Sparkles} color="var(--c-review)" label={t.brain.todayHeadline} sub={plan.plan.headline} />
        </div>
      </GlassCard>
    );
  }
  const weekend = [0, 6].includes(new Date().getDay());
  if (!weekend) return null;
  return (
    <GlassCard strong>
      <div className="list">
        <ListRow to="/plan" icon={Sparkles} color="var(--c-review)" label={t.brain.todayTitle} sub={t.brain.todayBody} />
      </div>
    </GlassCard>
  );
}
