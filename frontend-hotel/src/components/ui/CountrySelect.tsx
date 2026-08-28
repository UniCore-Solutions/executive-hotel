'use client';

/** Searchable country selector — options come from the backend `countries`
    query (code + name + calling code, V24/V28), never a hardcoded client
    list. Flags are emoji derived from the ISO code. The option set is the
    same ISO 3166-1 reference the guests.country_code FK validates against,
    so every code this component can produce is valid against the database. */
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
      value={value}
      onChange={(code) => onChange(code as Country)}
      className={className}
    />
  );
}
