import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  label: ReactNode;
  icon?: LucideIcon;
  /** Icon tint, e.g. 'var(--c-gym)'. */
  color?: string;
  /** Second line under the label. */
  sub?: ReactNode;
  /** Value on the right (text) or a control (toggle). */
  detail?: ReactNode;
  /** Makes the row a link to another screen. */
  to?: string;
  onClick?: () => void;
}

/** A settings-style row: icon, label, optional detail, optional chevron. */
export function ListRow({ label, icon: Icon, color, sub, detail, to, onClick }: Props) {
  const content = (
    <>
      {Icon && (
        <span className="list-icon">
          <Icon aria-hidden="true" />
        </span>
      )}
      <span className="list-text">
        <span className="list-label">{label}</span>
        {sub && <span className="list-sub">{sub}</span>}
      </span>
      {detail && <span className="list-detail">{detail}</span>}
      {(to || onClick) && <ChevronRight className="list-chevron" aria-hidden="true" />}
    </>
  );
  const style = color ? ({ '--item-color': color } as CSSProperties) : undefined;

  if (to) {
    return (
      <Link to={to} className="list-row" style={style}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="list-row" style={style} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <div className="list-row" style={{ ...style, cursor: 'default' }}>
      {content}
    </div>
  );
}
