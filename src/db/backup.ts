import { z } from 'zod';
import { t } from '../i18n/en';
import { todayISO } from '../lib/dates';
import { saveFile, type SaveResult } from '../lib/saveFile';
import { db } from './schema';
import { setSetting } from './settings';

/**
 * Backups are one JSON file holding every table in the database:
 *
 *   { format: "level-up-backup", schemaVersion: 1, exportedAt: "…",
 *     tables: { settings: [ … ], expenses: [ … ], … } }
 *
 * The code loops over db.tables, so tables added in later stages are
 * included automatically.
 */

export const BACKUP_FORMAT = 'level-up-backup';

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type Backup = z.infer<typeof backupSchema>;

export type ParseResult =
  | { ok: true; backup: Backup; recordCount: number }
  | { ok: false; error: string };

/** Settings that stay on this device: never written to a backup file, never replaced by one. */
const DEVICE_ONLY_SETTINGS = new Set(['studyPlannerKey']);
/** Tables that are only a cache of data living elsewhere (Study Planner), left out of backups. */
const CACHE_TABLES = new Set(['studyFeed']);

/** Reads every table into one backup object. */
export async function createBackup(): Promise<Backup> {
  const tables: Backup['tables'] = {};
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) {
      if (CACHE_TABLES.has(table.name)) continue;
      const rows = await table.toArray();
      tables[table.name] =
        table.name === 'settings' ? rows.filter((r) => !DEVICE_ONLY_SETTINGS.has((r as { key: string }).key)) : rows;
    }
  });
  return {
    format: BACKUP_FORMAT,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/** Creates a backup and hands it to the user as a file. */
export async function exportBackup(): Promise<SaveResult> {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const result = await saveFile(`level-up-backup-${todayISO()}.json`, blob);
  if (result !== 'cancelled') await setSetting('lastBackupAt', new Date().toISOString());
  return result;
}

/** Checks that a file's text is a valid backup this version can restore. Changes nothing. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: t.backup.errNotJson };
  }

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: t.backup.errNotBackup };
  if (parsed.data.schemaVersion > db.verno) return { ok: false, error: t.backup.errNewer };

  const recordCount = Object.values(parsed.data.tables).reduce((n, rows) => n + rows.length, 0);
  return { ok: true, backup: parsed.data, recordCount };
}

/**
 * Replaces all data with the backup's. Runs as one transaction: if any record
 * fails to save, the whole restore is cancelled and the current data stays.
 * Tables the backup doesn't have (made before that stage existed) end up empty.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    // Keep this device's own settings (like the Study Planner key) and caches.
    const keep = await db.settings.where('key').anyOf([...DEVICE_ONLY_SETTINGS]).toArray();
    for (const table of db.tables) {
      if (CACHE_TABLES.has(table.name)) continue;
      await table.clear();
      const rows = backup.tables[table.name]?.filter(
        (r) => table.name !== 'settings' || !DEVICE_ONLY_SETTINGS.has(r.key as string),
      );
      if (rows?.length) await table.bulkAdd(rows);
    }
    if (keep.length) await db.settings.bulkPut(keep);
  });
}

/** Deletes the whole database. The caller reloads the app afterwards. */
export async function eraseAllData(): Promise<void> {
  await db.delete();
  try {
    localStorage.removeItem('levelup-theme');
  } catch {
    // ignore
  }
}
