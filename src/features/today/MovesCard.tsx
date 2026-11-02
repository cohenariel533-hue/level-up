import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Flame, RefreshCw } from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, ProgressBar, useToast } from '../../components/ui';
import { ensureTodayMoves, swapMove, toggleMove } from '../../db/moves';
import { db, type StoredMove } from '../../db/schema';
import { useNow } from '../../hooks/useNow';
import { t } from '../../i18n/en';
import { momentum } from '../../lib/coach';
import { todayISO } from '../../lib/dates';
import ws from '../week/week.module.css';
import s from './today.module.css';

const PILLAR_COLOR: Record<string, string> = {
  school: 'var(--c-school)',
  gym: 'var(--c-gym)',
  hustle: 'var(--c-hustle)',
  money: 'var(--c-money)',
  life: 'var(--accent)',
};

/** Today's 3 moves from the coach: tick them, tap to go there, or swap one out. */
export function MovesCard() {
  const toast = useToast();
  const navigate = useNavigate();
  const now = useNow(60_000);
  const date = todayISO();

  // Pick today's moves (first open of the day), and re-check self-ticking ones every minute.
  useEffect(() => {
    void ensureTodayMoves();
  }, [date, now]);

  const data = useLiveQuery(async () => {
    const [day, recent] = await Promise.all([db.moves.get(date), db.moves.where('date').belowOrEqual(date).reverse().limit(30).toArray()]);
    return { day, streak: momentum(recent, date) };
  }, [date]);

  if (!data?.day) return null;
  const visible = data.day.moves.filter((m) => m.status !== 'skipped');
  const done = visible.filter((m) => m.status === 'done').length;

  async function swap(m: StoredMove) {
    toast((await swapMove(date, m.id)) ? t.coach.swapped : t.coach.noMore);
  }

  return (
    <GlassCard
      title={t.coach.title}
      action={
        data.streak > 0 ? (
          <span className={s.streak}>
            <Flame aria-hidden="true" />
            {t.coach.momentum(data.streak)}
          </span>
        ) : (
          <span className="faint small">{t.coach.progress(done, visible.length)}</span>
        )
      }
    >
      <ProgressBar value={done} max={visible.length} color="var(--accent)" />
      <div style={{ marginTop: 6 }}>
        {visible.map((m) => (
          <div key={m.id} className={ws.block} style={{ '--item-color': PILLAR_COLOR[m.pillar] ?? 'var(--accent)' } as CSSProperties}>
            <button
              type="button"
              role="checkbox"
              aria-checked={m.status === 'done'}
              aria-label={m.title}
              className={ws.check}
              onClick={() => toggleMove(date, m.id)}
            >
              <Check aria-hidden="true" strokeWidth={3} />
            </button>
            <span className={ws.colorBar} />
            <button
              type="button"
              className={s.moveText}
              disabled={!m.to}
              onClick={() => m.to && navigate(m.to)}
            >
              <span className={`${ws.title} ${m.status === 'done' ? ws.doneTitle : ''}`}>{m.title}</span>
              <span className={ws.meta}>
                {[m.carried ? t.coach.carried : null, m.minutes > 0 ? t.coach.minutes(m.minutes) : null, m.detail]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
            {m.status === 'open' && (
              <button type="button" className={s.swap} aria-label={t.coach.swap} onClick={() => swap(m)}>
                <RefreshCw aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
      {visible.length > 0 && done === visible.length && (
        <p className="small" style={{ marginTop: 12, color: 'var(--c-money)', fontWeight: 600 }}>
          {t.coach.allDone}
        </p>
      )}
    </GlassCard>
  );
}
