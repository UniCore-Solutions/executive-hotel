'use client';

/** Phone input with a country/calling-code picker and E.164 normalization —
    replaces the plain free-text field that required guests to type their
    own "+countrycode" prefix by hand (see Task 11 in
    docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md). `value` is
    always E.164 (e.g. "+212600000000") or "" — the shape guests.phone /
    users.phone (VARCHAR(30)) already accepts with no migration needed. */
import PhoneInputBase from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { Country } from 'react-phone-number-input';

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
  defaultCountry?: Country;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
}) {
  return (
    <PhoneInputBase
      id={id}
      international
      defaultCountry={defaultCountry}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      className="hotel-phone-input"
      numberInputProps={{
        'aria-invalid': ariaInvalid,
        'aria-describedby': ariaDescribedby,
      }}
    />
  );
}
