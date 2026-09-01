import { describe, expect, it } from 'vitest';
import { countryDialCode, countryDialLabel, countryLabel, flagEmoji } from './countries';

const MA = { code: 'MA', name: 'Morocco', callingCode: '212' };
const GB = { code: 'GB', name: 'United Kingdom', callingCode: '44' };
/** Reference rows may carry no calling code — every label must still render. */
const AQ = { code: 'AQ', name: 'Antarctica', callingCode: null };

describe('flagEmoji', () => {
  it('maps an ISO code to regional indicator symbols', () => {
    expect(flagEmoji('MA')).toBe('🇲🇦');
    expect(flagEmoji('gb')).toBe('🇬🇧');
  });
});

describe('countryLabel', () => {
  /* Regression: country of residence must read as a country, never as a
     dial code. countryLabel once appended "(+212)" unconditionally and was
     the sole renderer of every combobox option, so the residence field
     listed "Morocco (+212)" for all 245 entries. */
  it('is the country name, with no calling code', () => {
    expect(countryLabel(MA)).toBe('🇲🇦 Morocco');
    expect(countryLabel(GB)).toBe('🇬🇧 United Kingdom');
  });

  it('never leaks a calling code even when one is present', () => {
    expect(countryLabel(MA)).not.toContain('212');
    expect(countryLabel(MA)).not.toContain('+');
  });
});

describe('countryDialLabel', () => {
  it('adds the calling code for the phone picker', () => {
    expect(countryDialLabel(MA)).toBe('🇲🇦 Morocco (+212)');
    expect(countryDialLabel(GB)).toBe('🇬🇧 United Kingdom (+44)');
  });

  it('falls back to the plain name when there is no calling code', () => {
    expect(countryDialLabel(AQ)).toBe('🇦🇶 Antarctica');
  });
});

describe('countryDialCode', () => {
  it('is flag + dial code only, to stay narrow beside the number input', () => {
    expect(countryDialCode(MA)).toBe('🇲🇦 +212');
    expect(countryDialCode(GB)).toBe('🇬🇧 +44');
  });

  it('falls back to the flag alone when there is no calling code', () => {
    expect(countryDialCode(AQ)).toBe('🇦🇶');
  });
});
