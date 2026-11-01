import {
  Bus,
  Dog,
  GraduationCap,
  Home,
  MoreHorizontal,
  PartyPopper,
  Repeat,
  Rocket,
  Shirt,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { t } from '../../i18n/en';
import type { SpendKind } from '../../lib/money';

export interface Category {
  id: keyof typeof t.money.categories;
  icon: LucideIcon;
  /** Need or fun out of the box; you can flip need/fun in the plan sheet. */
  defaultKind: SpendKind;
}

/** Expense categories, in the order they appear on the quick-add grid. */
export const CATEGORIES: Category[] = [
  { id: 'food', icon: ShoppingBasket, defaultKind: 'need' },
  { id: 'eatingOut', icon: UtensilsCrossed, defaultKind: 'fun' },
  { id: 'transport', icon: Bus, defaultKind: 'need' },
  { id: 'goingOut', icon: PartyPopper, defaultKind: 'fun' },
  { id: 'rent', icon: Home, defaultKind: 'need' },
  { id: 'clothes', icon: Shirt, defaultKind: 'fun' },
  { id: 'phone', icon: Smartphone, defaultKind: 'need' },
  { id: 'subscriptions', icon: Repeat, defaultKind: 'fun' },
  { id: 'school', icon: GraduationCap, defaultKind: 'need' },
  { id: 'dogs', icon: Dog, defaultKind: 'need' },
  { id: 'other', icon: MoreHorizontal, defaultKind: 'need' },
  // Paid from the hustle's "reinvest" bucket (domains, tools, ads).
  { id: 'hustle', icon: Rocket, defaultKind: 'reinvest' },
];

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === 'other')!;
}

export const categoryLabel = (id: string) => t.money.categories[categoryById(id).id];

/** Which bucket a category's spending counts against, after your own overrides. */
export function kindOf(id: string, overrides: Record<string, 'need' | 'fun'>): SpendKind {
  const category = categoryById(id);
  if (category.defaultKind === 'reinvest') return 'reinvest';
  return overrides[category.id] ?? category.defaultKind;
}

/** Bucket colors, shared by bars, icons and chips. */
export const KIND_COLOR: Record<SpendKind | 'savings', string> = {
  need: 'var(--c-needs)',
  fun: 'var(--c-fun)',
  reinvest: 'var(--c-hustle)',
  savings: 'var(--c-money)',
};
