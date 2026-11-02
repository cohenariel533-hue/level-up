import { GraduationCap, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard, ProgressRing, Toggle } from '../../components/ui';
import { setSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import { formatDuration, formatHours } from '../../lib/time';
import s from '../week/week.module.css';
import type { WeekRings } from './useWeekProgress';

/** Study hours this week from Study Planner, when it's connected. */
export interface StudyRing {
  minutes: number;
  goalHours: number;
}

/** The weekly rings (Study joins when Study Planner is connected), plus the exam-mode switch. */
export function RingsCard({ rings, study }: { rings: WeekRings; study?: StudyRing | null }) {
  const { progress, targets, examMode, moneyCheckDone } = rings;
  const hustleHours = progress.hustleMinutes / 60;
  const gymMinimumMet = progress.gym >= targets.gymMinimum && progress.gym < targets.gym;

  return (
    <GlassCard title={t.today.weekTitle}>
      <div className="rings">
        {study && (
          <ProgressRing
            value={study.minutes / 60}
            max={study.goalHours}
            label={t.study.ring}
            color="var(--c-school)"
            display={`${formatHours(study.minutes / 60)}/${study.goalHours}`}
          />
        )}
        <ProgressRing value={progress.gym} max={targets.gym} label={t.today.rings.gym} color="var(--c-gym)" />
        <ProgressRing
          value={hustleHours}
          max={targets.hustleHours}
          label={t.today.rings.hustle}
          color="var(--c-hustle)"
          display={`${formatHours(hustleHours)}/${targets.hustleHours}`}
        />
        <ProgressRing
          value={moneyCheckDone ? 1 : 0}
          max={1}
          label={t.today.rings.money}
          color="var(--c-money)"
          display={moneyCheckDone ? '✓' : '—'}
        />
      </div>

      {rings.timerRunningSince && (
        <Link
          to="/hustle"
          className="chip"
          style={{ ['--item-color' as string]: 'var(--c-hustle)', marginTop: 14, gap: 6, textDecoration: 'none' }}
        >
          <Timer size={14} aria-hidden="true" />
          {t.hustle.timerOnToday(
            formatDuration(Math.max(1, Math.round((Date.now() - new Date(rings.timerRunningSince).getTime()) / 60_000))),
          )}
        </Link>
      )}

      {gymMinimumMet && (
        <p className="small" style={{ marginTop: 14, color: 'var(--c-gym)' }}>
          {t.today.gymMinimumMet}
        </p>
      )}

      <div className={s.examRow}>
        <span className="list-icon" style={{ ['--item-color' as string]: 'var(--c-school)' }}>
          <GraduationCap aria-hidden="true" />
        </span>
        <span className="list-text">
          <span className="list-label">{t.today.examMode}</span>
          <span className="list-sub">{examMode ? t.today.examModeOn : t.today.examModeOff}</span>
        </span>
        <Toggle checked={examMode} onChange={(v) => setSetting('examMode', v)} label={t.today.examMode} />
      </div>
    </GlassCard>
  );
}
