import {
  BookOpen,
  Clapperboard,
  Coffee,
  Dumbbell,
  NotebookPen,
  Rocket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Pillar } from '../../db/schema';
import { t } from '../../i18n/en';

export interface PillarStyle {
  label: string;
  icon: LucideIcon;
  color: string;
}

/** Color + icon per pillar, used by every block on Today and Week. */
export const PILLARS: Record<Pillar, PillarStyle> = {
  school: { label: t.week.pillars.school, icon: BookOpen, color: 'var(--c-school)' },
  gym: { label: t.week.pillars.gym, icon: Dumbbell, color: 'var(--c-gym)' },
  hustle: { label: t.week.pillars.hustle, icon: Rocket, color: 'var(--c-hustle)' },
  youtube: { label: t.week.pillars.youtube, icon: Clapperboard, color: 'var(--c-youtube)' },
  review: { label: t.week.pillars.review, icon: NotebookPen, color: 'var(--c-review)' },
  rest: { label: t.week.pillars.rest, icon: Coffee, color: 'var(--c-neutral)' },
  other: { label: t.week.pillars.other, icon: Sparkles, color: 'var(--accent)' },
};

/** Pillars offered when adding a block, in picker order. */
export const PILLAR_ORDER: Pillar[] = ['school', 'gym', 'hustle', 'youtube', 'review', 'rest', 'other'];
