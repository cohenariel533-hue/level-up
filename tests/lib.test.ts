import { describe, expect, it } from 'vitest';
import { greetingFor, toISODate, weekEnd, weekStart } from '../src/lib/dates';
import { formatILS } from '../src/lib/format';

describe('dates', () => {
  it('weeks start on Sunday and end on Saturday', () => {
    const wednesday = new Date(2026, 10, 4); // Wed 4 Nov 2026
    expect(toISODate(weekStart(wednesday))).toBe('2026-11-01'); // Sunday
    expect(toISODate(weekEnd(wednesday))).toBe('2026-11-07'); // Saturday
  });

  it('a Sunday is the start of its own week', () => {
    const sunday = new Date(2026, 10, 1);
    expect(toISODate(weekStart(sunday))).toBe('2026-11-01');
  });

  it('greets by time of day', () => {
    expect(greetingFor(7)).toBe('morning');
    expect(greetingFor(14)).toBe('afternoon');
    expect(greetingFor(20)).toBe('evening');
    expect(greetingFor(1)).toBe('night');
  });
});

describe('formatILS', () => {
  it('shows whole shekels without decimals', () => {
    expect(formatILS(1500)).toBe('₪1,500');
  });
  it('shows agorot when there are any', () => {
    expect(formatILS(12.5)).toBe('₪12.50');
  });
});
