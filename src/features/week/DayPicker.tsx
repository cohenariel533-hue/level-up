import { t } from '../../i18n/en';
import s from './week.module.css';

/** Sun … Sat. A dot marks today. */
export function DayPicker({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  const today = new Date().getDay();
  return (
    <div className={`glass ${s.dayPicker}`} role="group" aria-label={t.week.day}>
      {t.week.daysShort.map((label, day) => (
        <button
          key={label}
          type="button"
          className={s.dayButton}
          aria-pressed={value === day}
          aria-label={t.week.days[day]}
          onClick={() => onChange(day)}
        >
          {label}
          {day === today && <span className={s.todayDot} />}
        </button>
      ))}
    </div>
  );
}
