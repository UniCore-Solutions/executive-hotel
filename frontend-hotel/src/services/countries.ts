/** Countries reference service — the guest country/phone selectors' source.
    Data comes from the backend `countries` table (code + name + calling
    code, V24/V28); nothing is hardcoded client-side. Flags are rendered as
    regional-indicator emoji derived from the ISO code — no asset pipeline. */

import { CountriesDocument, type CountriesQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';

export interface CountryRef {
  code: string;
  name: string;
  callingCode?: string | null;
}

type BackendCountry = CountriesQuery['countries'][number];

/** ISO 3166-1 alpha-2 code → flag emoji (regional indicator symbols). */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Country identity, e.g. "🇲🇦 Morocco". Use wherever the country itself is
    the subject — country of residence, nationality, address. */
export function countryLabel(c: CountryRef): string {
  return `${flagEmoji(c.code)} ${c.name}`;
}

/** Country plus its dial code, e.g. "🇲🇦 Morocco (+212)". Only for the phone
    picker, where the dial code is the reason the guest is choosing. */
export function countryDialLabel(c: CountryRef): string {
  return c.callingCode ? `${countryLabel(c)} (+${c.callingCode})` : countryLabel(c);
}

/** Dial code alone alongside the flag, e.g. "🇲🇦 +212" — the phone field's
    trigger, where a full country name would crowd the number input. */
export function countryDialCode(c: CountryRef): string {
  return c.callingCode ? `${flagEmoji(c.code)} +${c.callingCode}` : flagEmoji(c.code);
}

let cache: CountryRef[] | null = null;

/** All reference countries, ordered by name (backend ordering). Cached per
    session — the list is static reference data. */
export async function getCountries(): Promise<CountryRef[]> {
  if (cache) return cache;
  const { countries } = await gqlRequest(CountriesDocument, {});
  cache = countries.map((c: BackendCountry) => ({
    code: c.code,
    name: c.name,
    callingCode: c.callingCode,
  }));
  return cache;
}
