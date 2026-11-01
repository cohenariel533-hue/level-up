import { useEffect, useState } from 'react';
import { Button, Segmented, Sheet, useToast } from '../../../components/ui';
import { setSetting } from '../../../db/settings';
import { t } from '../../../i18n/en';
import { isValidSplit, type BudgetSplit, type HustleSplit } from '../../../lib/money';
import { CATEGORIES, kindOf } from '../categories';
import s from '../money.module.css';
import type { MoneyView } from '../useMoney';

/** Edit the split percentages and which categories count as needs vs fun. */
export function PlanSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: MoneyView }) {
  const toast = useToast();
  const [split, setSplit] = useState<BudgetSplit>(view.split);
  const [hustle, setHustle] = useState<HustleSplit>(view.hustleSplit);
  const [kinds, setKinds] = useState(view.kinds);

  useEffect(() => {
    if (!open) return;
    setSplit(view.split);
    setHustle(view.hustleSplit);
    setKinds(view.kinds);
  }, [open, view.split, view.hustleSplit, view.kinds]);

  const valid = isValidSplit(split) && isValidSplit(hustle);

  async function save() {
    if (!valid) return;
    await Promise.all([setSetting('budgetSplit', split), setSetting('hustleSplit', hustle), setSetting('categoryKinds', kinds)]);
    toast(t.money.plan.saved);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.money.plan.title}>
      <div className="stack" style={{ gap: 22 }}>
        <SplitEditor
          title={t.money.plan.budgetSplit}
          rows={[
            ['needs', t.money.buckets.needs],
            ['fun', t.money.buckets.fun],
            ['savings', t.money.buckets.savings],
          ]}
          value={split}
          onChange={(v) => setSplit(v as BudgetSplit)}
        />
        <SplitEditor
          title={t.money.plan.hustleSplit}
          rows={[
            ['savings', t.money.buckets.savings],
            ['reinvest', t.money.plan.reinvest],
            ['fun', t.money.buckets.fun],
          ]}
          value={hustle}
          onChange={(v) => setHustle(v as HustleSplit)}
        />

        <div className="stack" style={{ gap: 10 }}>
          <h3 className="card-title">{t.money.plan.categoryKinds}</h3>
          {CATEGORIES.filter((c) => c.defaultKind !== 'reinvest').map((c) => (
            <div key={c.id} className={s.splitRow}>
              <span>{t.money.categories[c.id]}</span>
              <div style={{ width: 150 }}>
                <Segmented<'need' | 'fun'>
                  label={t.money.categories[c.id]}
                  value={kindOf(c.id, kinds) as 'need' | 'fun'}
                  onChange={(k) => setKinds({ ...kinds, [c.id]: k })}
                  options={[
                    { value: 'need', label: t.money.plan.need },
                    { value: 'fun', label: t.money.plan.fun },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>

        {!valid && <p className="small" style={{ color: 'var(--c-over)' }}>{t.money.plan.mustBe100}</p>}
        <Button variant="primary" size="lg" block onClick={save} disabled={!valid}>
          {t.money.plan.save}
        </Button>
      </div>
    </Sheet>
  );
}

/** A small block of "label … [ 60 ] %" rows with a running total. */
function SplitEditor({
  title,
  rows,
  value,
  onChange,
}: {
  title: string;
  rows: [string, string][];
  value: object;
  onChange: (value: object) => void;
}) {
  const values = value as Record<string, number>;
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h3 className="card-title">{title}</h3>
      {rows.map(([key, label]) => (
        <label key={key} className={s.splitRow}>
          <span>{label}</span>
          <input
            className="input"
            inputMode="numeric"
            value={values[key]}
            onChange={(e) => onChange({ ...values, [key]: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          />
          %
        </label>
      ))}
      <p className="small" style={{ color: total === 100 ? 'var(--text-3)' : 'var(--c-over)', textAlign: 'end' }}>
        {t.money.plan.total(total)}
      </p>
    </div>
  );
}
