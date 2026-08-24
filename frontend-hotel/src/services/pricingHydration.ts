/** Hydrates pricing's sync lookups (promos + extras) from backend catalogs.
    Idempotent: the first call wins; failures keep fixture defaults silently. */
import { HotelsDocument } from '@/graphql/generated/graphql';
import { gqlRequest, useGraphql } from './graphqlClient';
import { getOffers } from './catalog';
import { getExtras } from './extras';
import { setExtrasCatalog, setOffersSource } from './pricing';

let promise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  if (!useGraphql) return;
  const { hotels } = await gqlRequest(HotelsDocument, { input: { page: { page: 0, size: 100 } } });
  const ids = hotels.items.filter((h) => h.status === 'active').map((h) => h.id);
  const [offers, extras] = await Promise.all([
    Promise.all(ids.map((id) => getOffers(id))).then((lists) => lists.flat()),
    Promise.all(ids.map((id) => getExtras(id))).then((lists) => lists.flat()),
  ]);
  if (offers.length) setOffersSource(offers);
  if (extras.length) setExtrasCatalog(extras);
}

export function ensurePricingSources(): Promise<void> {
  if (!promise) promise = hydrate().catch(() => {});
  return promise;
}
