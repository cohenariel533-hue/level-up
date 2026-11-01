/** Everything that writes the weekly template, classes and day logs. */
import { DEFAULT_TEMPLATE } from './defaultTemplate';
import { db, type ClassSlot, type DayLog, type DoneBlock, type TemplateBlock } from './schema';

// ---------- Template ----------

export const addBlock = (block: Omit<TemplateBlock, 'id'>) => db.templateBlocks.add(block);
export const updateBlock = (id: number, changes: Partial<Omit<TemplateBlock, 'id'>>) =>
  db.templateBlocks.update(id, changes);
export const deleteBlock = (id: number) => db.templateBlocks.delete(id);

/** Replaces the whole template with the default one. Classes are kept. */
export async function resetTemplate() {
  await db.transaction('rw', db.templateBlocks, async () => {
    await db.templateBlocks.clear();
    await db.templateBlocks.bulkAdd(DEFAULT_TEMPLATE);
  });
}

// ---------- Classes ----------

export const addClass = (slot: Omit<ClassSlot, 'id'>) => db.classes.add(slot);
export const updateClass = (id: number, changes: Partial<Omit<ClassSlot, 'id'>>) => db.classes.update(id, changes);
export const deleteClass = (id: number) => db.classes.delete(id);

// ---------- Day logs ----------

const emptyDay = (date: string): DayLog => ({ date, focus: '', done: [] });

export async function setFocus(date: string, focus: string) {
  await db.transaction('rw', db.days, async () => {
    const day = (await db.days.get(date)) ?? emptyDay(date);
    await db.days.put({ ...day, focus });
  });
}

/** Ticks a block off for the day, or un-ticks it if it was already done. */
export async function toggleBlockDone(date: string, block: DoneBlock) {
  await db.transaction('rw', db.days, async () => {
    const day = (await db.days.get(date)) ?? emptyDay(date);
    const isDone = day.done.some((d) => d.key === block.key);
    const done = isDone ? day.done.filter((d) => d.key !== block.key) : [...day.done, block];
    await db.days.put({ ...day, done });
  });
}
