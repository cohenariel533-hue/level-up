import { useLiveQuery } from 'dexie-react-hooks';
import { Dumbbell, Lightbulb, Moon, Rocket, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { GlassCard, ListRow, PageHeader } from '../../components/ui';
import { ensureWeekShift } from '../../db/shifts';
import { t } from '../../i18n/en';
import { MIN_DAYS, type Insight } from '../../lib/rhythm';
import { formatDuration, fromMinutes } from '../../lib/time';
import { loadRhythm } from './loadRhythm';
import { ShiftCard } from './ShiftCard';

/** My rhythm: your real day vs your goals, this week's 1% shift, and patterns. */
export default function RhythmScreen() {
  useEffect(() => {
    void ensureWeekShift();
  }, []);
  const data = useLiveQuery(() => loadRhythm());
  if (!data) return null;

  const { rhythm, profile } = data;
  const time = (m: number | null) => (m === null ? t.rhythm.unknown : fromMinutes(m));

  return (
    <>
      <PageHeader title={t.rhythm.title} />
      <p className="muted" style={{ margin: '-10px 4px 18px' }}>
        {t.rhythm.intro}
      </p>

      <div className="stack">
        {data.shift && data.shift.status !== 'skipped' && (
          <ShiftCard shift={data.shift} profile={profile} activity={data.activity} today={data.today} />
        )}

        <GlassCard
          title={t.rhythm.realDay}
          action={rhythm.sampleDays >= MIN_DAYS && <span className="faint small">{t.rhythm.basedOn(rhythm.sampleDays)}</span>}
        >
          {rhythm.sampleDays < MIN_DAYS && (
            <p className="muted small" style={{ marginBottom: 8 }}>
              {t.rhythm.notEnough(rhythm.sampleDays, MIN_DAYS)}
            </p>
          )}
          <div className="list">
            <ListRow icon={Sun} color="var(--c-fun)" label={t.rhythm.wake} sub={t.rhythm.goal(profile.wakeGoal)} detail={time(rhythm.wake)} />
            <ListRow icon={Dumbbell} color="var(--c-gym)" label={t.rhythm.gym} detail={time(rhythm.gymStart)} />
            <ListRow icon={Rocket} color="var(--c-hustle)" label={t.rhythm.hustle} detail={time(rhythm.hustleStart)} />
            <ListRow icon={Moon} color="var(--c-school)" label={t.rhythm.bed} sub={t.rhythm.goal(profile.bedGoal)} detail={time(rhythm.bed)} />
          </div>
          {!data.shift && rhythm.sampleDays >= MIN_DAYS && (
            <p className="faint small" style={{ marginTop: 10 }}>
              {t.rhythm.noShift}
            </p>
          )}
        </GlassCard>

        <GlassCard title={t.rhythm.patternsTitle}>
          {rhythm.insights.length === 0 ? (
            <p className="muted small">{t.rhythm.noPatterns}</p>
          ) : (
            <div className="list">
              {rhythm.insights.map((insight) => (
                <ListRow key={insight.kind} icon={Lightbulb} color="var(--c-review)" label={insightText(insight)} />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}

function insightText(i: Insight): string {
  const x = t.rhythm.insights;
  switch (i.kind) {
    case 'gymStudy':
      return x.gymStudy(i.diff);
    case 'lateSpending':
      return x.lateSpending(i.share);
    case 'bestHustleDay':
      return x.bestHustleDay(t.week.days[i.weekday]);
    case 'weakDay':
      return x.weakDay(t.week.days[i.weekday], i.rate);
    case 'wakeSwing':
      return x.wakeSwing(formatDuration(i.spread));
  }
}
