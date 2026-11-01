import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../../../i18n/en';
import { formatMonth, monthKey, shiftMonth } from '../../../lib/dates';
import s from '../money.module.css';

/** ‹ November 2026 › — browse past months. The future is locked. */
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className={`glass ${s.monthSwitch}`}>
      <button type="button" aria-label={t.money.prevMonth} onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <span>{formatMonth(month)}</span>
      <button
        type="button"
        aria-label={t.money.nextMonth}
        disabled={month >= monthKey()}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
