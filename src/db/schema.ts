import Dexie, { type Table } from 'dexie';

/**
 * Level Up's local database (IndexedDB, via Dexie). Nothing leaves the device.
 *
 * Conventions for every table:
 * - Dates are ISO strings ("2026-11-01", or a full timestamp), never Date
 *   objects, so JSON backups restore exactly.
 * - Money is a plain number of shekels.
 *
 * Adding tables later: each build stage adds a new `this.version(n)` block
 * below with only the new or changed tables. Never edit an old block —
 * Dexie uses them to upgrade existing data safely.
 */

/** One app setting, stored as a key → value pair (see settings.ts). */
export interface SettingRow {
  key: string;
  value: unknown;
}

export class LevelUpDB extends Dexie {
  settings!: Table<SettingRow, string>;

  constructor(name = 'level-up') {
    super(name);

    // v1 — Stage 1: app settings (theme, exam mode, last backup date…)
    this.version(1).stores({
      settings: 'key',
    });
  }
}

export const db = new LevelUpDB();
