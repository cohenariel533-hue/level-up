/**
 * Study Planner's feed: what it looks like, how to fetch it, and small
 * helpers for using it. Study Planner (on the Mac) serves it read-only at
 * /api/levelup/feed; see levelup_feed.py over there.
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { z } from 'zod';
import { toISODate } from './dates';

const itemSchema = z.object({
  type: z.string(),
  title: z.string(),
  course: z.string().optional().default(''),
  start: z.string(),
  end: z.string(),
});

export const studyFeedSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  exams: z.array(
    z.object({ id: z.string(), title: z.string(), course: z.string(), kind: z.string(), at: z.string() }),
  ),
  deadlines: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      course: z.string(),
      kind: z.string(),
      due: z.string(),
      effortMin: z.number(),
      doneMin: z.number(),
      started: z.boolean(),
    }),
  ),
  studyMinutesByDay: z.record(z.string(), z.number()),
  plannedMinutesByDay: z.record(z.string(), z.number()),
  today: z.array(itemSchema),
  working: z.object({ title: z.string(), course: z.string(), since: z.string().nullable().optional() }).nullable(),
});

export type StudyFeed = z.infer<typeof studyFeedSchema>;
export type StudyExam = StudyFeed['exams'][number];

export type FetchResult =
  | { ok: true; feed: StudyFeed }
  | { ok: false; reason: 'not-set-up' | 'unreachable' | 'wrong-key' | 'not-https' | 'bad-data' | 'error'; detail?: string };

/**
 * Fetches the feed. Never throws: every problem comes back as a reason the
 * Settings screen can explain ("Mac not reachable", "wrong key"…).
 */
export async function fetchStudyFeed(url: string, key: string, timeoutMs = 8000): Promise<FetchResult> {
  if (!url || !key) return { ok: false, reason: 'not-set-up' };
  // An https page can't read plain http (except this dev machine), so say that clearly.
  const pageIsHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  if (pageIsHttps && url.startsWith('http:')) return { ok: false, reason: 'not-https' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 429) return { ok: false, reason: 'wrong-key' };
    if (!response.ok) return { ok: false, reason: 'error', detail: `HTTP ${response.status}` };
    const parsed = studyFeedSchema.safeParse(await response.json());
    return parsed.success ? { ok: true, feed: parsed.data } : { ok: false, reason: 'bad-data' };
  } catch {
    // Network error, timeout or CORS refusal: from the phone's side these all mean "can't reach it".
    return { ok: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- helpers ----------

/** Minutes studied in the week starting on Sunday `weekStartISO`. */
export function studyMinutesInWeek(feed: StudyFeed, weekStartISO: string): number {
  const start = parseISO(weekStartISO);
  let total = 0;
  for (const [day, minutes] of Object.entries(feed.studyMinutesByDay)) {
    const offset = differenceInCalendarDays(parseISO(day), start);
    if (offset >= 0 && offset < 7) total += minutes;
  }
  return total;
}

/** Minutes studied today. */
export const studyMinutesToday = (feed: StudyFeed, now: Date = new Date()) =>
  feed.studyMinutesByDay[toISODate(now)] ?? 0;

/** Whole days until a feed date ("2026-11-20T09:00"): 0 = today. */
export const daysUntilFeedDate = (at: string, now: Date = new Date()) => differenceInCalendarDays(parseISO(at), now);

/** Exams and quizzes from today on, nearest first. */
export function upcomingExams(feed: StudyFeed, now: Date = new Date(), withinDays = 60): StudyExam[] {
  return feed.exams.filter((e) => {
    const d = daysUntilFeedDate(e.at, now);
    return d >= 0 && d <= withinDays;
  });
}

/** The nearest real exam (not a quiz) within `days`, to suggest exam mode. */
export function examSoon(feed: StudyFeed, now: Date = new Date(), days = 10): StudyExam | undefined {
  return upcomingExams(feed, now, days).find((e) => e.kind === 'exam');
}
