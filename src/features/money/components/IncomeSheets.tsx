import { useLiveQuery } from 'dexie-react-hooks';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AmountInput, Button, Field, Sheet } from '../../../components/ui';
import { addHustleIncome, deleteIncome, previousAllowance, setAllowance } from '../../../db/money';
import type { Income } from '../../../db/schema';
import { t } from '../../../i18n/en';
import { formatDayShort, formatMonth, monthKey, todayISO } from '../../../lib/dates';
import { formatILS } from '../../../lib/format';
import { parseAmount } from '../../../lib/money';
import s from '../money.module.css';

/** Set the month's allowance, with a one-tap "same as last month". */
export function AllowanceSheet({
  open,
  onClose,
  month,
  current,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  current: Income | undefined;
}) {
  const [text, setText] = useState('');
  const last = useLiveQuery(() => previousAllowance(month), [month]);

  useEffect(() => {
    if (open) setText(current ? String(current.amount) : '');
  }, [open, current]);

  async function save(amount: number | null) {
    if (!amount) return;
    await setAllowance(month, amount);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.money.allowanceTitle(formatMonth(month))}>
      <div className="stack">
        <AmountInput value={text} onChange={setText} label={t.money.amount} autoFocus />
        {last && !current && (
          <Button variant="secondary" block onClick={() => save(last)}>
            {t.money.sameAsLast(formatILS(last))}
          </Button>
        )}
        <Button variant="primary" size="lg" block onClick={() => save(parseAmount(text))}>
          {t.money.save}
        </Button>
        {current && (
          <Button
            variant="ghost"
            block
            onClick={async () => {
              await setAllowance(month, 0);
              onClose();
            }}
          >
            {t.money.removeAllowance}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

/** Side-hustle payments for the month: list them and add new ones. */
export function HustleSheet({
  open,
  onClose,
  month,
  payments,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  payments: Income[];
}) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setText('');
    setNote('');
    // Default to today, or the 1st when looking at a past month.
    setDate(month === monthKey() ? todayISO() : `${month}-01`);
  }, [open, month]);

  async function add() {
    const amount = parseAmount(text);
    if (!amount) return;
    await addHustleIncome(amount, date, note.trim() || undefined);
    setText('');
    setNote('');
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.money.hustleTitle}>
      <div className="stack">
        <div className="list">
          {payments.length === 0 && <p className="faint small">{t.money.noPayments}</p>}
          {payments.map((p) => (
            <div key={p.id} className="list-row" style={{ cursor: 'default' }}>
              <span className="list-text">
                <span className="list-label">{formatILS(p.amount)}</span>
                <span className="list-sub">
                  {formatDayShort(p.date)}
                  {p.note ? ` · ${p.note}` : ''}
                </span>
              </span>
              <button type="button" className={s.removeButton} aria-label={t.money.removePayment} onClick={() => deleteIncome(p.id!)}>
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <AmountInput value={text} onChange={setText} label={t.money.amount} />
        <div className="form-row">
          <Field label={t.money.note}>
            <input
              className="input"
              value={note}
              placeholder={t.money.hustleNotePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Field label={t.money.date}>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Button variant="primary" size="lg" block onClick={add} disabled={!parseAmount(text)}>
          {t.money.addPayment}
        </Button>
      </div>
    </Sheet>
  );
}
