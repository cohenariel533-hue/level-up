import { SlidersHorizontal } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button, Fab, PageHeader } from '../../components/ui';
import type { Expense } from '../../db/schema';
import { t } from '../../i18n/en';
import { monthKey } from '../../lib/dates';
import { BucketsCard } from './components/BucketsCard';
import { ExpenseSheet } from './components/ExpenseSheet';
import { ExpensesCard } from './components/ExpensesCard';
import { AllowanceSheet, HustleSheet } from './components/IncomeSheets';
import { IncomeCard } from './components/IncomeCard';
import { MoneyCheckCard } from './components/MoneyCheckCard';
import { MonthSwitcher } from './components/MonthSwitcher';
import { PlanSheet } from './components/PlanSheet';
import { SavingsCard } from './components/SavingsCard';
import { GoalSheet, SavingsMoveSheet, WaitItemSheet } from './components/SavingsSheets';
import { WaitListCard } from './components/WaitListCard';
import { useMoney, type GoalView } from './useMoney';

/** Which bottom sheet is open (only one at a time). */
type OpenSheet =
  | { type: 'expense'; expense?: Expense }
  | { type: 'allowance' }
  | { type: 'hustle' }
  | { type: 'move'; direction: 'in' | 'out' }
  | { type: 'goal'; goal?: GoalView }
  | { type: 'wait' }
  | { type: 'plan' }
  | null;

export default function MoneyScreen() {
  const [month, setMonth] = useState(monthKey());
  const view = useMoney(month);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const close = useCallback(() => setSheet(null), []);
  const isCurrentMonth = month === monthKey();

  return (
    <>
      <PageHeader
        title={t.money.title}
        action={
          <Button
            variant="secondary"
            icon={<SlidersHorizontal />}
            aria-label={t.money.openPlan}
            onClick={() => setSheet({ type: 'plan' })}
          />
        }
      />

      <div className="stack">
        <MonthSwitcher month={month} onChange={setMonth} />

        {view && (
          <>
            <BucketsCard view={view} onAddAllowance={() => setSheet({ type: 'allowance' })} />
            {isCurrentMonth && <MoneyCheckCard />}
            <IncomeCard
              view={view}
              onEditAllowance={() => setSheet({ type: 'allowance' })}
              onOpenHustle={() => setSheet({ type: 'hustle' })}
            />
            <ExpensesCard
              expenses={view.expenses}
              kinds={view.kinds}
              onSelect={(expense) => setSheet({ type: 'expense', expense })}
            />
            <SavingsCard
              view={view}
              onMove={(direction) => setSheet({ type: 'move', direction })}
              onEditGoal={(goal) => setSheet({ type: 'goal', goal })}
              onAddGoal={() => setSheet({ type: 'goal' })}
            />
            <WaitListCard
              items={view.waitlist}
              notSpent={view.notSpentByWaiting}
              onAdd={() => setSheet({ type: 'wait' })}
            />
          </>
        )}
      </div>

      <Fab label={t.money.addExpense} onClick={() => setSheet({ type: 'expense' })} />

      {view && (
        <>
          <ExpenseSheet
            open={sheet?.type === 'expense'}
            onClose={close}
            expense={sheet?.type === 'expense' ? sheet.expense : undefined}
            kinds={view.kinds}
          />
          <AllowanceSheet open={sheet?.type === 'allowance'} onClose={close} month={month} current={view.allowance} />
          <HustleSheet open={sheet?.type === 'hustle'} onClose={close} month={month} payments={view.hustlePayments} />
          <SavingsMoveSheet
            open={sheet?.type === 'move'}
            onClose={close}
            direction={sheet?.type === 'move' ? sheet.direction : 'in'}
            suggestion={Math.max(view.plan.savings - Math.max(view.savedThisMonth, 0), 0)}
          />
          <GoalSheet open={sheet?.type === 'goal'} onClose={close} goal={sheet?.type === 'goal' ? sheet.goal : undefined} />
          <WaitItemSheet open={sheet?.type === 'wait'} onClose={close} kinds={view.kinds} />
          <PlanSheet open={sheet?.type === 'plan'} onClose={close} view={view} />
        </>
      )}
    </>
  );
}
