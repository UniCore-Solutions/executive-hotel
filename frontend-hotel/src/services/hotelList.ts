/** Hotel list service — fetches active hotels from the backend catalog
    for the destination picker. */
import { gqlRequest } from './graphqlClient';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

export interface HotelListItem {
  id: string;
  name: string;
  brand: string | null;
  city: string | null;
  countryCode: string | null;
  starRating: number | null;
  status: string | null;
  averageRating: number | null;
  fromPricePerNight: number | null;
  defaultCurrency: string;
  description: string | null;
  media: Array<{ url: string; altText: string | null }>;
}

interface HotelListResponse {
  hotels: {
    total: number;
    items: HotelListItem[];
  };
}

const HOTEL_LIST_QUERY = `query HotelList($input: HotelSearchInput) {
  hotels(input: $input) {
    total
    items {
      id
      name
      brand
      city
      countryCode
      starRating
      status
      averageRating
      fromPricePerNight
      defaultCurrency
      description
      media {
        url
        altText
      }
    }
  }
}`;

const HOTEL_LIST_DOC = HOTEL_LIST_QUERY as unknown as TypedDocumentNode<
  HotelListResponse,
  { input?: { query?: string | null; page?: { page?: number; size?: number } | null } | null }
>;

let cachedHotels: HotelListItem[] | null = null;

/** Fetch all active hotels (or by search query). Results are cached per session. */
export async function getHotelList(searchQuery?: string): Promise<HotelListItem[]> {
  if (!searchQuery && cachedHotels) return cachedHotels;
  const data = await gqlRequest(HOTEL_LIST_DOC, {
    input: searchQuery
      ? { query: searchQuery, page: { page: 0, size: 20 } }
      : { page: { page: 0, size: 50 } },
  });
  const items = data.hotels.items.filter((h) => h.status === 'active');
  if (!searchQuery) cachedHotels = items;
  return items;
}
