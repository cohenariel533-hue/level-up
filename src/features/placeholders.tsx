/**
 * Temporary screens for pillars that haven't been built yet. Each one moves
 * into its own folder (like features/money/ and features/week/) in its stage.
 */
import { Clapperboard, Dumbbell, NotebookPen, Rocket } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';
import { PageHeader } from '../components/ui';
import { t } from '../i18n/en';

export function HustleScreen() {
  return (
    <>
      <PageHeader title={t.nav.hustle} />
      <ComingSoon
        stage={4}
        icon={Rocket}
        color="var(--c-hustle)"
        title="Gift-site business"
        features={[
          'Orders board: Lead → Paid → Building → Delivered → Review',
          'Start/stop hours timer',
          'Earnings, customers and ₪ per hour',
          '90-day goal: 10 customers and ₪1,500 by 31 Jan 2027',
        ]}
      />
    </>
  );
}

export function GymScreen() {
  return (
    <>
      <PageHeader title={t.nav.gym} />
      <ComingSoon
        stage={5}
        icon={Dumbbell}
        color="var(--c-gym)"
        title="Beat last time"
        features={['Log Upper / Lower / Full / Cardio', 'See your last numbers for every exercise', '4 a week (3 minimum) and a streak']}
      />
    </>
  );
}

export function YouTubeScreen() {
  return (
    <>
      <PageHeader title={t.nav.youtube} />
      <ComingSoon
        stage={6}
        icon={Clapperboard}
        color="var(--c-youtube)"
        title="Psychology & philosophy channel"
        features={[
          'Pipeline: Idea → Script → Voiceover → Edit → Uploaded',
          'Separate lanes for long videos and Shorts',
          'First up: “The Skill We Didn’t Notice We Lost”',
        ]}
      />
    </>
  );
}

export function ReviewScreen() {
  return (
    <>
      <PageHeader title={t.nav.review} />
      <ComingSoon
        stage={7}
        icon={NotebookPen}
        color="var(--c-review)"
        title="Saturday review"
        features={['Did I hit the minimums?', 'Wins and what got in the way', 'One goal per pillar for next week', 'History of past reviews']}
      />
    </>
  );
}
