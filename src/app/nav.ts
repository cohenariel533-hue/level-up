import {
  CalendarDays,
  Dumbbell,
  LayoutGrid,
  NotebookPen,
  Rocket,
  Settings,
  Sun,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { t } from '../i18n/en';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Pillar color token for the icon. */
  color: string;
}

/** The five tabs in the iPhone tab bar. */
export const TAB_ITEMS: NavItem[] = [
  { path: '/', label: t.nav.today, icon: Sun, color: 'var(--accent)' },
  { path: '/week', label: t.nav.week, icon: CalendarDays, color: 'var(--c-school)' },
  { path: '/money', label: t.nav.money, icon: Wallet, color: 'var(--c-money)' },
  { path: '/hustle', label: t.nav.hustle, icon: Rocket, color: 'var(--c-hustle)' },
  { path: '/more', label: t.nav.more, icon: LayoutGrid, color: 'var(--c-neutral)' },
];

/** Screens reached through "More" on iPhone (shown directly in the desktop sidebar). */
export const MORE_ITEMS: NavItem[] = [
  { path: '/gym', label: t.nav.gym, icon: Dumbbell, color: 'var(--c-gym)' },
  { path: '/review', label: t.nav.review, icon: NotebookPen, color: 'var(--c-review)' },
  { path: '/settings', label: t.nav.settings, icon: Settings, color: 'var(--c-neutral)' },
];

/** Everything except "More", for the desktop sidebar. */
export const SIDEBAR_ITEMS: NavItem[] = [...TAB_ITEMS.filter((i) => i.path !== '/more'), ...MORE_ITEMS];
