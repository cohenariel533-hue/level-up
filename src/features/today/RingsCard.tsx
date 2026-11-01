import { GraduationCap, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard, ProgressRing, Toggle } from '../../components/ui';
import { setSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import { formatDuration, formatHours } from '../../lib/time';
import s from '../week/week.module.css';
import type { WeekRings } from './useWeekProgress';

/** The four weekly rings, plus the exam-mode switch that lowers the targets. */
export function RingsCard({ rings }: { rings: WeekRings }) {
  const { progress, targets, examMode, moneyCheckDone } = rings;
  const hustleHours = progress.hustleMinutes / 60;
  const gymMinimumMet = progress.gym >= targets.gymMinimum && progress.gym < targets.gym;

  return (
    <GlassCard title={t.today.weekTitle}>
      <div className="rings">
        <ProgressRing value={progress.gym} max={targets.gym} label={t.today.rings.gym} color="var(--c-gym)" />
        <ProgressRing
          value={hustleHours}
          max={targets.hustleHours}
          label={t.today.rings.hustle}
          color="var(--c-hustle)"
          display={`${formatHours(hustleHours)}/${targets.hustleHours}`}
        />
        <ProgressRing
          value={progress.youtube}
          max={targets.youtube}
          label={t.today.rings.youtube}
          color="var(--c-youtube)"
          display={targets.youtube === 0 ? t.today.paused : undefined}
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
