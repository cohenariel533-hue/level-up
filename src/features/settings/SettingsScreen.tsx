import { Download, HardDrive, Info, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Button, GlassCard, ListRow, PageHeader, Segmented, Sheet, useToast } from '../../components/ui';
import { eraseAllData, exportBackup, parseBackup, restoreBackup, type Backup } from '../../db/backup';
import { initDatabase } from '../../db/seed';
import { setSetting, useSetting, type ThemePref } from '../../db/settings';
import { t } from '../../i18n/en';
import { daysSince, formatShortDate } from '../../lib/dates';

const APP_VERSION = '0.4.0 · Stage 4';

export default function SettingsScreen() {
  const theme = useSetting('theme');
  const lastBackupAt = useSetting('lastBackupAt');
  const toast = useToast();
  const storage = useStorageStatus();

  const fileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<{ backup: Backup; recordCount: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportBackup();
      if (result !== 'cancelled') toast(t.settings.backupSaved);
    } catch {
      toast(t.settings.backupFailed);
    } finally {
      setExporting(false);
    }
  }

  // Step 1 of restoring: read and check the file, then ask before replacing anything.
  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets you pick the same file again later
    if (!file) return;
    const result = parseBackup(await file.text());
    if (result.ok) setPending({ backup: result.backup, recordCount: result.recordCount });
    else setImportError(result.error);
  }

  // Step 2: the user confirmed, so replace the data.
  async function confirmRestore() {
    if (!pending) return;
    try {
      await restoreBackup(pending.backup);
      await initDatabase(); // an older backup may lack newer defaults (e.g. savings goals)
      toast(t.settings.restored);
    } catch {
      setImportError(t.backup.errRestore);
    } finally {
      setPending(null);
    }
  }

  async function confirmReset() {
    await eraseAllData();
    window.location.reload();
  }

  return (
    <>
      <PageHeader title={t.settings.title} />

      <div className="stack">
        <GlassCard title={t.settings.appearance}>
          <Segmented<ThemePref>
            label={t.settings.appearance}
            value={theme}
            onChange={(v) => setSetting('theme', v)}
            options={[
              { value: 'dark', label: t.settings.themeDark },
              { value: 'light', label: t.settings.themeLight },
              { value: 'system', label: t.settings.themeSystem },
            ]}
          />
        </GlassCard>

        <GlassCard title={t.settings.backupTitle}>
          <div className="stack" style={{ '--gap': '14px' } as CSSProperties}>
            <p className="muted small">{t.settings.backupIntro}</p>
            <div className="list">
              <ListRow label={t.settings.lastBackup} detail={formatLastBackup(lastBackupAt)} />
            </div>
            <Button variant="primary" size="lg" block icon={<Download />} onClick={handleExport} disabled={exporting}>
              {t.settings.exportBtn}
            </Button>
            <Button variant="secondary" size="lg" block icon={<Upload />} onClick={() => fileInput.current?.click()}>
              {t.settings.importBtn}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              onChange={handleFileChosen}
            />
          </div>
        </GlassCard>

        <GlassCard title={t.settings.storageTitle}>
          <div className="list">
            <ListRow
              icon={HardDrive}
              color="var(--c-money)"
              label={storage.installed ? t.settings.storageInstalled : t.settings.storageNotInstalled}
              sub={storage.installed ? t.settings.storageInstalledSub : t.settings.storageNotInstalledSub}
            />
          </div>
        </GlassCard>

        <GlassCard title={t.settings.resetTitle}>
          <div className="list">
            <ListRow icon={RotateCcw} color="var(--c-neutral)" label={t.settings.resetRow} onClick={() => setResetOpen(true)} />
          </div>
        </GlassCard>

        <GlassCard title={t.settings.about}>
          <div className="list">
            <ListRow icon={Info} color="var(--accent)" label={t.settings.version} detail={APP_VERSION} />
          </div>
        </GlassCard>
      </div>

      {/* Confirm restore */}
      <Sheet open={pending !== null} onClose={() => setPending(null)} title={t.settings.restoreTitle}>
        {pending && (
          <div className="stack">
            <p className="muted">
              {t.settings.restoreBody(pending.recordCount, formatShortDate(pending.backup.exportedAt))}
            </p>
            <Button variant="primary" size="lg" block onClick={confirmRestore}>
              {t.settings.restoreConfirm}
            </Button>
            <Button variant="ghost" block onClick={() => setPending(null)}>
              {t.settings.cancel}
            </Button>
          </div>
        )}
      </Sheet>

      {/* Bad file */}
      <Sheet open={importError !== null} onClose={() => setImportError(null)} title={t.settings.importErrorTitle}>
        <div className="stack">
          <p className="muted">{importError}</p>
          <Button variant="secondary" size="lg" block onClick={() => setImportError(null)}>
            {t.settings.ok}
          </Button>
        </div>
      </Sheet>

      {/* Confirm erase */}
      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title={t.settings.resetTitle}>
        <div className="stack">
          <p className="muted">{t.settings.resetBody}</p>
          <Button variant="secondary" size="lg" block icon={<Download />} onClick={handleExport}>
            {t.settings.exportBtn}
          </Button>
          <Button variant="subtle" size="lg" block onClick={confirmReset}>
            {t.settings.resetConfirm}
          </Button>
          <Button variant="ghost" block onClick={() => setResetOpen(false)}>
            {t.settings.cancel}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function formatLastBackup(iso: string | null | undefined): string {
  if (!iso) return t.settings.never;
  const days = daysSince(iso);
  return days === 0 ? t.settings.today : t.settings.daysAgo(days);
}

/** Whether the app runs from the Home Screen (where iOS keeps its data safe). */
function useStorageStatus() {
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { installed };
}
