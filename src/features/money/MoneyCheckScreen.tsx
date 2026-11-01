import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDownToLine, ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, GlassCard, PageHeader, ProgressBar, Segmented, useToast } from '../../components/ui';
import { saveMoneyCheck } from '../../db/money';
import { db } from '../../db/schema';
import { t } from '../../i18n/en';
import { formatShortDate, monthKey, toISODate, weekEnd, weekStart } from '../../lib/dates';
import { formatILS } from '../../lib/format';
import { sumByKind, weeklyShare } from '../../lib/money';
import { categoryLabel, KIND_COLOR, kindOf } from './categories';
import { SavingsMoveSheet } from './components/SavingsSheets';
import s from './money.module.css';
import { loadMoney } from './useMoney';

/**
 * The Saturday money check: three short steps that close the week.
 * Saved per week, so the Today screen can show it as done.
 */
export default function MoneyCheckScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const startISO = toISODate(weekStart());
  const endISO = toISODate(weekEnd());

  const data = useLiveQuery(async () => {
    const [view, expenses, moves, existing] = await Promise.all([
      loadMoney(monthKey()),
      db.expenses.where('date').between(startISO, endISO, true, true).toArray(),
      db.savingsMoves.where('date').between(startISO, endISO, true, true).toArray(),
      db.moneyChecks.get(startISO),
    ]);
    const kind = (c: string) => kindOf(c, view.kinds);
    const spent = sumByKind(expenses, kind);
    const weekPlan = {
      needs: weeklyShare(view.plan.needs, view.daysInMonth),
      fun: weeklyShare(view.plan.fun, view.daysInMonth),
    };

    // Biggest "fun" category this week, offered as the likely leak.
    const funByCategory = new Map<string, number>();
    for (const e of expenses) {
      if (kind(e.category) === 'fun') funByCategory.set(e.category, (funByCategory.get(e.category) ?? 0) + e.amount);
    }
    const topLeak = [...funByCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      spent,
      weekPlan,
      movedThisWeek: moves.reduce((sum, m) => sum + m.amount, 0),
      savingsStillToMove: Math.max(view.plan.savings - Math.max(view.savedThisMonth, 0), 0),
      topLeak,
      existing,
    };
  }, [startISO, endISO]);

  const [moved, setMoved] = useState<'yes' | 'no' | undefined>();
  const [leak, setLeak] = useState('');
  const [note, setNote] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);

  // Fill in last answers (or sensible guesses) once, when the data first arrives.
  const filled = useRef(false);
  useEffect(() => {
    if (!data || filled.current) return;
    filled.current = true;
    if (data.existing) {
      setMoved(data.existing.movedSavings ? 'yes' : 'no');
      setLeak(data.existing.biggestLeak);
      setNote(data.existing.note);
    } else if (data.movedThisWeek > 0) {
      setMoved('yes');
    }
  }, [data]);

  // Moving money from this screen counts as a yes.
  useEffect(() => {
    if (data && data.movedThisWeek > 0 && moved === undefined) setMoved('yes');
  }, [data, moved]);

  if (!data) return null;

  const spentTotal = data.spent.needs + data.spent.fun;
  const planTotal = data.weekPlan.needs + data.weekPlan.fun;
  const diff = planTotal - spentTotal;

  async function finish() {
    await saveMoneyCheck({
      weekStart: startISO,
      completedAt: new Date().toISOString(),
      spent: spentTotal,
      planned: planTotal,
      movedSavings: moved === 'yes',
      biggestLeak: leak.trim(),
      note: note.trim(),
    });
    toast(t.money.check.saved);
    navigate('/money');
  }

  return (
    <>
      <Button variant="ghost" icon={<ChevronLeft />} onClick={() => navigate('/money')} style={{ marginInlineStart: -10 }}>
        {t.money.title}
      </Button>
      <PageHeader eyebrow={t.money.check.weekOf(formatShortDate(startISO))} title={t.money.check.title} />

      <div className="stack">
        <Step number={1} title={t.money.check.step1}>
          {planTotal === 0 ? (
            <p className="muted">{t.money.check.noPlan}</p>
          ) : (
            <>
              <div className="stack" style={{ '--gap': '16px' } as CSSProperties}>
                <WeekBar label={t.money.buckets.needs} spent={data.spent.needs} plan={data.weekPlan.needs} color={KIND_COLOR.need} />
                <WeekBar label={t.money.buckets.fun} spent={data.spent.fun} plan={data.weekPlan.fun} color={KIND_COLOR.fun} />
              </div>
              <p className={s.message}>
                {diff > 0
                  ? t.money.check.underPlan(formatILS(diff))
                  : diff < 0
                    ? t.money.check.overPlan(formatILS(-diff))
                    : t.money.check.onPlan}
              </p>
            </>
          )}
        </Step>

        <Step number={2} title={t.money.check.step2}>
          <div className="stack" style={{ '--gap': '12px' } as CSSProperties}>
            <p className="muted small">{t.money.check.movedThisWeek(formatILS(Math.max(data.movedThisWeek, 0)))}</p>
            <Segmented<'yes' | 'no'>
              label={t.money.check.step2}
              value={moved}
              onChange={setMoved}
              options={[
                { value: 'yes', label: t.money.check.yes },
                { value: 'no', label: t.money.check.notYet },
              ]}
            />
            {moved === 'no' && (
              <Button variant="secondary" icon={<ArrowDownToLine />} onClick={() => setMoveOpen(true)}>
                {t.money.check.moveNow}
              </Button>
            )}
          </div>
        </Step>

        <Step number={3} title={t.money.check.step3}>
          <div className="stack" style={{ '--gap': '12px' } as CSSProperties}>
            {data.topLeak && (
              <button
                type="button"
                className="chip"
                style={{ '--item-color': 'var(--c-fun)', border: 0, cursor: 'pointer', alignSelf: 'flex-start' } as CSSProperties}
                onClick={() => setLeak(categoryLabel(data.topLeak![0]))}
              >
                {t.money.check.leakSuggestion(categoryLabel(data.topLeak[0]), formatILS(data.topLeak[1]))}
              </button>
            )}
            <input
              className="input"
              value={leak}
              placeholder={t.money.check.leakPlaceholder}
              onChange={(e) => setLeak(e.target.value)}
            />
            <Field label={t.money.check.noteLabel}>
              <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </Step>

        <Button variant="primary" size="lg" block onClick={finish} disabled={moved === undefined}>
          {data.existing ? t.money.check.update : t.money.check.finish}
        </Button>
      </div>

      <SavingsMoveSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        direction="in"
        suggestion={data.savingsStillToMove}
      />
    </>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <GlassCard>
      <div className={s.step}>
        <span className={s.stepNumber}>{number}</span>
        <h2 className="card-title">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
}

function WeekBar({ label, spent, plan, color }: { label: string; spent: number; plan: number; color: string }) {
  const over = spent > plan;
  return (
    <ProgressBar
      label={label}
      value={spent}
      max={over ? spent : plan}
      color={over ? 'var(--c-over)' : color}
      detail={`${formatILS(spent)} / ${formatILS(plan)}`}
    />
  );
}
