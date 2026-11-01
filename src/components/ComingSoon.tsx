import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { t } from '../i18n/en';
import { GlassCard } from './ui';

interface Props {
  stage: number;
  icon: LucideIcon;
  color: string;
  title: string;
  features: string[];
}

/** Placeholder for a screen that hasn't been built yet: what's coming and in which stage. */
export function ComingSoon({ stage, icon: Icon, color, title, features }: Props) {
  return (
    <GlassCard style={{ '--item-color': color } as CSSProperties}>
      <div className="empty">
        <div className="empty-icon">
          <Icon aria-hidden="true" />
        </div>
        <span className="chip">
          {t.comingSoon} {stage}
        </span>
        <h2 className="empty-title" style={{ marginTop: 12 }}>
          {title}
        </h2>
        <ul className="checklist" style={{ maxWidth: 360, margin: '16px auto 0' }}>
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
}
