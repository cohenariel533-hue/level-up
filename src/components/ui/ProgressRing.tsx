import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  value: number;
  max: number;
  label: string;
  /** A CSS color, usually a pillar token like 'var(--c-gym)'. */
  color: string;
  /** Text in the middle. Defaults to "value/max". */
  display?: string;
  size?: number;
  stroke?: number;
}

/**
 * Apple-Watch-style ring. It fills up as you make progress and glows softly
 * once the goal is reached. Rings never show anything negative.
 */
export function ProgressRing({ value, max, label, color, display, size = 68, stroke = 8 }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = max > 0 ? Math.min(value / max, 1) : 0;

  // Start empty and fill on the next frame, so the ring animates in.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const done = max > 0 && value >= max;

  return (
    <div
      className={`ring ${done ? 'is-done' : ''}`}
      style={{ '--ring-color': color } as CSSProperties}
      role="img"
      aria-label={`${label}: ${display ?? `${value} of ${max}`}`}
    >
      <div className="ring-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="ring-center" aria-hidden="true">
          {display ?? `${value}/${max}`}
        </span>
      </div>
      <span className="ring-label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
