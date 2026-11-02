import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, GlassCard, PageHeader, Segmented, useToast } from '../../components/ui';
import { ensureTodayMoves } from '../../db/moves';
import { setSetting, useSetting } from '../../db/settings';
import { t } from '../../i18n/en';
import type { EnergyPeak, GymLevel, GymSetup, HustleStage, Profile } from '../../lib/profile';
import { CATEGORIES } from '../money/categories';
import hs from '../hustle/hustle.module.css';

/** About me: the answers the coach uses to fit your moves to your real life. */
export default function ProfileScreen() {
  const saved = useSetting('profile');
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Profile | null>(null);

  useEffect(() => {
    if (saved && !form) setForm(saved);
  }, [saved, form]);

  if (!form) return null;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm({ ...form, [key]: value });

  async function save() {
    if (!form) return;
    await setSetting('profile', { ...form, name: form.name.trim(), why: form.why.trim(), completedAt: form.completedAt ?? new Date().toISOString() });
    await ensureTodayMoves(); // the "About me" move ticks itself
    toast(t.me.saved);
    navigate('/');
  }

  const watchable = CATEGORIES.filter((c) => c.defaultKind !== 'reinvest');

  return (
    <>
      <PageHeader title={t.me.title} />
      <p className="muted" style={{ margin: '-10px 4px 18px' }}>
        {t.me.intro}
      </p>

      <div className="stack">
        <GlassCard>
          <div className="stack" style={{ gap: 14 }}>
            <Field label={t.me.name}>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label={t.me.why}>
              <textarea className="input" rows={2} value={form.why} placeholder={t.me.whyPlaceholder} onChange={(e) => set('why', e.target.value)} />
            </Field>
          </div>
        </GlassCard>

        <GlassCard title={t.me.sleepTitle}>
          <div className="stack" style={{ gap: 14 }}>
            <div className="form-row">
              <Field label={t.me.wake}>
                <input className="input" type="time" value={form.wake} onChange={(e) => set('wake', e.target.value)} />
              </Field>
              <Field label={t.me.bed}>
                <input className="input" type="time" value={form.bed} onChange={(e) => set('bed', e.target.value)} />
              </Field>
            </div>
            <div className="form-row">
              <Field label={t.me.wakeGoal}>
                <input className="input" type="time" value={form.wakeGoal} onChange={(e) => set('wakeGoal', e.target.value)} />
              </Field>
              <Field label={t.me.bedGoal}>
                <input className="input" type="time" value={form.bedGoal} onChange={(e) => set('bedGoal', e.target.value)} />
              </Field>
            </div>
            <p className="faint small">{t.me.sleepHint}</p>
            <Field label={t.me.energy}>
              <Segmented<EnergyPeak>
                label={t.me.energy}
                value={form.energyPeak}
                onChange={(v) => set('energyPeak', v)}
                options={(['morning', 'afternoon', 'evening'] as const).map((v) => ({ value: v, label: t.me.energyOptions[v] }))}
              />
            </Field>
          </div>
        </GlassCard>

        <GlassCard title={t.me.gymTitle}>
          <div className="stack" style={{ gap: 14 }}>
            <Field label={t.me.gymLevel}>
              <Segmented<GymLevel>
                label={t.me.gymLevel}
                value={form.gymLevel}
                onChange={(v) => set('gymLevel', v)}
                options={(['beginner', 'intermediate', 'advanced'] as const).map((v) => ({ value: v, label: t.me.gymLevels[v] }))}
              />
            </Field>
            <Field label={t.me.gymSetup}>
              <Segmented<GymSetup>
                label={t.me.gymSetup}
                value={form.gymSetup}
                onChange={(v) => set('gymSetup', v)}
                options={(['gym', 'home', 'dumbbells'] as const).map((v) => ({ value: v, label: t.me.gymSetups[v] }))}
              />
            </Field>
            <Field label={t.me.gymDays}>
              <Segmented<string>
                label={t.me.gymDays}
                value={String(form.gymDays)}
                onChange={(v) => set('gymDays', Number(v))}
                options={['2', '3', '4', '5'].map((v) => ({ value: v, label: v }))}
              />
            </Field>
          </div>
        </GlassCard>

        <GlassCard title={t.me.hustleTitle}>
          <Field label={t.me.hustleStage}>
            <Segmented<HustleStage>
              label={t.me.hustleStage}
              value={form.hustleStage}
              onChange={(v) => set('hustleStage', v)}
              options={(['notStarted', 'demo', 'customers'] as const).map((v) => ({ value: v, label: t.me.hustleStages[v] }))}
            />
          </Field>
        </GlassCard>

        <GlassCard title={t.me.moneyTitle}>
          <Field label={t.me.moneyWatch}>
            <div className={hs.chips}>
              {watchable.map((c) => {
                const on = form.moneyWatch.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={hs.chip}
                    aria-pressed={on}
                    style={{ '--c-hustle': 'var(--c-money)' } as CSSProperties}
                    onClick={() => set('moneyWatch', on ? form.moneyWatch.filter((x) => x !== c.id) : [...form.moneyWatch, c.id])}
                  >
                    {t.money.categories[c.id]}
                  </button>
                );
              })}
            </div>
          </Field>
        </GlassCard>

        <Button variant="primary" size="lg" block onClick={save}>
          {t.me.save}
        </Button>
      </div>
    </>
  );
}
