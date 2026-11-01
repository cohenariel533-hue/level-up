import { SAFETY_BUFFER_TARGET } from '../lib/money';
import { DEFAULT_TEMPLATE } from './defaultTemplate';
import { db } from './schema';
import { getSetting, setSetting } from './settings';

/**
 * Runs at startup (and after a backup restore). Fills in first-run data and
 * asks the browser to keep our storage. Each stage adds its defaults here,
 * each guarded so it only runs when that data is missing.
 */
export async function initDatabase(): Promise<void> {
  if (!(await getSetting('installedAt'))) {
    await setSetting('installedAt', new Date().toISOString());
  }

  await seedSavingsGoals();
  await seedWeekTemplate();

  // Ask the browser not to clear our data when the device is low on space.
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported everywhere, and that's fine.
  }
}

/**
 * Stage 3: the default weekly template. Guarded by a flag rather than "table
 * is empty", so deliberately clearing the template doesn't refill it.
 */
async function seedWeekTemplate() {
  if (await getSetting('templateSeeded')) return;
  if ((await db.templateBlocks.count()) === 0) await db.templateBlocks.bulkAdd(DEFAULT_TEMPLATE);
  await setSetting('templateSeeded', true);
}

/** Stage 2: the two built-in goals, in order: safety buffer, then one month of needs. */
async function seedSavingsGoals() {
  if ((await db.savingsGoals.count()) > 0) return;
  await db.savingsGoals.bulkAdd([
    { name: 'Safety buffer', target: SAFETY_BUFFER_TARGET, kind: 'buffer', order: 1 },
    { name: 'One month of needs', target: null, kind: 'month', order: 2 },
  ]);
}
