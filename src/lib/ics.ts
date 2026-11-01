import { addDays, format } from 'date-fns';
import { toMinutes } from './time';

/**
 * Builds an .ics calendar file (RFC 5545) that Apple Calendar can import.
 * Each block becomes a weekly repeating event starting in the given week.
 *
 * Times are "floating" (no time zone), so they show at the same clock time
 * wherever the phone is: 17:00 stays 17:00 in Israel, summer or winter.
 */

export interface WeeklyEvent {
  /** Stable id, so importing again updates events instead of duplicating them. */
  uid: string;
  title: string;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** "HH:mm" */
  start: string;
  minutes: number;
  description?: string;
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Escapes text per RFC 5545: backslash, semicolon, comma and newlines. */
export const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Splits lines longer than 75 bytes (UTF-8), continuing with a leading space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const stamp = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

export function buildWeekIcs(events: WeeklyEvent[], weekStartDate: Date, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Level Up//Weekly plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Level Up week',
  ];

  for (const e of events) {
    const startMinutes = toMinutes(e.start);
    const startDate = addDays(weekStartDate, e.day);
    startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const endDate = new Date(startDate.getTime() + e.minutes * 60_000);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@level-up`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(startDate)}`,
      `DTEND:${stamp(endDate)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[e.day]}`,
      `SUMMARY:${escapeText(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
