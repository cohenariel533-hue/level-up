import { useEffect } from 'react';
import { syncStudyFeed } from '../db/studyFeed';

const EVERY_MS = 10 * 60_000;

/**
 * Keeps the Study Planner feed fresh while Level Up is open: on launch, every
 * 10 minutes, and whenever you come back to the app. Quietly does nothing
 * when it isn't set up or the Mac can't be reached (the stored copy is used).
 */
export function useStudySync() {
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return;
      last = Date.now();
      void syncStudyFeed();
    };
    refresh();
    const timer = setInterval(refresh, EVERY_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
}
