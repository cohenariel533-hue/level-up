import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface Props {
  value: number;
  max: number;
  color: string;
  label?: ReactNode;
  /** Text on the right, e.g. "₪420 left". */
  detail?: ReactNode;
}

/** A horizontal progress bar (budget buckets, savings goals…). */
export function ProgressBar({ value, max, color, label, detail }: Props) {
  const target = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  // Animate from empty on first show.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className="bar" style={{ '--bar-color': color } as CSSProperties}>
      {(label || detail) && (
        <div className="bar-head">
          <strong>{label}</strong>
          <span className="muted">{detail}</span>
        </div>
      )}
      <div className="bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="bar-fill" style={{ width: `${shown * 100}%` }} />
      </div>
    </div>
  );
}
