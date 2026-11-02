import { useEffect } from 'react';
import { noteActivity } from '../db/activity';

/**
 * Notes when you open Level Up and when you leave it, plus every 5 minutes
 * while it's open, so "My rhythm" can see roughly when your day starts and ends.
 */
export function useActivityTracking() {
  useEffect(() => {
    const note = () => void noteActivity();
    note();
    const timer = setInterval(() => document.visibilityState === 'visible' && note(), 5 * 60_000);
    document.addEventListener('visibilitychange', note);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', note);
    };
  }, []);
}
