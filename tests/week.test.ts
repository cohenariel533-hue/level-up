import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE } from '../src/db/defaultTemplate';
import { db } from '../src/db/schema';
import { initDatabase } from '../src/db/seed';
import { setFocus, toggleBlockDone } from '../src/db/week';
import { blocksForDay, weekEvents } from '../src/features/week/schedule';
import { buildWeekIcs, escapeText, foldLine } from '../src/lib/ics';
import { weeklyTargets, weekProgress } from '../src/lib/targets';
import { addToTime, formatDuration, minutesBetween } from '../src/lib/time';

describe('time helpers', () => {
  it('adds minutes to a clock time', () => {
    expect(addToTime('17:00', 75)).toBe('18:15');
    expect(addToTime('23:30', 60)).toBe('00:30');
  });
  it('measures a class length', () => {
    expect(minutesBetween('10:00', '11:30')).toBe(90);
  });
  it('formats durations', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(30)).toBe('30m');
  });
});

describe('default template', () => {
  it('plans 7 hours of side hustle and 4 gym sessions a week', () => {
    const hustle = DEFAULT_TEMPLATE.filter((b) => b.pillar === 'hustle').reduce((n, b) => n + b.minutes, 0);
    expect(hustle).toBe(7 * 60);
    expect(DEFAULT_TEMPLATE.filter((b) => b.pillar === 'gym')).toHaveLength(4);
  });
});

describe('targets', () => {
  it('lowers hustle and pauses YouTube in exam mode, keeping gym', () => {
    expect(weeklyTargets(false)).toMatchObject({ gym: 4, hustleHours: 7, youtube: 2 });
    expect(weeklyTargets(true)).toMatchObject({ gym: 4, hustleHours: 2, youtube: 0 });
  });

  it('adds up ticked blocks across the week', () => {
    const progress = weekProgress([
      { done: [{ key: 'tpl-1', pillar: 'gym', minutes: 75 }, { key: 'tpl-2', pillar: 'hustle', minutes: 90 }] },
      { done: [{ key: 'tpl-3', pillar: 'youtube', minutes: 60 }, { key: 'tpl-4', pillar: 'hustle', minutes: 240 }] },
      { done: [{ key: 'class-1', pillar: 'school', minutes: 90 }] },
    ]);
    expect(progress).toEqual({ gym: 1, hustleMinutes: 330, youtube: 1 });
  });
});

describe('schedule', () => {
  const template = [
    { id: 1, day: 0, title: 'Gym', pillar: 'gym' as const, start: '17:00', minutes: 75 },
    { id: 2, day: 0, title: 'Study', pillar: 'school' as const, start: '09:00', minutes: 420 },
    { id: 3, day: 6, title: 'Rest', pillar: 'rest' as const, start: null, minutes: 0 },
  ];
  const classes = [{ id: 7, name: 'Statistics', day: 0, start: '12:00', end: '13:30' }];

  it('merges classes as locked blocks and sorts by time', () => {
    const day = blocksForDay(0, template, classes);
    expect(day.map((b) => b.key)).toEqual(['tpl-2', 'class-7', 'tpl-1']);
    expect(day[1]).toMatchObject({ locked: true, pillar: 'school', minutes: 90 });
  });

  it('exports only timed blocks plus classes', () => {
    expect(weekEvents(template, classes).map((e) => e.uid)).toEqual(['class-7', 'tpl-1', 'tpl-2']);
  });
});

describe('.ics export', () => {
  const weekStart = new Date(2026, 10, 1); // Sunday 1 Nov 2026

  it('makes weekly repeating events on the right day and time', () => {
    const ics = buildWeekIcs(
      [{ uid: 'tpl-5', title: 'Gym', day: 2, start: '17:00', minutes: 75 }],
      weekStart,
      new Date(2026, 10, 1, 12, 0),
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261103T170000'); // Tuesday
    expect(ics).toContain('DTEND:20261103T181500');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU');
    expect(ics).toContain('UID:tpl-5@level-up');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('escapes special characters', () => {
    expect(escapeText('Script; draft, v2\nnotes')).toBe('Script\\; draft\\, v2\\nnotes');
  });

  it('folds long lines at 75 bytes, including Hebrew', () => {
    const folded = foldLine('SUMMARY:' + 'שיעור '.repeat(20));
    const encoder = new TextEncoder();
    for (const line of folded.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every((l) => l.startsWith(' '))).toBe(true);
  });
});

describe('day logs', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('seeds the default template once, and not again after clearing it', async () => {
    await initDatabase();
    expect(await db.templateBlocks.count()).toBe(DEFAULT_TEMPLATE.length);
    await db.templateBlocks.clear();
    await initDatabase();
    expect(await db.templateBlocks.count()).toBe(0);
  });

  it('ticks and un-ticks a block, keeping the focus line', async () => {
    const block = { key: 'tpl-1', pillar: 'gym' as const, minutes: 75 };
    await setFocus('2026-11-01', 'Finish the script');
    await toggleBlockDone('2026-11-01', block);
    expect((await db.days.get('2026-11-01'))?.done).toEqual([block]);
    await toggleBlockDone('2026-11-01', block);
    expect(await db.days.get('2026-11-01')).toEqual({ date: '2026-11-01', focus: 'Finish the script', done: [] });
  });
});
