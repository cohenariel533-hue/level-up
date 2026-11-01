import { useEffect, useState, type CSSProperties } from 'react';
import { Button, Field, Sheet, Toggle } from '../../components/ui';
import type { Pillar, TemplateBlock } from '../../db/schema';
import { addBlock, deleteBlock, updateBlock } from '../../db/week';
import { t } from '../../i18n/en';
import { PILLAR_ORDER, PILLARS } from './pillars';
import s from './week.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The block to edit; leave out to add a new one on `day`. */
  block?: TemplateBlock;
  day: number;
}

const QUICK_DURATIONS = [30, 60, 90, 120, 240];

/** Add or edit a block in the weekly template. */
export function BlockSheet({ open, onClose, block, day }: Props) {
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState<Pillar>('other');
  const [timed, setTimed] = useState(true);
  const [start, setStart] = useState('18:00');
  const [minutes, setMinutes] = useState('60');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(block?.title ?? '');
    setPillar(block?.pillar ?? 'other');
    setTimed(block ? block.start !== null : true);
    setStart(block?.start ?? '18:00');
    setMinutes(block ? String(block.minutes) : '60');
    setConfirmDelete(false);
  }, [open, block]);

  const minutesValue = Math.max(0, Math.round(Number(minutes) || 0));
  const canSave = title.trim().length > 0 && (!timed || minutesValue > 0);

  async function save() {
    if (!canSave) return;
    const data = {
      title: title.trim(),
      pillar,
      start: timed ? start : null,
      minutes: minutesValue,
    };
    if (block?.id) await updateBlock(block.id, data);
    else await addBlock({ ...data, day });
    onClose();
  }

  async function remove() {
    if (!block?.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteBlock(block.id);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={block ? t.week.editBlock : `${t.week.newBlock} · ${t.week.days[day]}`}>
      <div className="stack">
        <Field label={t.week.blockTitle}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!block} />
        </Field>

        <Field label={t.week.blockPillar}>
          <div className={s.pillarGrid}>
            {PILLAR_ORDER.map((p) => {
              const Icon = PILLARS[p].icon;
              return (
                <button
                  key={p}
                  type="button"
                  className={s.pillarChip}
                  aria-pressed={pillar === p}
                  style={{ '--item-color': PILLARS[p].color } as CSSProperties}
                  onClick={() => {
                    setPillar(p);
                    if (!title.trim()) setTitle(PILLARS[p].label);
                  }}
                >
                  <Icon aria-hidden="true" />
                  {PILLARS[p].label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="list-row" style={{ cursor: 'default', padding: '4px 2px' }}>
          <span className="list-text list-label">{t.week.untimed}</span>
          <Toggle checked={!timed} onChange={(v) => setTimed(!v)} label={t.week.untimed} />
        </div>

        {timed && (
          <>
            <div className="form-row">
              <Field label={t.week.start}>
                <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label={t.week.duration}>
                <input
                  className="input"
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
            </div>
            <div className={s.quickDurations}>
              {QUICK_DURATIONS.map((m) => (
                <Button key={m} variant={minutesValue === m ? 'secondary' : 'subtle'} onClick={() => setMinutes(String(m))}>
                  {m >= 60 ? `${m / 60}h` : `${m}m`}
                </Button>
              ))}
            </div>
          </>
        )}

        <Button variant="primary" size="lg" block onClick={save} disabled={!canSave}>
          {t.week.save}
        </Button>
        {block && (
          <Button variant="subtle" block onClick={remove}>
            {confirmDelete ? `${t.week.deleteBlock}?` : t.week.deleteBlock}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
