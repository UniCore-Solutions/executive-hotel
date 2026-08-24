import { describe, expect, it } from 'vitest';
import {
  convert,
  CURRENCIES,
  currencyInfo,
  fmtMad,
  fmtPrice,
  isValidCurrency,
  symbol,
} from '@/lib/format';

describe('fx', () => {
  it('rates match the reference', () => {
    expect(convert(1000, 'MAD')).toBe(1000);
    expect(convert(1000, 'EUR')).toBe(91);
    expect(convert(1000, 'USD')).toBe(100);
    expect(convert(1000, 'GBP')).toBe(78);
    expect(convert(0, 'EUR')).toBe(0);
  });

  it('isValid/list/symbol round out the surface', () => {
    expect(CURRENCIES).toEqual(['MAD', 'EUR', 'USD', 'GBP']);
    expect(isValidCurrency('EUR')).toBe(true);
    expect(isValidCurrency('JPY')).toBe(false);
    expect(symbol('EUR')).toBe('€');
    expect(symbol('MAD')).toBe('MAD');
    expect(currencyInfo('USD').label).toBe('US Dollar');
    expect(currencyInfo('JPY').code).toBe('MAD');
  });

  it('fmtMad converts from MAD then renders via en-US Intl with no decimals', () => {
    expect(fmtMad(1050, 'MAD')).toBe('MAD\u00a01,050');
    expect(fmtMad(1000, 'EUR')).toBe('€91');
    expect(fmtMad(1240, 'USD')).toBe('$124');
  });

  it('fmtPrice adds /night suffix on demand', () => {
    expect(fmtPrice(910, 'MAD', { perNight: true })).toBe('MAD\u00a0910/night');
  });
});
