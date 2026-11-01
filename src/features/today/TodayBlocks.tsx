import { useLiveQuery } from 'dexie-react-hooks';
import { GlassCard, ProgressBar } from '../../components/ui';
import { db } from '../../db/schema';
import { toggleBlockDone } from '../../db/week';
import { t } from '../../i18n/en';
import { BlockRow } from '../week/BlockRow';
import { blocksForDay } from '../week/schedule';

/** Today's blocks from the weekly template (plus classes), each one tickable. */
export function TodayBlocks({ date, weekday, examMode }: { date: string; weekday: number; examMode: boolean }) {
  const data = useLiveQuery(async () => {
    const [template, classes, log] = await Promise.all([
      db.templateBlocks.where('day').equals(weekday).toArray(),
      db.classes.where('day').equals(weekday).toArray(),
      db.days.get(date),
    ]);
    return { blocks: blocksForDay(weekday, template, classes), done: new Set(log?.done.map((d) => d.key)) };
  }, [date, weekday]);

  if (!data) return null;
  const { blocks, done } = data;

  // YouTube is paused in exam mode: shown faded and left out of the count.
  const paused = (pillar: string) => examMode && pillar === 'youtube';
  const counted = blocks.filter((b) => !paused(b.pillar));
  const doneCount = counted.filter((b) => done.has(b.key)).length;

  return (
    <GlassCard
      title={t.today.blocksTitle}
      action={counted.length > 0 && <span className="faint small">{t.today.progress(doneCount, counted.length)}</span>}
    >
      {blocks.length === 0 ? (
        <p className="muted small">{t.today.noBlocks}</p>
      ) : (
        <>
          <ProgressBar value={doneCount} max={counted.length} color="var(--accent)" />
          <div style={{ marginTop: 8 }}>
            {blocks.map((b) => (
              <BlockRow
                key={b.key}
                block={b}
                dimmed={paused(b.pillar)}
                note={paused(b.pillar) ? t.today.pausedForExams : undefined}
                check={{
                  done: done.has(b.key),
                  onToggle: () => toggleBlockDone(date, { key: b.key, pillar: b.pillar, minutes: b.minutes }),
                }}
              />
            ))}
          </div>
          {counted.length > 0 && doneCount === counted.length && (
            <p className="small" style={{ marginTop: 12, color: 'var(--c-money)', fontWeight: 600 }}>
              {t.today.allDone}
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
}
