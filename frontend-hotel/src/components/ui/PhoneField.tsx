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

  return (
    <div className="flex items-stretch gap-2">
      <CountryCombobox
        value={country}
        onChange={(code) => {
          setCountry(code);
          // Re-format the already-typed digits under the new country.
          const digits = display.replace(/\D/g, '');
          setDisplay(formatNational(digits, code));
          emit(digits ? formatNational(digits, code) : '');
        }}
        showCallingCode
        className="w-[10.5rem] shrink-0"
      />
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
        className="bg-paper border-navy/15 focus:ring-gold/40 w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
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
