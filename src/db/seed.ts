import { getSetting, setSetting } from './settings';

/**
 * Runs once at startup. Fills in first-run data and asks the browser to keep
 * our storage. Later stages add their defaults here (weekly template, money
 * categories, the first YouTube video…), each guarded so it only runs once.
 */
export async function initDatabase(): Promise<void> {
  if (!(await getSetting('installedAt'))) {
    await setSetting('installedAt', new Date().toISOString());
  }

  // Ask the browser not to clear our data when the device is low on space.
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported everywhere, and that's fine.
  }
}
