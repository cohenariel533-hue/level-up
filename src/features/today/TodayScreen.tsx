import { PageHeader } from '../../components/ui';
import { useSetting } from '../../db/settings';
import { useStudyFeed } from '../../db/studyFeed';
import { t } from '../../i18n/en';
import { formatLongDate, greetingFor, todayISO, toISODate, weekStart } from '../../lib/dates';
import { studyMinutesInWeek } from '../../lib/studyFeed';
import { FocusCard } from './FocusCard';
import { ReviewCard } from './ReviewCard';
import { RingsCard } from './RingsCard';
import { ComingUpCard, ExamModeSuggestion, StudyPlanCard } from './StudyCards';
import { TodayBlocks } from './TodayBlocks';
import { useWeekProgress } from './useWeekProgress';

/**
 * Home: today's focus, this week's rings, today's blocks to tick off and,
 * when Study Planner is connected, exams, deadlines and today's study plan.
 */
export default function TodayScreen() {
  const now = new Date();
  const date = todayISO();
  const rings = useWeekProgress();
  const study = useStudyFeed();
  const goalHours = useSetting('studyGoalHours') ?? 15;

  const studyRing = study ? { minutes: studyMinutesInWeek(study.feed, toISODate(weekStart(now))), goalHours } : null;

  return (
    <>
      <PageHeader eyebrow={formatLongDate(now)} title={t.greeting[greetingFor(now.getHours())]} />

      <div className="stack">
        <FocusCard date={date} />
        {study && rings && <ExamModeSuggestion cached={study} examMode={rings.examMode} />}
        <ReviewCard />
        {rings && <RingsCard rings={rings} study={studyRing} />}
        {study && <StudyPlanCard cached={study} />}
        <TodayBlocks date={date} weekday={now.getDay()} />
        {study && <ComingUpCard cached={study} />}
      </div>
    </>
  );
}
