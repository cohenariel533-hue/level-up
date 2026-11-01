import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardCheck } from 'lucide-react';
import { GlassCard, ListRow } from '../../../components/ui';
import { db } from '../../../db/schema';
import { t } from '../../../i18n/en';
import { toISODate, weekStart } from '../../../lib/dates';

/** Entry point to the Saturday money check. Stands out on Saturdays. */
export function MoneyCheckCard() {
  const weekStartISO = toISODate(weekStart());
  const check = useLiveQuery(() => db.moneyChecks.get(weekStartISO), [weekStartISO]);
  const isSaturday = new Date().getDay() === 6;

  return (
    <GlassCard strong={isSaturday && !check}>
      <div className="list">
        <ListRow
          to="/money/check"
          icon={ClipboardCheck}
          color="var(--c-money)"
          label={t.money.check.cardTitle}
          sub={check ? t.money.check.doneThisWeek : isSaturday ? t.money.check.cardToday : t.money.check.cardBody}
          detail={check ? <span className="chip" style={{ ['--item-color' as string]: 'var(--c-money)' }}>✓</span> : undefined}
        />
      </div>
    </GlassCard>
  );
}
