import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, GraduationCap, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button, GlassCard, ListRow, PageHeader, useToast } from '../../components/ui';
import { db, type ClassSlot, type TemplateBlock } from '../../db/schema';
import { resetTemplate } from '../../db/week';
import { t } from '../../i18n/en';
import { toISODate, weekStart } from '../../lib/dates';
import { buildWeekIcs } from '../../lib/ics';
import { saveFile } from '../../lib/saveFile';
import { formatDuration, formatHours } from '../../lib/time';
import { BlockRow } from './BlockRow';
import { BlockSheet } from './BlockSheet';
import { ClassSheet } from './ClassSheet';
import { DayPicker } from './DayPicker';
import { blocksForDay, weekEvents } from './schedule';

type OpenSheet = { type: 'block'; block?: TemplateBlock } | { type: 'class'; slot?: ClassSlot } | null;

/** The editable weekly template, real class times, and the Apple Calendar export. */
export default function WeekScreen() {
  const toast = useToast();
  const [day, setDay] = useState(new Date().getDay());
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const close = useCallback(() => setSheet(null), []);

  const data = useLiveQuery(async () => {
    const [template, classes] = await Promise.all([db.templateBlocks.toArray(), db.classes.toArray()]);
    return { template, classes };
  });

  if (!data) return null;
  const { template, classes } = data;
  const blocks = blocksForDay(day, template, classes);

  // Weekly totals straight from the template. Classes aren't added on top:
  // they happen inside the "Classes & study" blocks.
  const sum = (pillar: string) => template.filter((b) => b.pillar === pillar).reduce((n, b) => n + b.minutes, 0);
  const count = (pillar: string) => template.filter((b) => b.pillar === pillar).length;

  async function exportIcs() {
    const ics = buildWeekIcs(weekEvents(template, classes), weekStart());
    const result = await saveFile(
      `level-up-week-${toISODate(weekStart())}.ics`,
      new Blob([ics], { type: 'text/calendar' }),
    );
    if (result !== 'cancelled') toast(t.week.exported);
  }

  async function reset() {
    if (!confirmReset) return setConfirmReset(true);
    await resetTemplate();
    setConfirmReset(false);
    toast(t.week.resetDone);
  }

  return (
    <>
      <PageHeader
        title={t.week.title}
        action={
          <Button variant="secondary" icon={<CalendarPlus />} aria-label={t.week.exportIcs} onClick={exportIcs} />
        }
      />

      <div className="stack">
        <DayPicker value={day} onChange={setDay} />

        <GlassCard
          title={t.week.days[day]}
          action={
            <Button
              variant="ghost"
              icon={<Plus />}
              aria-label={t.week.addBlock}
              onClick={() => setSheet({ type: 'block' })}
            />
          }
        >
          {blocks.length === 0 ? (
            <p className="muted small">{t.week.emptyDay}</p>
          ) : (
            <div>
              {blocks.map((b) => (
                <BlockRow
                  key={b.key}
                  block={b}
                  onClick={() =>
                    b.locked ? setSheet({ type: 'class', slot: b.classSlot }) : setSheet({ type: 'block', block: b.template })
                  }
                />
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard title={t.week.weeklyTotals}>
          <p className="muted small">
            {t.week.totals(
              formatDuration(sum('school')),
              count('gym'),
              formatHours(sum('hustle') / 60),
              count('youtube'),
            )}
          </p>
        </GlassCard>

        <GlassCard
          title={t.week.classesTitle}
          action={
            <Button variant="ghost" icon={<Plus />} aria-label={t.week.addClass} onClick={() => setSheet({ type: 'class' })} />
          }
        >
          <p className="muted small" style={{ marginBottom: 8 }}>
            {t.week.classesIntro}
          </p>
          {classes.length === 0 ? (
            <p className="faint small">{t.week.noClasses}</p>
          ) : (
            <div className="list">
              {[...classes]
                .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
                .map((c) => (
                  <ListRow
                    key={c.id}
                    icon={GraduationCap}
                    color="var(--c-school)"
                    label={c.name}
                    sub={`${t.week.daysShort[c.day]} · ${c.start}–${c.end}`}
                    onClick={() => setSheet({ type: 'class', slot: c })}
                  />
                ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="stack" style={{ gap: 10 }}>
            <Button variant="primary" size="lg" block icon={<CalendarPlus />} onClick={exportIcs}>
              {t.week.exportIcs}
            </Button>
            <p className="faint small">{t.week.exportHint}</p>
          </div>
        </GlassCard>

        <Button variant="ghost" icon={<RotateCcw />} onClick={reset}>
          {confirmReset ? t.week.resetConfirm : t.week.resetTemplate}
        </Button>
      </div>

      <BlockSheet
        open={sheet?.type === 'block'}
        onClose={close}
        block={sheet?.type === 'block' ? sheet.block : undefined}
        day={day}
      />
      <ClassSheet
        open={sheet?.type === 'class'}
        onClose={close}
        slot={sheet?.type === 'class' ? sheet.slot : undefined}
        defaultDay={day}
      />
    </>
  );
}
