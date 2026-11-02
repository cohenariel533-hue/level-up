import { TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button, GlassCard, useToast } from '../../components/ui';
import { acceptShift, skipShift } from '../../db/shifts';
import type { ActivityDay, WeeklyShift } from '../../db/schema';
import { t } from '../../i18n/en';
import type { Profile } from '../../lib/profile';
import { daysOnTarget } from '../../lib/rhythm';

/** The words for a shift: a short title and one line of why. */
export function shiftText(shift: WeeklyShift, profile: Profile) {
  const s = t.rhythm.shifts;
  const from = shift.from ?? '';
  switch (shift.kind) {
    case 'wake':
      return s.wake(from, shift.target!);
    case 'bed':
      return s.bed(from, shift.target!);
    case 'gymTime':
      return s.gymTime(from, shift.target!);
    case 'hustlePeak':
      return s.hustlePeak(from, t.rhythm.peaks[profile.energyPeak]);
    case 'weakDay':
      return s.weakDay(t.week.days[shift.weekday ?? 0]);
  }
}

/**
 * This week's 1% shift: offered (accept / not this week) or accepted (with
 * days on target so far for wake-up and bedtime shifts).
 */
export function ShiftCard({
  shift,
  profile,
  activity,
  today,
}: {
  shift: WeeklyShift;
  profile: Profile;
  activity: ActivityDay[];
  today: string;
}) {
  const toast = useToast();
  const text = shiftText(shift, profile);
  const timed = (shift.kind === 'wake' || shift.kind === 'bed') && shift.target;
  const progress = timed ? daysOnTarget(shift.kind as 'wake' | 'bed', shift.target!, activity, shift.weekStart, today) : null;

  return (
    <GlassCard strong={shift.status === 'offered'} title={t.rhythm.shiftTitle} style={{ '--item-color': 'var(--c-review)' } as CSSProperties}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="list-icon">
          <TrendingUp aria-hidden="true" />
        </span>
        <span className="list-text">
          <span className="list-label">{text.title}</span>
          <span className="list-sub">{text.detail}</span>
        </span>
      </div>

      {shift.status === 'offered' && (
        <div className="cluster" style={{ marginTop: 14 }}>
          <Button
            variant="primary"
            onClick={async () => {
              await acceptShift(shift.weekStart);
              toast(t.rhythm.accepted);
            }}
            style={{ '--accent': 'var(--c-review)' } as CSSProperties}
          >
            {t.rhythm.accept}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await skipShift(shift.weekStart);
              toast(t.rhythm.skipped);
            }}
          >
            {t.rhythm.skip}
          </Button>
        </div>
      )}
      {shift.status === 'accepted' && progress && progress.of > 0 && (
        <p className="small" style={{ marginTop: 12, color: 'var(--c-review)', fontWeight: 600 }}>
          {t.rhythm.progress(progress.hit, progress.of)}
        </p>
      )}
    </GlassCard>
  );
}
