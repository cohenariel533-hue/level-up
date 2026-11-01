/**
 * Temporary screens for pillars that haven't been built yet. Each one moves
 * into its own folder (features/money/MoneyScreen.tsx etc.) in its stage.
 */
import { CalendarDays, Clapperboard, Dumbbell, NotebookPen, Rocket, Wallet } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';
import { PageHeader } from '../components/ui';
import { t } from '../i18n/en';

export function MoneyScreen() {
  return (
    <>
      <PageHeader title={t.nav.money} />
      <ComingSoon
        stage={2}
        icon={Wallet}
        color="var(--c-money)"
        title="Every shekel, with a plan"
        features={[
          'Allowance and hustle income, auto-split 60 / 25 / 15',
          'Two-tap expense entry with need/fun categories',
          'What’s left in each bucket this month',
          'Savings goals: ₪1,500 buffer first',
          '48-hour rule wait list and the Saturday money check',
        ]}
      />
    </>
  );
}

export function WeekScreen() {
  return (
    <>
      <PageHeader title={t.nav.week} />
      <ComingSoon
        stage={3}
        icon={CalendarDays}
        color="var(--c-school)"
        title="Your ideal week"
        features={[
          'Editable Sunday–Saturday template',
          'Real class times as locked school blocks',
          'Export to Apple Calendar (.ics)',
        ]}
      />
    </>
  );
}

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
