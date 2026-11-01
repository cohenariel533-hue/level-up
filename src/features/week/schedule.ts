import type { ClassSlot, Pillar, TemplateBlock } from '../../db/schema';
import { t } from '../../i18n/en';
import type { WeeklyEvent } from '../../lib/ics';
import { minutesBetween } from '../../lib/time';

/** A block as it appears on a day: either from the template, or a locked class. */
export interface ScheduledBlock {
  /** "tpl-12" or "class-3": also the key stored when it's ticked off. */
  key: string;
  title: string;
  pillar: Pillar;
  start: string | null;
  minutes: number;
  /** Classes are locked: edited only in the classes list. */
  locked: boolean;
  template?: TemplateBlock;
  classSlot?: ClassSlot;
}

/** All blocks for one weekday, classes included, sorted by start time (untimed first). */
export function blocksForDay(day: number, template: TemplateBlock[], classes: ClassSlot[]): ScheduledBlock[] {
  const blocks: ScheduledBlock[] = [
    ...classes
      .filter((c) => c.day === day)
      .map((c) => ({
        key: `class-${c.id}`,
        title: c.name,
        pillar: 'school' as const,
        start: c.start,
        minutes: minutesBetween(c.start, c.end),
        locked: true,
        classSlot: c,
      })),
    ...template
      .filter((b) => b.day === day)
      .map((b) => ({
        key: `tpl-${b.id}`,
        title: b.title,
        pillar: b.pillar,
        start: b.start,
        minutes: b.minutes,
        locked: false,
        template: b,
      })),
  ];
  return blocks.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
}

/** Timed template blocks + classes, as weekly calendar events for the .ics export. */
export function weekEvents(template: TemplateBlock[], classes: ClassSlot[]): WeeklyEvent[] {
  return [
    ...classes.map((c) => ({
      uid: `class-${c.id}`,
      title: c.name,
      day: c.day,
      start: c.start,
      minutes: minutesBetween(c.start, c.end),
      description: t.week.icsClassNote,
    })),
    ...template
      .filter((b) => b.start && b.minutes > 0)
      .map((b) => ({ uid: `tpl-${b.id}`, title: b.title, day: b.day, start: b.start!, minutes: b.minutes })),
  ];
}
