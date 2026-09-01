import { describe, expect, it } from 'vitest';
import { formatMoney, formatDate, humanizeEnum, formatRelativeToToday } from './format';

describe('formatMoney', () => {
  it('formats MAD amounts with two decimal places', () => {
    expect(formatMoney(1234.5)).toContain('1,234.50');
    expect(formatMoney(1234.5)).toContain('MAD');
  });

  it('formats zero', () => {
    expect(formatMoney(0)).toContain('0.00');
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
