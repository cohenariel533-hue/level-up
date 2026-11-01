import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

export type ThemePref = 'dark' | 'light' | 'system';

/** Every app-wide setting, with its type. Add new settings here. */
export interface AppSettings {
  theme: ThemePref;
  /** Exam mode lowers weekly targets (hustle 2 h, YouTube paused). Used from stage 3. */
  examMode: boolean;
  /** When the last JSON backup was exported (ISO timestamp). */
  lastBackupAt: string | null;
  /** When the app was first opened on this device. */
  installedAt: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  examMode: false,
  lastBackupAt: null,
  installedAt: null,
};

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const row = await db.settings.get(key);
  return row ? (row.value as AppSettings[K]) : DEFAULT_SETTINGS[key];
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

/**
 * React hook: the current value of a setting, re-rendering whenever it changes.
 * Returns `undefined` for the split second while the database is loading.
 */
export function useSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | undefined {
  return useLiveQuery(() => getSetting(key), [key]);
}
