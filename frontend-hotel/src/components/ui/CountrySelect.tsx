'use client';

/** Country-of-residence selector — the `country` variant of CountryCombobox,
    narrowed to react-phone-number-input's ISO `Country` union so call sites
    stay type-safe about the code they store. Options come from the backend
    `countries` query (V24/V28), the same ISO 3166-1 reference the
    guests.country_code FK validates against, so every code this can produce
    is valid against the database. Shows country NAMES, never dial codes —
    the dial code belongs to PhoneField. */
import type { Country } from 'react-phone-number-input';
import { CountryCombobox } from './CountryCombobox';

export function CountrySelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: Country | '';
  onChange: (code: Country) => void;
  className?: string;
}) {
  return (
    <CountryCombobox
      id={id}
      variant="country"
      value={value}
      onChange={(code) => onChange(code as Country)}
      className={className}
    />
  );
}
