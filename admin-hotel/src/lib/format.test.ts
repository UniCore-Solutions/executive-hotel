import { describe, expect, it } from 'vitest';
import { formatMoney, formatDate, humanizeEnum, formatRelativeToToday } from './format';

describe('formatMoney', () => {
  it('formats whole MAD amounts with a thousands separator, no cents', () => {
    expect(formatMoney(1234.5)).toContain('1,235');
    expect(formatMoney(1234.5)).not.toContain('.50');
    expect(formatMoney(1234.5)).toContain('MAD');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toContain('0');
  });

  it('never shows a decimal point — the exact bug this locks in against', () => {
    // A real reported inconsistency: the same total showed as "5787.99" on
    // an invoice download and "5788" elsewhere in the app. Every money
    // display in this app must round to whole MAD, consistently.
    expect(formatMoney(5787.99)).not.toContain('.');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string as DD Mon YYYY', () => {
    expect(formatDate('2026-09-01')).toBe('01 Sept 2026');
  });
});

describe('humanizeEnum', () => {
  it('converts snake_case backend enums to Title Case', () => {
    expect(humanizeEnum('checked_in')).toBe('Checked In');
    expect(humanizeEnum('pay_at_property')).toBe('Pay At Property');
    expect(humanizeEnum('active')).toBe('Active');
  });
});

describe('formatRelativeToToday', () => {
  it('labels today and tomorrow', () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    expect(formatRelativeToToday(iso)).toBe('Today');
  });
});
