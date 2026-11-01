import { useEffect, useState } from 'react';
import { AmountInput, Button, Field, Sheet, useToast } from '../../../components/ui';
import { addGoal, addWaitItem, deleteGoal, moveSavings, updateGoal } from '../../../db/money';
import { t } from '../../../i18n/en';
import { formatILS } from '../../../lib/format';
import { parseAmount } from '../../../lib/money';
import { CATEGORIES, kindOf } from '../categories';
import type { GoalView } from '../useMoney';
import { goalName } from './SavingsCard';

/** Move money into savings, or take some out. */
export function SavingsMoveSheet({
  open,
  onClose,
  direction,
  suggestion,
}: {
  open: boolean;
  onClose: () => void;
  direction: 'in' | 'out';
  /** For "in": what's still planned for this month, offered as a one-tap amount. */
  suggestion: number;
}) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setText('');
      setNote('');
    }
  }, [open]);

  async function save(amount: number | null) {
    if (!amount) return;
    await moveSavings(direction === 'in' ? amount : -amount, note.trim() || undefined);
    toast(direction === 'in' ? t.money.savings.movedIn(formatILS(amount)) : t.money.savings.tookOut(formatILS(amount)));
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={direction === 'in' ? t.money.savings.moveInTitle : t.money.savings.takeOutTitle}
    >
      <div className="stack">
        <AmountInput value={text} onChange={setText} label={t.money.amount} autoFocus />
        {direction === 'in' && suggestion > 0 && (
          <Button variant="secondary" block onClick={() => save(suggestion)}>
            {formatILS(suggestion)}
          </Button>
        )}
        <Field label={t.money.note}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button variant="primary" size="lg" block onClick={() => save(parseAmount(text))}>
          {t.money.save}
        </Button>
      </div>
    </Sheet>
  );
}

/** Add a custom goal, or edit any goal's target (built-in goals keep their names). */
export function GoalSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: GoalView }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const isCustom = !goal || goal.kind === 'custom';

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? '');
    // The month-of-needs goal shows blank while it sizes itself automatically.
    const auto = goal?.kind === 'month' && goal.target === null;
    setTarget(goal && !auto && !goal.unsized ? String(goal.target) : '');
  }, [open, goal]);

  async function save() {
    const amount = parseAmount(target);
    if (!goal) {
      if (!name.trim() || !amount) return;
      await addGoal(name.trim(), amount);
    } else if (goal.kind === 'month') {
      await updateGoal(goal.id!, { target: amount }); // blank → automatic again
    } else {
      if (!amount) return;
      await updateGoal(goal.id!, { target: amount, ...(isCustom && name.trim() ? { name: name.trim() } : {}) });
    }
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? goalName(goal) : t.money.savings.addGoal}>
      <div className="stack">
        {isCustom && (
          <Field label={t.money.savings.goalName}>
            <input
              className="input"
              value={name}
              placeholder={t.money.savings.goalNamePlaceholder}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}
        <Field label={t.money.savings.goalTarget}>
          <input
            className="input"
            inputMode="decimal"
            value={target}
            placeholder={goal?.kind === 'month' ? formatILS(goal.target) : '₪'}
            onChange={(e) => setTarget(e.target.value)}
          />
        </Field>
        <Button variant="primary" size="lg" block onClick={save}>
          {t.money.save}
        </Button>
        {goal?.kind === 'custom' && (
          <Button
            variant="ghost"
            block
            onClick={async () => {
              await deleteGoal(goal.id!);
              onClose();
            }}
          >
            {t.money.savings.deleteGoal}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

/** Put a want on the 48-hour list directly. */
export function WaitItemSheet({
  open,
  onClose,
  kinds,
}: {
  open: boolean;
  onClose: () => void;
  kinds: Record<string, 'need' | 'fun'>;
}) {
  const toast = useToast();
  const funCategories = CATEGORIES.filter((c) => kindOf(c.id, kinds) === 'fun');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>(funCategories[0]?.id ?? 'other');

  useEffect(() => {
    if (open) {
      setName('');
      setPrice('');
    }
  }, [open]);

  async function add() {
    const amount = parseAmount(price);
    if (!name.trim() || !amount) return;
    await addWaitItem(name.trim(), amount, category);
    toast(t.money.wait.added);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.money.wait.addTitle}>
      <div className="stack">
        <Field label={t.money.wait.name}>
          <input
            className="input"
            value={name}
            placeholder={t.money.wait.namePlaceholder}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-row">
          <Field label={t.money.wait.price}>
            <input className="input" inputMode="decimal" placeholder="₪" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label={t.money.wait.category}>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.filter((c) => c.defaultKind !== 'reinvest').map((c) => (
                <option key={c.id} value={c.id}>
                  {t.money.categories[c.id]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button variant="primary" size="lg" block onClick={add} disabled={!name.trim() || !parseAmount(price)}>
          {t.money.wait.start}
        </Button>
      </div>
    </Sheet>
  );
}
