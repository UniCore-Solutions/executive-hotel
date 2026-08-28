/** Canonical hotel — the platform's single property (exactly one active
    hotel must exist; the backend rejects zero or multiple). The hotel IS the
    platform brand: "Executive Hotel". Errors propagate: there is no fallback
    data. */
import {
  CanonicalHotelDocument,
  type CanonicalHotelQuery,
} from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';

export type CanonicalHotel = NonNullable<CanonicalHotelQuery['canonicalHotel']>;

let cache: CanonicalHotel | null = null;

/** Fetch the platform's one hotel. Cached per session (it cannot change at
    runtime — the platform is single-property). */
export async function getCanonicalHotel(force = false): Promise<CanonicalHotel> {
  if (!force && cache) return cache;
  const { canonicalHotel } = await gqlRequest(CanonicalHotelDocument, {});
  cache = canonicalHotel;
  return canonicalHotel;
}
