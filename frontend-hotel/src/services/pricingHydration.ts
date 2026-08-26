/** Hydrates pricing's sync promo lookups from the backend offer catalog.
    Idempotent: the first call wins; errors propagate to callers. Extras are not
    hydrated here — extras are priced by the backend quote engine. */
import { HotelsDocument } from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';
import { getOffers } from './catalog';
import { setOffersSource } from './pricing';

let promise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  const { hotels } = await gqlRequest(HotelsDocument, { input: { page: { page: 0, size: 100 } } });
  const ids = hotels.items.filter((h) => h.status === 'active').map((h) => h.id);
  const offers = await Promise.all(ids.map((id) => getOffers(id))).then((lists) => lists.flat());
  if (offers.length) setOffersSource(offers);
}

export function ensurePricingSources(): Promise<void> {
  if (!promise) promise = hydrate();
  return promise;
}
