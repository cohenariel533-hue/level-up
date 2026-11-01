import type { CSSProperties } from 'react';
import type { ReviewPillar } from '../../db/schema';
import { t } from '../../i18n/en';
import { REVIEW_PILLARS } from '../../lib/review';
import s from './review.module.css';

/** Each review pillar's color, matching the rest of the app. */
export const REVIEW_COLORS: Record<ReviewPillar, string> = {
  school: 'var(--c-school)',
  gym: 'var(--c-gym)',
  hustle: 'var(--c-hustle)',
  money: 'var(--c-money)',
};

/** Read-only list of goals per pillar (skips empty ones). */
export function GoalList({ goals }: { goals: Record<ReviewPillar, string> }) {
  return (
    <ul className={s.goalList}>
      {REVIEW_PILLARS.filter((p) => goals[p]).map((p) => (
        <li key={p} style={{ '--item-color': REVIEW_COLORS[p] } as CSSProperties}>
          <strong>{t.review.pillars[p]}</strong>
          <span>{goals[p]}</span>
        </li>
      ))}
    </ul>
  );
}

export const hasGoals = (goals?: Record<ReviewPillar, string>) => !!goals && REVIEW_PILLARS.some((p) => goals[p]);
