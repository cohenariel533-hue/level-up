/**
 * Syncing Study Planner's feed into Level Up. The latest good copy is kept
 * in the studyFeed table, so Today still shows your exams when the Mac is
 * asleep or out of reach.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { fetchStudyFeed, studyFeedSchema, type FetchResult, type StudyFeed } from '../lib/studyFeed';
import { db } from './schema';
import { getSetting } from './settings';

const LATEST = 'latest';

/** Fetches the feed with the saved address and key, and stores it if it worked. */
export async function syncStudyFeed(): Promise<FetchResult> {
  const [url, key] = await Promise.all([getSetting('studyPlannerUrl'), getSetting('studyPlannerKey')]);
  const result = await fetchStudyFeed(url, key);
  if (result.ok) await db.studyFeed.put({ key: LATEST, fetchedAt: new Date().toISOString(), feed: result.feed });
  return result;
}

export function forgetStudyFeed() {
  return db.studyFeed.delete(LATEST);
}

export interface CachedFeed {
  feed: StudyFeed;
  fetchedAt: string;
}

/** The stored copy, or null if there's none (or it's from an older, incompatible version). */
export async function loadStudyFeed(): Promise<CachedFeed | null> {
  const row = await db.studyFeed.get(LATEST);
  if (!row) return null;
  const parsed = studyFeedSchema.safeParse(row.feed);
  return parsed.success ? { feed: parsed.data, fetchedAt: row.fetchedAt } : null;
}

/** React hook: the stored feed (null = not connected yet), undefined while loading. */
export function useStudyFeed(): CachedFeed | null | undefined {
  return useLiveQuery(loadStudyFeed);
}
