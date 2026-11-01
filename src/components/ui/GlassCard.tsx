import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  /** Optional element on the right of the title (a button, a chip…). */
  action?: ReactNode;
  /** A slightly more opaque surface, for things that should stand out. */
  strong?: boolean;
}

/** The frosted-glass card every screen is built from. */
export function GlassCard({ title, action, strong, className = '', children, ...rest }: Props) {
  return (
    <section className={`glass card ${strong ? 'glass-strong' : ''} ${className}`} {...rest}>
      {(title || action) && (
        <header className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
