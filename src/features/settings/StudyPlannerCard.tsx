import { formatDistanceToNowStrict } from 'date-fns';
import { GraduationCap, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Field, GlassCard, ListRow, useToast } from '../../components/ui';
import { setSetting, useSetting } from '../../db/settings';
import { forgetStudyFeed, syncStudyFeed, useStudyFeed } from '../../db/studyFeed';
import { t } from '../../i18n/en';

/** Settings → connect to Study Planner on the Mac (address + key), and the weekly study goal. */
export function StudyPlannerCard() {
  const toast = useToast();
  const savedUrl = useSetting('studyPlannerUrl');
  const savedKey = useSetting('studyPlannerKey');
  const savedGoal = useSetting('studyGoalHours');
  const cached = useStudyFeed();

  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [goal, setGoal] = useState('15');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the fields once the saved values load. The key field stays empty: it's never shown again.
  useEffect(() => {
    if (savedUrl !== undefined) setUrl(savedUrl);
  }, [savedUrl]);
  useEffect(() => {
    if (savedGoal !== undefined) setGoal(String(savedGoal));
  }, [savedGoal]);

  const hasKey = !!savedKey;

  async function connect() {
    setBusy(true);
    setError(null);
    await setSetting('studyPlannerUrl', url.trim());
    if (key.trim()) await setSetting('studyPlannerKey', key.trim());
    const hours = Math.round(Number(goal));
    if (hours > 0) await setSetting('studyGoalHours', hours);
    const result = await syncStudyFeed();
    setBusy(false);
    if (result.ok) {
      setKey('');
      toast(t.study.synced);
    } else {
      setError(t.study.errors[result.reason]);
    }
  }

  async function disconnect() {
    await Promise.all([setSetting('studyPlannerUrl', ''), setSetting('studyPlannerKey', ''), forgetStudyFeed()]);
    setUrl('');
    setKey('');
    setError(null);
  }

  return (
    <GlassCard title={t.study.settingsTitle}>
      <div className="stack" style={{ gap: 14 }}>
        <p className="muted small">{t.study.settingsIntro}</p>
        <p className="faint small">
          {t.study.howToStart}{' '}
          {t.study.howToPath.map((step, i) => (
            <span key={step}>
              {i > 0 && ' → '}
              <bdi>
                <b>{step}</b>
              </bdi>
            </span>
          ))}
          . {t.study.howToEnd}
        </p>

        {cached && (
          <div className="list">
            <ListRow
              icon={GraduationCap}
              color="var(--c-school)"
              label={t.study.connected}
              sub={t.study.lastSync(formatDistanceToNowStrict(new Date(cached.fetchedAt), { addSuffix: true }))}
            />
          </div>
        )}

        <Field label={t.study.url}>
          <input
            className="input"
            dir="ltr"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            placeholder={t.study.urlPlaceholder}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <Field label={t.study.key}>
          <input
            className="input"
            type="password"
            autoComplete="off"
            value={key}
            placeholder={hasKey ? `•••••••• (${t.study.keySaved})` : t.study.keyPlaceholder}
            onChange={(e) => setKey(e.target.value)}
          />
        </Field>
        <Field label={t.study.goal}>
          <input
            className="input"
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))}
          />
        </Field>

        {error && (
          <p className="small" style={{ color: 'var(--c-over)' }}>
            {error}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          block
          icon={<RefreshCw />}
          onClick={connect}
          disabled={busy || !url.trim() || (!hasKey && !key.trim())}
        >
          {cached ? t.study.syncNow : t.study.connect}
        </Button>
        {(cached || hasKey) && (
          <Button variant="ghost" icon={<Unplug />} onClick={disconnect}>
            {t.study.disconnect}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
