import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  statusLabel,
  titleCase,
  todayIso,
} from '@/lib/format';

describe('formatMoney', () => {
  it('formats with currency symbol, rounded to a whole amount — no cents', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,235');
  });

  it('formats zero', () => {
    expect(formatMoney(0, 'EUR')).toBe('€0');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-49.99, 'GBP')).toBe('-£50');
  });

  it('never shows a decimal point — matches frontend-hotel and admin-hotel', () => {
    // A real reported inconsistency: the same total showed as "5787.99" on
    // an invoice download and "5788" elsewhere in the app. Every money
    // display across all three apps must round to a whole amount.
    expect(formatMoney(5787.99, 'MAD')).not.toContain('.');
  });
});

describe('formatDate', () => {
  it('formats a date-only ISO string in en-GB style', () => {
    expect(formatDate('2026-08-18')).toBe('18 Aug 2026');
  });
});

describe('formatDateTime', () => {
  it('formats a full ISO timestamp', () => {
    expect(formatDateTime('2026-08-18T14:05:00')).toBe('18 Aug 2026, 14:05');
  });
});

describe('titleCase', () => {
  it('splits on underscores and spaces', () => {
    expect(titleCase('sea_view_room')).toBe('Sea View Room');
  });

  it('handles mixed separators', () => {
    expect(titleCase('deluxe suite')).toBe('Deluxe Suite');
  });

  it('leaves already-capitalised words intact', () => {
    expect(titleCase('PREMIUM')).toBe('PREMIUM');
  });
});

describe('statusLabel', () => {
  it('splits snake_case enum values', () => {
    expect(statusLabel('confirmed')).toBe('Confirmed');
    expect(statusLabel('pending_payment')).toBe('Pending Payment');
    expect(statusLabel('checked_in')).toBe('Checked In');
  });
});

describe('todayIso', () => {
  it('returns the current UTC date in YYYY-MM-DD format', () => {
    const iso = todayIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(iso).toBe(new Date().toISOString().slice(0, 10));
  });
});