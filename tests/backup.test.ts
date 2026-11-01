import 'fake-indexeddb/auto'; // an in-memory IndexedDB so tests run in Node
import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, createBackup, parseBackup, restoreBackup } from '../src/db/backup';
import { db } from '../src/db/schema';
import { getSetting, setSetting } from '../src/db/settings';

beforeEach(async () => {
  await db.settings.clear();
});

describe('backup', () => {
  it('round-trips: export, change things, restore, and get the old data back', async () => {
    await setSetting('theme', 'light');
    await setSetting('examMode', true);
    const backup = await createBackup();

    await setSetting('theme', 'dark');
    await setSetting('examMode', false);

    // Go through JSON text exactly like a real file would.
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.recordCount).toBe(2);

    await restoreBackup(parsed.backup);
    expect(await getSetting('theme')).toBe('light');
    expect(await getSetting('examMode')).toBe(true);
  });

  it('rejects files that are not JSON', () => {
    const r = parseBackup('hello');
    expect(r.ok).toBe(false);
  });

  it('rejects JSON that is not a Level Up backup', () => {
    expect(parseBackup(JSON.stringify({ some: 'thing' })).ok).toBe(false);
  });

  it('rejects backups from a newer version of the app', () => {
    const fromTheFuture = { format: BACKUP_FORMAT, schemaVersion: 999, exportedAt: '2027-01-01', tables: {} };
    expect(parseBackup(JSON.stringify(fromTheFuture)).ok).toBe(false);
  });

  it('changes nothing if a record in the backup is broken', async () => {
    await setSetting('theme', 'light');
    const broken = {
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      // second row is missing its "key", so it can't be saved
      tables: { settings: [{ key: 'theme', value: 'dark' }, { value: 'oops' }] },
    };
    const parsed = parseBackup(JSON.stringify(broken));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await expect(restoreBackup(parsed.backup)).rejects.toThrow();
    expect(await getSetting('theme')).toBe('light');
  });
});
