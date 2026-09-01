'use client';

/** Phone input with a backend-driven country/calling-code picker and E.164
    normalization. The country selector (flag emoji + calling code) is the
    same searchable combobox as the country field — options come from the
    backend `countries` query, never a hardcoded list. `value` is always
    E.164 (e.g. "+212600123456") or "" — the shape guests.phone /
    users.phone (VARCHAR(30)) already accepts, with no migration needed.
    libphonenumber-js does the number formatting/parsing only. */
import { useEffect, useRef, useState } from 'react';
import { AsYouType, parsePhoneNumber } from 'libphonenumber-js';
import { CountryCombobox } from './CountryCombobox';

export function PhoneField({
  id,
  value,
  onChange,
  defaultCountry = 'MA',
  ariaInvalid,
  ariaDescribedby,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
}) {
  const [country, setCountry] = useState(defaultCountry);
  const [display, setDisplay] = useState(() => nationalOf(value));
  const lastEmitted = useRef(value);

  /* External value changes (session prefill, etc.) reformat the input; our
     own emits are echoed back through the same prop and must not reset the
     caret. */
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setDisplay(nationalOf(value));
  }, [value]);

  const emit = (text: string) => {
    const e164 = toE164(text, country);
    lastEmitted.current = e164;
    onChange(e164);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setDisplay(formatNational(digits, country));
    emit(digits ? formatNational(digits, country) : '');
  };

  const changeCountry = (code: string) => {
    setCountry(code);
    // Re-format the already-typed digits under the new country.
    const digits = display.replace(/\D/g, '');
    setDisplay(formatNational(digits, code));
    emit(digits ? formatNational(digits, code) : '');
  };

  /* One control, two segments: a single border and a single focus ring are
     drawn on the group, and the segments inside are borderless so the code
     picker and the number read as one field rather than two. The dropdown
     panel is a child of the group, so the group must not clip overflow. */
  return (
    <div
      className={`bg-paper flex items-stretch rounded-xl border transition-colors focus-within:ring-2 ${
        ariaInvalid
          ? 'border-clay bg-clay/[0.04] focus-within:ring-clay/30'
          : 'border-navy/15 focus-within:border-navy/25 focus-within:ring-gold/40'
      }`}
    >
      <CountryCombobox
        value={country}
        onChange={changeCountry}
        codeOnly
        className="shrink-0"
        triggerClassName="text-navy flex h-full w-[6.75rem] items-center justify-between gap-1 rounded-l-xl px-3 py-2.5 text-left text-sm font-semibold focus-visible:outline-none sm:w-[7.5rem]"
        panelClassName="min-w-[17rem]"
        ariaLabel="Phone country code"
      />
      <span className={`w-px shrink-0 ${ariaInvalid ? 'bg-clay/25' : 'bg-navy/12'}`} aria-hidden="true" />
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={display}
        onChange={handleChange}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        placeholder="Phone number"
        className="placeholder:text-navy/35 w-full min-w-0 rounded-r-xl bg-transparent px-3 py-2.5 text-sm font-medium focus:outline-none"
      />
    </div>
  );
}

/** E.164 value → national digits for the input ("" when absent). */
function nationalOf(e164: string): string {
  if (!e164) return '';
  try {
    const p = parsePhoneNumber(e164);
    return p ? p.nationalNumber : '';
  } catch {
    return '';
  }
}

/** libphonenumber-js accepts ISO codes from its own country list; the
    backend-served combobox may hold any code, so it is narrowed here. */
type CountryHint = Parameters<typeof parsePhoneNumber>[1];

/** Progressive national formatting via libphonenumber-js. */
function formatNational(digits: string, country: string): string {
  if (!digits) return '';
  try {
    const at = new AsYouType(country as CountryHint);
    for (const ch of digits) at.input(ch);
    const template = at.getTemplate();
    if (template && template.includes('x')) {
      let i = 0;
      return template.replace(/x/g, () => digits[i++] ?? '');
    }
    const num = at.getNumber();
    if (num) return num.formatNational();
  } catch {
    /* fall through to raw digits */
  }
  return digits;
}

/** Digits → E.164 when the number is valid for the country, else "". */
function toE164(text: string, country: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  try {
    const p = parsePhoneNumber(text, country as CountryHint);
    if (p && p.isValid()) return p.number;
  } catch {
    /* incomplete — keep "" */
  }
  return '';
}
