import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDaysIso, availabilityWindowDays, formatDayHeader, isToday, todayIso, toIso } from './dates';

describe('toIso', () => {
  it('formats a Date as zero-padded YYYY-MM-DD', () => {
    expect(toIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIso(new Date(2026, 8, 3))).toBe('2026-09-03');
  });
});

describe('addDaysIso', () => {
  it('adds days within the same month', () => {
    expect(addDaysIso('2026-09-03', 2)).toBe('2026-09-05');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysIso('2026-09-29', 3)).toBe('2026-10-02');
  });

  it('rolls over a year boundary', () => {
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('supports negative days', () => {
    expect(addDaysIso('2026-09-03', -3)).toBe('2026-08-31');
  });

  it('is a no-op for zero days', () => {
    expect(addDaysIso('2026-09-03', 0)).toBe('2026-09-03');
  });
});

describe('availabilityWindowDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 31 consecutive days starting today (backend range is inclusive on both ends)', () => {
    const days = availabilityWindowDays();
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2026-09-03');
    expect(days[30]).toBe('2026-10-03');
  });

  it('has no gaps or duplicates', () => {
    const days = availabilityWindowDays();
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBe(addDaysIso(days[i - 1]!, 1));
    }
  });
});

describe('formatDayHeader', () => {
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  it('splits an ISO date into weekday/day/month parts consistent with the native calendar', () => {
    const iso = '2026-09-03';
    const native = new Date(2026, 8, 3);
    const header = formatDayHeader(iso);
    expect(header.day).toBe('3');
    expect(header.month).toBe('Sept'); // en-GB short month for September
    expect(header.weekday).toBe(WEEKDAYS[native.getDay()]);
  });

  it('zero-pads nothing in the returned day (matches native getDate, not the ISO string)', () => {
    expect(formatDayHeader('2026-09-09').day).toBe('9');
  });
});

describe('isToday / todayIso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayIso reflects the current system date', () => {
    expect(todayIso()).toBe('2026-09-03');
  });

  it('isToday is true only for the current date', () => {
    expect(isToday('2026-09-03')).toBe(true);
    expect(isToday('2026-09-02')).toBe(false);
    expect(isToday('2026-09-04')).toBe(false);
  });
});
