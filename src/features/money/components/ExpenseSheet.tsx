import { Hourglass } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { AmountInput, Button, Field, Sheet, useToast } from '../../../components/ui';
import { addExpense, addWaitItem, deleteExpense, updateExpense } from '../../../db/money';
import type { Expense } from '../../../db/schema';
import { t } from '../../../i18n/en';
import { todayISO } from '../../../lib/dates';
import { formatILS } from '../../../lib/format';
import { parseAmount, WAIT_THRESHOLD } from '../../../lib/money';
import { CATEGORIES, categoryLabel, KIND_COLOR, kindOf } from '../categories';
import s from '../money.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass an expense to edit it; leave out to add a new one. */
  expense?: Expense;
  kinds: Record<string, 'need' | 'fun'>;
}

/**
 * Add mode is built for speed: type the amount, tap a category, done.
 * A "fun" expense over ₪150 first offers the 48-hour list instead.
 * Edit mode shows every field plus delete.
 */
export function ExpenseSheet({ open, onClose, expense, kinds }: Props) {
  const toast = useToast();
  const editing = expense !== undefined;

  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [showMore, setShowMore] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [waitOffer, setWaitOffer] = useState<{ amount: number; category: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setAmountText(expense ? String(expense.amount) : '');
    setCategory(expense?.category ?? '');
    setNote(expense?.note ?? '');
    setDate(expense?.date ?? todayISO());
    setShowMore(false);
    setInvalid(false);
    setWaitOffer(null);
    setConfirmDelete(false);
  }, [open, expense]);

  function readAmount(): number | null {
    const amount = parseAmount(amountText);
    if (!amount) {
      setInvalid(false);
      requestAnimationFrame(() => setInvalid(true)); // restart the shake
      toast(t.money.expense.typeAmountFirst);
    }
    return amount;
  }

  async function save(amount: number, cat: string) {
    await addExpense({ amount, category: cat, date, note: note.trim() || undefined });
    toast(t.money.expense.logged(formatILS(amount), categoryLabel(cat)));
    onClose();
  }

  // Add mode: tapping a category saves straight away.
  function onCategoryTap(cat: string) {
    if (editing) {
      setCategory(cat);
      return;
    }
    const amount = readAmount();
    if (!amount) return;
    if (kindOf(cat, kinds) === 'fun' && amount > WAIT_THRESHOLD) {
      setWaitOffer({ amount, category: cat });
      return;
    }
    save(amount, cat);
  }

  async function sendToWaitList() {
    if (!waitOffer) return;
    await addWaitItem(note.trim() || categoryLabel(waitOffer.category), waitOffer.amount, waitOffer.category);
    toast(t.money.wait.added);
    onClose();
  }

  async function saveEdit() {
    const amount = readAmount();
    if (!amount || !expense?.id) return;
    await updateExpense(expense.id, { amount, category, date, note: note.trim() || undefined });
    onClose();
  }

  async function remove() {
    if (!expense?.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteExpense(expense.id);
    toast(t.money.expense.deleted);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? t.money.expense.editTitle : t.money.expense.newTitle}>
      <div className="stack">
        <AmountInput value={amountText} onChange={setAmountText} label={t.money.amount} autoFocus={!editing} invalid={invalid} />

        {waitOffer ? (
          // ----- The 48-hour nudge -----
          <div className="stack" style={{ textAlign: 'center' }}>
            <Hourglass size={32} color="var(--c-fun)" style={{ margin: '0 auto' }} aria-hidden="true" />
            <h3 className="card-title">{t.money.expense.waitTitle}</h3>
            <p className="muted">{t.money.expense.waitBody(formatILS(waitOffer.amount))}</p>
            <Button variant="primary" size="lg" block onClick={sendToWaitList}>
              {t.money.expense.waitAdd}
            </Button>
            <Button variant="ghost" block onClick={() => save(waitOffer.amount, waitOffer.category)}>
              {t.money.expense.waitLogAnyway}
            </Button>
          </div>
        ) : (
          <>
            {!editing && <p className="faint small" style={{ textAlign: 'center' }}>{t.money.expense.pickCategory}</p>}
            <div className={s.catGrid}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={s.catButton}
                    aria-pressed={editing ? category === c.id : undefined}
                    style={{ '--item-color': KIND_COLOR[kindOf(c.id, kinds)] } as CSSProperties}
                    onClick={() => onCategoryTap(c.id)}
                  >
                    <Icon aria-hidden="true" />
                    {t.money.categories[c.id]}
                  </button>
                );
              })}
            </div>

            {editing || showMore ? (
              <div className="form-row">
                <Field label={t.money.note}>
                  <input
                    className="input"
                    value={note}
                    placeholder={t.money.expense.notePlaceholder}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
                <Field label={t.money.date}>
                  <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>
            ) : (
              <button type="button" className={s.linkButton} onClick={() => setShowMore(true)}>
                {t.money.expense.moreOptions}
              </button>
            )}

            {editing && (
              <>
                <Button variant="primary" size="lg" block onClick={saveEdit}>
                  {t.money.save}
                </Button>
                <Button variant="subtle" block onClick={remove}>
                  {confirmDelete ? `${t.money.expense.delete}?` : t.money.expense.delete}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
