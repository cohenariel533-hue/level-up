import { PageHeader } from '../../components/ui';
import { t } from '../../i18n/en';
import { formatLongDate, greetingFor, todayISO } from '../../lib/dates';
import { FocusCard } from './FocusCard';
import { RingsCard } from './RingsCard';
import { TodayBlocks } from './TodayBlocks';
import { useWeekProgress } from './useWeekProgress';

/** Home: today's focus, this week's rings, and today's blocks to tick off. */
export default function TodayScreen() {
  const now = new Date();
  const date = todayISO();
  const rings = useWeekProgress(now);

  return (
    <>
      <PageHeader eyebrow={formatLongDate(now)} title={t.greeting[greetingFor(now.getHours())]} />

      <div className="stack">
        <FocusCard date={date} />
        {rings && <RingsCard rings={rings} />}
        <TodayBlocks date={date} weekday={now.getDay()} examMode={rings?.examMode ?? false} />
      </div>
    </>
  );
}
