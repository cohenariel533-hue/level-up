import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackup, restoreBackup } from '../src/db/backup';
import { db } from '../src/db/schema';
import { getSetting, setSetting } from '../src/db/settings';
import { loadStudyFeed, syncStudyFeed } from '../src/db/studyFeed';
import {
  daysUntilFeedDate,
  examSoon,
  fetchStudyFeed,
  studyMinutesInWeek,
  studyMinutesToday,
  upcomingExams,
  type StudyFeed,
} from '../src/lib/studyFeed';

/** A feed shaped exactly like Study Planner's levelup_feed.build(). */
const feed: StudyFeed = {
  version: 1,
  generatedAt: '2026-11-03T10:00',
  exams: [
    { id: 'task-1', title: 'Quiz 2', course: 'Calculus', kind: 'quiz', at: '2026-11-05T10:00' },
    { id: 'task-2', title: 'Midterm', course: 'Statistics', kind: 'exam', at: '2026-11-10T09:00' },
    { id: 'course-3-א', title: 'מבחן מועד א', course: 'Psychology', kind: 'exam', at: '2027-01-20T09:00' },
  ],
  deadlines: [
    { id: 7, title: 'Sheet 3', course: 'Calculus', kind: 'homework', due: '2026-11-04T23:59', effortMin: 180, doneMin: 60, started: true },
  ],
  studyMinutesByDay: { '2026-10-31': 120, '2026-11-01': 90, '2026-11-03': 45 },
  plannedMinutesByDay: { '2026-11-03': 90 },
  today: [{ type: 'study', title: 'Sheet 3', course: 'Calculus', start: '16:00', end: '16:45' }],
  working: null,
};

const now = new Date(2026, 10, 3, 12, 0); // Tue 3 Nov 2026

describe('feed helpers', () => {
  it('adds up study minutes for the Sunday–Saturday week', () => {
    expect(studyMinutesInWeek(feed, '2026-11-01')).toBe(135); // Sat 31 Oct belongs to the week before
    expect(studyMinutesToday(feed, now)).toBe(45);
  });

  it('counts days until exams and lists upcoming ones', () => {
    expect(daysUntilFeedDate('2026-11-10T09:00', now)).toBe(7);
    expect(upcomingExams(feed, now, 30).map((e) => e.title)).toEqual(['Quiz 2', 'Midterm']);
  });

  it('suggests exam mode only for a real exam (not a quiz) within 10 days', () => {
    expect(examSoon(feed, now)?.title).toBe('Midterm');
    expect(examSoon(feed, new Date(2026, 10, 11))).toBeUndefined();
  });
});

describe('fetching', () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: unknown = {}) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it('needs an address and a key', async () => {
    expect(await fetchStudyFeed('', 'k')).toEqual({ ok: false, reason: 'not-set-up' });
  });

  it('sends the key and accepts a valid feed', async () => {
    respond(200, feed);
    const result = await fetchStudyFeed('https://mac.example/api/levelup/feed', 'secret');
    expect(result.ok).toBe(true);
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].headers.Authorization).toBe('Bearer secret');
  });

  it('explains a wrong key, bad data and an unreachable Mac', async () => {
    respond(401);
    expect(await fetchStudyFeed('https://x/f', 'k')).toMatchObject({ reason: 'wrong-key' });
    respond(200, { hello: 'world' });
    expect(await fetchStudyFeed('https://x/f', 'k')).toMatchObject({ reason: 'bad-data' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Load failed'))));
    expect(await fetchStudyFeed('https://x/f', 'k')).toMatchObject({ reason: 'unreachable' });
  });
});

describe('syncing and backups', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores a good feed for offline use, and keeps the old copy when the Mac is away', async () => {
    await setSetting('studyPlannerUrl', 'https://mac.example/api/levelup/feed');
    await setSetting('studyPlannerKey', 'secret');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(feed), { status: 200 })));
    await syncStudyFeed();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    expect((await syncStudyFeed()).ok).toBe(false);
    expect((await loadStudyFeed())?.feed.exams).toHaveLength(3);
  });

  it('never puts the key or the cached feed in a backup, and restoring keeps this device’s key', async () => {
    await setSetting('studyPlannerKey', 'secret');
    await setSetting('studyPlannerUrl', 'https://mac.example/api/levelup/feed');
    await db.studyFeed.put({ key: 'latest', fetchedAt: '2026-11-03T10:00:00Z', feed });

    const backup = await createBackup();
    expect(JSON.stringify(backup)).not.toContain('secret');
    expect(backup.tables.studyFeed).toBeUndefined();
    expect(backup.tables.settings.map((r) => r.key)).toContain('studyPlannerUrl');

    await setSetting('studyPlannerKey', 'device-key');
    await restoreBackup({ ...backup, tables: { ...backup.tables, settings: [...backup.tables.settings, { key: 'studyPlannerKey', value: 'from-file' }] } });
    expect(await getSetting('studyPlannerKey')).toBe('device-key');
    expect(await db.studyFeed.count()).toBe(1);
  });
});
