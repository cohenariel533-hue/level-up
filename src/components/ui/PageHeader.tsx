import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  /** Small text above the title, e.g. today's date. */
  eyebrow?: ReactNode;
  action?: ReactNode;
}

/** The big title at the top of each screen. */
export function PageHeader({ title, eyebrow, action }: Props) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </div>
      {action}
    </header>
  );
}
