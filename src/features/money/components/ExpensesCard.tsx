import { Fragment, type CSSProperties } from 'react';
import { GlassCard } from '../../../components/ui';
import type { Expense } from '../../../db/schema';
import { t } from '../../../i18n/en';
import { formatDayShort } from '../../../lib/dates';
import { formatILS } from '../../../lib/format';
import { categoryById, categoryLabel, KIND_COLOR, kindOf } from '../categories';
import s from '../money.module.css';

/** This month's expenses, newest first, grouped by day. Tap one to edit it. */
export function ExpensesCard({
  expenses,
  kinds,
  onSelect,
}: {
  expenses: Expense[];
  kinds: Record<string, 'need' | 'fun'>;
  onSelect: (expense: Expense) => void;
}) {
  return (
    <GlassCard title={t.money.spendingTitle}>
      {expenses.length === 0 ? (
        <p className="muted small">{t.money.noExpenses}</p>
      ) : (
        <div className="list">
          {expenses.map((e, i) => {
            const category = categoryById(e.category);
            const Icon = category.icon;
            const newDay = i === 0 || expenses[i - 1].date !== e.date;
            return (
              <Fragment key={e.id}>
                {newDay && <p className={s.dayLabel}>{formatDayShort(e.date)}</p>}
                <button
                  type="button"
                  className="list-row"
                  style={{ '--item-color': KIND_COLOR[kindOf(e.category, kinds)] } as CSSProperties}
                  onClick={() => onSelect(e)}
                >
                  <span className="list-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="list-text">
                    <span className="list-label">{categoryLabel(e.category)}</span>
                    {e.note && <span className="list-sub">{e.note}</span>}
                  </span>
                  <span className={s.amount}>{formatILS(e.amount)}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
