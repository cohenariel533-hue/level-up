import { useLiveQuery } from 'dexie-react-hooks';
import { GlassCard, ProgressBar } from '../../components/ui';
import { db } from '../../db/schema';
import { toggleBlockDone } from '../../db/week';
import { t } from '../../i18n/en';
import { BlockRow } from '../week/BlockRow';
import { blocksForDay } from '../week/schedule';

/** Today's blocks from the weekly template (plus classes), each one tickable. */
export function TodayBlocks({ date, weekday }: { date: string; weekday: number }) {
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

  const doneCount = blocks.filter((b) => done.has(b.key)).length;

  return (
    <GlassCard
      title={t.today.blocksTitle}
      action={blocks.length > 0 && <span className="faint small">{t.today.progress(doneCount, blocks.length)}</span>}
    >
      {blocks.length === 0 ? (
        <p className="muted small">{t.today.noBlocks}</p>
      ) : (
        <>
          <ProgressBar value={doneCount} max={blocks.length} color="var(--accent)" />
          <div style={{ marginTop: 8 }}>
            {blocks.map((b) => (
              <BlockRow
                key={b.key}
                block={b}
                check={{
                  done: done.has(b.key),
                  onToggle: () => toggleBlockDone(date, { key: b.key, pillar: b.pillar, minutes: b.minutes }),
                }}
              />
            ))}
          </div>
          {blocks.length > 0 && doneCount === blocks.length && (
            <p className="small" style={{ marginTop: 12, color: 'var(--c-money)', fontWeight: 600 }}>
              {t.today.allDone}
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
}
