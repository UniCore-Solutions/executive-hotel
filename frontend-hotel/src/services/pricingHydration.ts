/** Hydrates pricing's sync promo lookups from the backend offer catalog.
    Idempotent: the first call wins; errors propagate to callers. Extras are not
    hydrated here — extras are priced by the backend quote engine.

    Single-hotel platform: the canonical hotel id is cached, so hydration is
    exactly ONE offers request per session (previously it fetched the full
    hotel list then offers per hotel). The promo hints are a convenience for
    the UI; the quote engine itself remains the source of truth (it soft-fails
    invalid codes server-side). */
import { getCanonicalHotelId, getOffers } from './catalog';
import { setOffersSource } from './pricing';

let promise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  const id = await getCanonicalHotelId();
  const offers = await getOffers(id);
  if (offers.length) setOffersSource(offers);
}

export function ensurePricingSources(): Promise<void> {
  if (!promise) promise = hydrate();
  return promise;
}
