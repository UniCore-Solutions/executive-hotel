'use client';

/** Searchable country selector — replaces the 11-name hardcoded list, four
    of whose entries (Germany, Netherlands, Belgium, Canada) were not present
    in the countries reference table and would have violated the
    guests.country_code FK the moment this field was actually wired up (see
    Task 12 in docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md).
    The option list comes from the same source (libphonenumber-js's
    ISO 3166-1 set) that generated V24__widen_country_reference_list.sql, so
    the two can never drift apart — every code this component can produce is
    valid against the database. A native <select> is used deliberately: it
    is searchable by typing, keyboard-operable and touch-friendly on mobile
    with zero extra UI to build or maintain. */
import { getCountries } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';

let cachedOptions: Array<{ code: Country; name: string }> | null = null;

function countryOptions(): Array<{ code: Country; name: string }> {
  if (cachedOptions) return cachedOptions;
  const displayNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames(['en'], { type: 'region' })
      : null;
  cachedOptions = getCountries()
    .map((code) => ({ code, name: displayNames?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cachedOptions;
}

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
  const options = countryOptions();
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as Country)}
      className={
        className ??
        'bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none'
      }
    >
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
