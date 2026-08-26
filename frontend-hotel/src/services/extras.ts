/** Extras GraphQL service. */
import { HotelExtrasDocument, type HotelExtrasQuery } from '@/graphql/generated/graphql';
import type { Extra, ExtraUnit } from '@/types';
import { gqlRequest } from './graphqlClient';
import { toBaseMad } from './catalog';

type ExtraSource = HotelExtrasQuery['extras'][number];

const UNIT_BY_MODEL: Record<ExtraSource['pricingModel'], ExtraUnit> = {
  per_stay: 'per stay',
  per_night: 'per day',
  per_person: 'per person',
  per_room: 'per stay',
};

export function mapExtra(e: ExtraSource): Extra {
  return {
    id: e.id,
    name: e.name,
    desc: e.description ?? '',
    price: toBaseMad(e.priceAmount, e.currencyCode),
    unit: UNIT_BY_MODEL[e.pricingModel] ?? 'per stay',
    icon: '',
  };
}

/** Extras for one hotel. */
export async function getExtras(hotelId?: string | null): Promise<Extra[]> {
  if (!hotelId) return [];
  return (await gqlRequest(HotelExtrasDocument, { hotelId })).extras.map(mapExtra);
}
