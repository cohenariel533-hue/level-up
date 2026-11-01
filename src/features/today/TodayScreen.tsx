import { useLiveQuery } from 'dexie-react-hooks';
import { ListChecks } from 'lucide-react';
import { ComingSoon } from '../../components/ComingSoon';
import { GlassCard, PageHeader, ProgressRing } from '../../components/ui';
import { db } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatLongDate, greetingFor, toISODate, weekStart } from '../../lib/dates';

export default function TodayScreen() {
  const now = new Date();
  const weekStartISO = toISODate(weekStart(now));
  const moneyCheckDone = useLiveQuery(async () => !!(await db.moneyChecks.get(weekStartISO)), [weekStartISO]);

  return (
    <>
      <PageHeader eyebrow={formatLongDate(now)} title={t.greeting[greetingFor(now.getHours())]} />

      <div className="stack">
        {/* Weekly rings. Money check is live; the rest arrive with their stages (3–5). */}
        <GlassCard title={t.today.weekTitle}>
          <div className="rings">
            <ProgressRing value={0} max={4} label={t.today.rings.gym} color="var(--c-gym)" />
            <ProgressRing value={0} max={7} label={t.today.rings.hustle} color="var(--c-hustle)" display="0h" />
            <ProgressRing value={0} max={2} label={t.today.rings.youtube} color="var(--c-youtube)" />
            <ProgressRing
              value={moneyCheckDone ? 1 : 0}
              max={1}
              label={t.today.rings.money}
              color="var(--c-money)"
              display={moneyCheckDone ? '✓' : '—'}
            />
          </div>
        </GlassCard>

        <ComingSoon
          stage={3}
          icon={ListChecks}
          color="var(--accent)"
          title="Your day, block by block"
          features={[
            'Today’s blocks from your weekly template, each one tickable',
            'The one thing that matters today, typed each morning',
            'Live rings for gym, hustle hours, YouTube and the money check',
            'Exam mode: lighter targets when exams are on',
          ]}
        />
      </div>
    </>
  );
}
