import type { CSSProperties, ReactNode } from 'react';
import { GlassCard } from './GlassCard';

/** A numbered step in a guided flow (money check, weekly review). */
export function StepCard({
  number,
  title,
  color = 'var(--c-money)',
  children,
}: {
  number: number;
  title: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <GlassCard style={{ '--item-color': color } as CSSProperties}>
      <div className="step-head">
        <span className="step-number">{number}</span>
        <h2 className="card-title">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
}
