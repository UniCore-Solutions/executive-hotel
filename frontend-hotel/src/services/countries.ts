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

export function countryLabel(c: { code: string; name: string; callingCode?: string | null }): string {
  return `${flagEmoji(c.code)} ${c.name}${c.callingCode ? ` (+${c.callingCode})` : ''}`;
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

/** Calling code of one country (e.g. '212' for MA), or undefined. */
export function callingCodeOf(countries: CountryRef[], code: string): string | undefined {
  return countries.find((c) => c.code === code)?.callingCode ?? undefined;
}
