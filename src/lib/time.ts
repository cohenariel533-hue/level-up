/** Helpers for "HH:mm" clock times and durations in minutes. */

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (total: number) => {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

/** "17:00" + 75 → "18:15" */
export const addToTime = (hhmm: string, minutes: number) => fromMinutes(toMinutes(hhmm) + minutes);

/** Minutes from start to end; an end before the start is treated as past midnight. */
export const minutesBetween = (start: string, end: string) => {
  const diff = toMinutes(end) - toMinutes(start);
  return diff >= 0 ? diff : diff + 1440;
};

/** 90 → "1h 30m", 60 → "1h", 30 → "30m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** 6.5 → "6.5h", 7 → "7h" (for rings) */
export const formatHours = (hours: number) => `${Math.round(hours * 10) / 10}h`;
