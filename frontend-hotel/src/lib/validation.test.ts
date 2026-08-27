import { describe, expect, it } from 'vitest';
import {
  CVC_RE,
  EMAIL_RE,
  fmtCardNumber,
  fmtExpiry,
  MSGS,
  NAME_RE,
  validCard,
  validCvc,
  validExpiry,
  validPhone,
} from '@/lib/validation';

describe('validators', () => {
  it('names allow accented latin + apostrophes/hyphens', () => {
    expect(NAME_RE.test('Adam')).toBe(true);
    expect(NAME_RE.test("O'Brien")).toBe(true);
    expect(NAME_RE.test('François')).toBe(true);
    expect(NAME_RE.test('Adam123')).toBe(false);
  });

  it('email regex (reference)', () => {
    expect(EMAIL_RE.test('demo@hotelcollection.com')).toBe(true);
    expect(EMAIL_RE.test('a@b')).toBe(false);
  });

  it('validPhone checks a real, country-aware E.164 number (Task 11)', () => {
    // Moroccan and French numbers, as produced by PhoneField
    expect(validPhone('+212661234567')).toBe(true);
    expect(validPhone('+33612345678')).toBe(true);
    expect(validPhone('123')).toBe(false);
    expect(validPhone('')).toBe(false);
    expect(validPhone('+212123')).toBe(false); // too short to be a real number
  });

  it('card number 13–19 digits', () => {
    expect(validCard('4111 1111 1111 1111')).toBe(true);
    expect(validCard('41111111111')).toBe(false);
  });

  it('expiry must be a valid future month', () => {
    const now = new Date();
    const yy = String((now.getFullYear() + 1) % 100).padStart(2, '0');
    expect(validExpiry(`12/${yy}`)).toBe(true);
    expect(validExpiry('13/30')).toBe(false);
    expect(validExpiry('01/20')).toBe(false);
    expect(validExpiry('05')).toBe(false);
  });

  it('CVC 3–4 digits', () => {
    expect(validCvc('123')).toBe(true);
    expect(validCvc('12')).toBe(false);
    expect(CVC_RE.test('1234')).toBe(true);
  });

  it('message strings match the reference exactly', () => {
    expect(MSGS.cardNumber).toBe('Enter a valid card number.');
    expect(MSGS.cardExpiry).toBe('Enter a valid future expiry.');
    expect(MSGS.terms).toBe('Please accept the Terms and Cancellation policy.');
  });
});

describe('input formatters', () => {
  it('groups card digits in 4s, max 16', () => {
    expect(fmtCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(fmtCardNumber('4111-1111')).toBe('4111 1111');
    expect(fmtCardNumber('41111111111111110000')).toBe('4111 1111 1111 1111');
  });

  it('auto-slugs expiry MM/YY', () => {
    expect(fmtExpiry('1228')).toBe('12/28');
    expect(fmtExpiry('12')).toBe('12');
    expect(fmtExpiry('12/28/99')).toBe('12/28');
  });
});
