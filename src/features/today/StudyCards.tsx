import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { BookOpen, CalendarClock, GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button, GlassCard } from '../../components/ui';
import { setSetting } from '../../db/settings';
import type { CachedFeed } from '../../db/studyFeed';
import { t } from '../../i18n/en';
import { formatDayShort } from '../../lib/dates';
import { daysUntilFeedDate, examSoon, studyMinutesToday, upcomingExams } from '../../lib/studyFeed';
import { formatDuration } from '../../lib/time';
import s from '../week/week.module.css';

/** "Exam in 9 days. Switch on exam mode?", shown when exam mode is off and an exam is close. */
export function ExamModeSuggestion({ cached, examMode }: { cached: CachedFeed; examMode: boolean }) {
  const exam = examSoon(cached.feed);
  if (examMode || !exam) return null;
  return (
    <GlassCard strong style={{ '--item-color': 'var(--c-school)' } as CSSProperties}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="list-icon">
          <GraduationCap aria-hidden="true" />
        </span>
        <p className="list-text list-label">{t.study.examModeSuggest(exam.course, daysUntilFeedDate(exam.at))}</p>
      </div>
      <Button variant="secondary" block style={{ marginTop: 12 }} onClick={() => setSetting('examMode', true)}>
        {t.study.examModeOn}
      </Button>
    </GlassCard>
  );
}

/** Exams, quizzes and deadlines from Study Planner, nearest first. */
export function ComingUpCard({ cached }: { cached: CachedFeed }) {
  const exams = upcomingExams(cached.feed, new Date(), 45).slice(0, 4);
  const deadlines = cached.feed.deadlines.filter((d) => daysUntilFeedDate(d.due) <= 7).slice(0, 4);

  return (
    <GlassCard title={t.study.examsTitle}>
      {exams.length === 0 && deadlines.length === 0 ? (
        <p className="muted small">{t.study.noExams}</p>
      ) : (
        <div className="list">
          {exams.map((e) => {
            const days = daysUntilFeedDate(e.at);
            return (
              <div key={e.id} className="list-row" style={{ cursor: 'default', '--item-color': 'var(--c-school)' } as CSSProperties}>
                <span className="list-icon">
                  <GraduationCap aria-hidden="true" />
                </span>
                <span className="list-text">
                  <span className="list-label">{e.course || e.title}</span>
                  <span className="list-sub">
                    {e.kind === 'quiz' ? t.study.quiz : t.study.exam} · {formatDayShort(e.at.slice(0, 10))}
                  </span>
                </span>
                <span className="chip" style={{ '--item-color': days <= 7 ? 'var(--c-fun)' : 'var(--c-school)' } as CSSProperties}>
                  {t.study.examIn(days)}
                </span>
              </div>
            );
          })}
          {deadlines.map((d) => {
            const left = Math.max(d.effortMin - d.doneMin, 0);
            return (
              <div key={d.id} className="list-row" style={{ cursor: 'default', '--item-color': 'var(--accent)' } as CSSProperties}>
                <span className="list-icon">
                  <CalendarClock aria-hidden="true" />
                </span>
                <span className="list-text">
                  <span className="list-label">{d.title}</span>
                  <span className="list-sub">
                    {[d.course, t.study.dueIn(daysUntilFeedDate(d.due)), left > 0 ? t.study.workLeft(formatDuration(left)) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="faint small" style={{ marginTop: 10 }}>
        {ago(cached.fetchedAt)}
      </p>
    </GlassCard>
  );
}

/** Today's classes and study blocks as Study Planner planned them. */
export function StudyPlanCard({ cached }: { cached: CachedFeed }) {
  const { feed } = cached;
  const studied = studyMinutesToday(feed);
  if (feed.today.length === 0 && !studied && !feed.working) return null;

  return (
    <GlassCard title={t.study.planTitle} action={studied > 0 && <span className="faint small">{t.study.studiedToday(formatDuration(studied))}</span>}>
      {feed.working && (
        <p className="small" style={{ color: 'var(--c-school)', fontWeight: 600, marginBottom: 6 }}>
          {t.study.nowWorking(feed.working.title)}
        </p>
      )}
      {feed.today.map((item, i) => (
        <div key={i} className={s.block} style={{ '--item-color': 'var(--c-school)' } as CSSProperties}>
          <span className={s.time}>{item.start}</span>
          <span className={s.colorBar} />
          <span className={s.info}>
            <span className={s.title}>{item.title}</span>
            <span className={s.meta}>
              <BookOpen aria-hidden="true" />
              {[item.course, `${item.start}–${item.end}`].filter(Boolean).join(' · ')}
            </span>
          </span>
        </div>
      ))}
    </GlassCard>
  );
}

const ago = (iso: string) => t.study.stale(formatDistanceToNowStrict(parseISO(iso), { addSuffix: true }));
