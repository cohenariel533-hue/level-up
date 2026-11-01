import { Check, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';
import { t } from '../../i18n/en';
import { formatDuration } from '../../lib/time';
import { pillarStyle } from './pillars';
import type { ScheduledBlock } from './schedule';
import s from './week.module.css';

interface Props {
  block: ScheduledBlock;
  /** Week screen: tap to edit. */
  onClick?: () => void;
  /** Today screen: a round tick to mark it done. */
  check?: { done: boolean; onToggle: () => void };
}

/** One block on Today or Week: time, pillar color, title and length. */
export function BlockRow({ block, onClick, check }: Props) {
  const pillar = pillarStyle(block.pillar);
  const style = { '--item-color': pillar.color } as CSSProperties;

  // Meta line, e.g. "Gym · 1h 15m". The type is skipped when the title already says it.
  const meta = [
    block.locked ? t.today.locked : pillar.label !== block.title ? pillar.label : null,
    block.minutes > 0 ? formatDuration(block.minutes) : block.start ? null : t.today.anytime,
  ].filter(Boolean);

  const content = (
    <>
      {check && (
        <button
          type="button"
          role="checkbox"
          aria-checked={check.done}
          aria-label={block.title}
          className={s.check}
          onClick={(e) => {
            e.stopPropagation();
            check.onToggle();
          }}
        >
          <Check aria-hidden="true" strokeWidth={3} />
        </button>
      )}
      <span className={s.time}>{block.start ?? '—'}</span>
      <span className={s.colorBar} />
      <span className={s.info}>
        <span className={`${s.title} ${check?.done ? s.doneTitle : ''}`}>{block.title}</span>
        <span className={s.meta}>
          {block.locked && <Lock aria-hidden="true" />}
          {meta.join(' · ')}
        </span>
      </span>
    </>
  );

  const className = s.block;
  return onClick ? (
    <button type="button" className={className} style={style} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
