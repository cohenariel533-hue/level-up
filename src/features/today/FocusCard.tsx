import { useLiveQuery } from 'dexie-react-hooks';
import { Target } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GlassCard } from '../../components/ui';
import { db } from '../../db/schema';
import { setFocus } from '../../db/week';
import { t } from '../../i18n/en';
import s from '../week/week.module.css';

/** "The one thing that matters today": typed each morning, saved as you type. */
export function FocusCard({ date }: { date: string }) {
  const saved = useLiveQuery(async () => (await db.days.get(date))?.focus ?? '', [date]);
  const [text, setText] = useState('');
  const loadedFor = useRef<string | null>(null);

  // Load the saved text once per day (not on every save, which would fight the cursor).
  useEffect(() => {
    if (saved !== undefined && loadedFor.current !== date) {
      loadedFor.current = date;
      setText(saved);
    }
  }, [saved, date]);

  // Save half a second after you stop typing.
  useEffect(() => {
    if (loadedFor.current !== date || text === saved) return;
    const id = setTimeout(() => setFocus(date, text.trim() ? text : ''), 500);
    return () => clearTimeout(id);
  }, [text, saved, date]);

  return (
    <GlassCard strong style={{ '--item-color': 'var(--accent)' } as CSSProperties}>
      <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Target size={14} aria-hidden="true" />
        {t.today.focusTitle}
      </p>
      <input
        className={s.focusInput}
        value={text}
        placeholder={t.today.focusPlaceholder}
        aria-label={t.today.focusTitle}
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </GlassCard>
  );
}
