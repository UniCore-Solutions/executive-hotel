/** Catalog GraphQL services — all accessors call the backend gateway directly.
    Errors propagate to callers (no silent mock fallbacks). */
import {
  HotelByIdDocument,
  HotelExperiencesDocument,
  HotelOffersDocument,
  HotelReviewsDocument,
  HotelRoomTypesDocument,
  RoomTypeByIdDocument,
  StayAvailabilityDocument,
  StayRatesDocument,
  StaySearchDocument,
  type HotelByIdQuery,
  type HotelExperiencesQuery,
  type HotelOffersQuery,
  type HotelReviewsQuery,
  type HotelRoomTypesQuery,
  type RoomTypeByIdQuery,
  type StayAvailabilityQuery,
  type StayRatesQuery,
} from '@/graphql/generated/graphql';
import type {
  Availability,
  Experience,
  Offer,
  Property,
  RatePlan,
  Review,
  Room,
  SearchResultEntry,
  StayRoomResult,
} from '@/types';
import { gqlRequest } from './graphqlClient';
import { toISODate } from '@/lib/dates';
import { demandFor } from './availability';

import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

const FX: Record<string, number> = {
  MAD: 1,
  EUR: Number.parseFloat(process.env.NEXT_PUBLIC_FX_EUR ?? '0.091'),
  USD: Number.parseFloat(process.env.NEXT_PUBLIC_FX_USD ?? '0.100'),
  GBP: Number.parseFloat(process.env.NEXT_PUBLIC_FX_GBP ?? '0.078'),
};

export function toBaseMad(amount: number, currencyCode: string | null | undefined): number {
  const fx = currencyCode ? FX[currencyCode] : undefined;
  if (!fx || fx === 1) return amount;
  return Math.round((amount / fx) * 100) / 100;
}

type RoomTypeSource =
  | HotelRoomTypesQuery['roomTypes'][number]
  | NonNullable<RoomTypeByIdQuery['roomType']>;

/** Stay parameters shared by the search/stay seams. */
export type StayParams = {
  checkin?: Date | string | null;
  checkout?: Date | string | null;
  adults?: number;
  children?: number;
  rooms?: number;
};

function stayInputOf(
  hotelId: string,
  params: StayParams
): {
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  rooms: number;
} {
  const ci = params.checkin ? toISODate(params.checkin) : new Date().toISOString().slice(0, 10);
  const co = params.checkout
    ? toISODate(params.checkout)
    : new Date(new Date(ci).getTime() + 86400000).toISOString().slice(0, 10);
  return {
    hotelId,
    checkInDate: ci,
    checkOutDate: co,
    adults: params.adults ?? 2,
    children: params.children ?? 0,
    rooms: params.rooms ?? 1,
  };
}

/** RatesInput has no `rooms` field — rates are per room type, independent of
    the number of rooms requested. */
function ratesInputOf(hotelId: string, params: StayParams) {
  const { rooms: _rooms, ...rest } = stayInputOf(hotelId, params);
  return { ...rest, hotelId };
}

export function mapRoomTypeToRoom(roomType: RoomTypeSource, hotelName?: string): Room {
  return {
    id: roomType.id,
    name: roomType.name,
    images: roomType.media.map((m) => m.url),
    description: roomType.description ?? '',
    capacity: { adults: roomType.maxAdults, children: roomType.maxChildren },
    bed: roomType.bedConfiguration ?? '',
    size: roomType.sizeSqm ? `${roomType.sizeSqm} m²` : '',
    view: roomType.viewType ?? undefined,
    category: roomType.name.toLowerCase().includes('suite') ? 'suite' : 'standard',
    amenities: roomType.amenities.map((a) => a.name),
    pricePerNight: toBaseMad(roomType.pricePerNight ?? 0, roomType.currencyCode),
    cancellationPolicy: 'Free cancellation up to 2 days before check-in',
    availability: 'available',
    importantInfo: [],
    hotelId: roomType.hotelId,
    hotelName: roomType.hotelName ?? hotelName,
    currencyCode: roomType.currencyCode ?? undefined,
  };
}

export async function getRoomTypes(hotelId: string): Promise<Room[]> {
  const { roomTypes } = await gqlRequest(HotelRoomTypesDocument, { hotelId });
  return roomTypes.filter((rt) => rt.status === 'active').map((rt) => mapRoomTypeToRoom(rt));
}

type BackendOffer = HotelOffersQuery['offers'][number];

export function mapOfferToOffer(offer: BackendOffer): Offer {
  const conditions = [
    ...(offer.minNights ? [`Minimum stay of ${offer.minNights} nights`] : []),
    ...(offer.description ? [offer.description] : []),
  ];
  return {
    id: offer.id,
    code: offer.code,
    title: offer.name,
    desc: offer.description ?? '',
    discount: { type: 'percent', value: offer.discountValue },
    bookingWindow: { from: offer.bookingWindowStart ?? '', to: offer.bookingWindowEnd ?? '' },
    stayWindow: { from: offer.stayWindowStart ?? '', to: offer.stayWindowEnd ?? '' },
    minNights: offer.minNights ?? 1,
    eligiblePlans: offer.appliesToAllRatePlans ? ['bb', 'hb', 'ro'] : ['bb'],
    badge:
      offer.discountType === 'NIGHT'
        ? `${offer.discountValue} free`
        : `−${offer.discountValue}%`,
    conditions,
  };
}

export async function getOffers(hotelId: string): Promise<Offer[]> {
  const { offers } = await gqlRequest(HotelOffersDocument, { hotelId });
  return offers
    .filter((o) => o.status === 'active')
    .map(mapOfferToOffer)
    .slice(0, 3);
}

type BackendReview = HotelReviewsQuery['reviews']['items'][number];

export function mapReviewToReview(review: BackendReview): Review {
  return {
    author: review.authorName ?? 'Guest',
    country: '',
    rating: review.rating,
    date: review.createdAt.slice(0, 7),
    stay: '',
    title: review.title ?? '',
    text: review.comment ?? '',
  };
}

export async function getReviews(hotelId: string): Promise<Review[]> {
  const { reviews } = await gqlRequest(HotelReviewsDocument, {
    hotelId,
    page: { page: 0, size: 10 },
  });
  return reviews.items.map(mapReviewToReview);
}

type BackendExperience = HotelExperiencesQuery['experiences'][number];

export function mapExperienceToExperience(experience: BackendExperience): Experience {
  return {
    name: experience.name,
    desc: experience.description ?? '',
    icon: 'eye',
  };
}

export async function getExperiences(hotelId: string): Promise<Experience[]> {
  const { experiences } = await gqlRequest(HotelExperiencesDocument, { hotelId });
  return experiences.map(mapExperienceToExperience);
}

type BackendAvailability = StayAvailabilityQuery['availability'][number];

export function mapAvailabilityStatus(status: BackendAvailability['status']): Availability {
  if (status === 'soldout') return 'soldout';
  if (status === 'few') return 'few';
  return 'available';
}

type BackendRate = StayRatesQuery['rates'][number];

export function ratePlansForRoom(roomId: string, rates: BackendRate[]): RatePlan[] {
  return rates
    .filter((r) => r.roomTypeId === roomId)
    .map((r) => ({
      id: `${roomId}::${r.ratePlanCode.toLowerCase()}`,
      name: r.ratePlanName,
      mealPlan: r.mealPlan ?? '',
      price: toBaseMad(r.pricePerNight, r.currencyCode),
      cancellationPolicy: r.cancellationPolicy ?? '',
      benefits: [],
      freeCancellation: r.isRefundable,
    }));
}

type BackendHotel = NonNullable<HotelByIdQuery['hotel']>;

/** Best-effort backend Hotel → frontend Property mapping. Sections the backend
    does not model (restaurants, policies, faq, gallery) stay empty — consumers
    must not depend on them for backend hotels. */
export function mapHotelToProperty(hotel: BackendHotel): Property {
  return {
    id: hotel.id,
    name: hotel.name,
    brand: hotel.brand ?? 'Executive Collection',
    city: hotel.city ?? '',
    area: hotel.city ?? '',
    type: 'hotel',
    tagline: hotel.description ?? '',
    rating: hotel.averageRating ?? 4,
    reviewCount: 0,
    checkIn: hotel.checkInTime ?? '15:00',
    checkOut: hotel.checkOutTime ?? '11:00',
    description: hotel.description ?? '',
    longDescription: hotel.description ?? '',
    amenities: hotel.amenities.map((a) => a.name),
    highlights: [],
    location: {
      address: [hotel.addressLine1, hotel.addressLine2, hotel.city, hotel.countryCode]
        .filter(Boolean)
        .join(', '),
      mapImage: '',
      distances: [],
    },
    facilities: [],
    restaurants: [],
    experiences: [],
    policies: [],
    faq: { general: [], bookings: [], atTheProperty: [] },
    gallery: [],
    reviews: [],
    images: hotel.media.map((m) => m.url),
    rooms: [],
  };
}

type StayResult = Array<{
  room: Room;
  availability: Availability;
  plans: RatePlan[];
  hotelId?: string;
  hotelName?: string;
}>;

type BatchAvailability = StayAvailabilityQuery['availability'][number];
type BatchRate = StayRatesQuery['rates'][number];
type BatchRoomType = HotelRoomTypesQuery['roomTypes'][number];

interface StayBatchSlice {
  availability: BatchAvailability[];
  rates: BatchRate[];
  roomTypes: BatchRoomType[];
}

type StayBatchData = Record<string, unknown>;

const ROOM_TYPE_SELECTION = `
  id hotelId hotelName currencyCode name description maxAdults maxChildren
  bedConfiguration sizeSqm viewType status
  amenities { id name category }
  media { id url altText isPrimary }
  pricePerNight
`;

const batchDocuments = new Map<
  number,
  TypedDocumentNode<StayBatchData, Record<string, unknown>>
>();

function stayBatchDocument(
  n: number
): TypedDocumentNode<StayBatchData, Record<string, unknown>> {
  const cached = batchDocuments.get(n);
  if (cached) return cached;
  const defs: string[] = [];
  const fields: string[] = [];
  for (let i = 0; i < n; i++) {
    defs.push(`$a${i}: AvailabilityInput!`, `$r${i}: RatesInput!`, `$h${i}: ID!`);
    fields.push(
      `a${i}: availability(input: $a${i}) { roomTypeId available status capacityFits }`,
      `r${i}: rates(input: $r${i}) { roomTypeId ratePlanId ratePlanCode ratePlanName mealPlan pricePerNight currencyCode cancellationPolicy isRefundable }`,
      `t${i}: roomTypes(hotelId: $h${i}) { ${ROOM_TYPE_SELECTION} }`
    );
  }
  const doc = parse(`query StayBatch(${defs.join(', ')}) { ${fields.join(' ')} }`) as unknown as TypedDocumentNode<StayBatchData, Record<string, unknown>>;
  batchDocuments.set(n, doc);
  return doc;
}

function assembleStaySlice(slice: StayBatchSlice): StayResult {
  return slice.roomTypes
    .filter((rt) => rt.status === 'active')
    .map((rt) => {
      const avail = slice.availability.find((a) => a.roomTypeId === rt.id);
      if (!avail || avail.status === 'soldout' || !avail.capacityFits) return null;
      const room = mapRoomTypeToRoom(rt);
      return {
        room,
        availability: mapAvailabilityStatus(avail.status),
        plans: ratePlansForRoom(rt.id, slice.rates),
        hotelId: rt.hotelId,
        hotelName: room.hotelName,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** One round trip for availability + rates + room types across N hotels. */
async function stayBatch(
  hotels: Array<{ id: string }>,
  params: StayParams
): Promise<Map<string, StayResult>> {
  const out = new Map<string, StayResult>();
  if (hotels.length === 0) return out;
  const variables: Record<string, unknown> = {};
  hotels.forEach((h, i) => {
    variables[`h${i}`] = h.id;
    variables[`a${i}`] = stayInputOf(h.id, params);
    variables[`r${i}`] = ratesInputOf(h.id, params);
  });
  const data = await gqlRequest(stayBatchDocument(hotels.length), variables);
  hotels.forEach((h, i) => {
    const t = data[`t${i}`];
    const a = data[`a${i}`];
    const r = data[`r${i}`];
    out.set(
      h.id,
      Array.isArray(t) && Array.isArray(a) && Array.isArray(r)
        ? assembleStaySlice({
            roomTypes: t as BatchRoomType[],
            availability: a as BatchAvailability[],
            rates: r as BatchRate[],
          })
        : []
    );
  });
  return out;
}

async function stayResultsFor(hotelId: string, params: StayParams): Promise<StayResult> {
  const batches = await stayBatch([{ id: hotelId }], params);
  return batches.get(hotelId) ?? [];
}

/** Availability-driven room search across one hotel (hotelId) or all active
    hotels (hotelId undefined) — one backend staySearch round trip. */
export async function searchStay(
  hotelId: string | undefined,
  params: StayParams = {}
): Promise<SearchResultEntry[]> {
  const input = { ...stayInputOf(hotelId ?? '', params), hotelId };
  const { staySearch } = await gqlRequest(StaySearchDocument, { input });
  return staySearch
    .filter(
      (row) =>
        row.status !== 'soldout' && row.capacityFits && row.roomType.status === 'active'
    )
    .map((row) => {
      const room = mapRoomTypeToRoom(row.roomType);
      return {
        room,
        availability: mapAvailabilityStatus(row.status),
        plans: ratePlansForRoom(row.roomType.id, row.rates),
        hotelId: row.hotelId,
        hotelName: room.hotelName,
        demand: demandFor(room),
      };
    });
}

/** All rooms with availability for one hotel (backend mode). */
export async function getStay(
  hotelId: string,
  params: StayParams = {}
): Promise<{
  hotel: Property;
  rooms: Array<{ room: Room; availability: Availability; plans: RatePlan[]; fits: boolean }>;
} | null> {
  const [{ hotel }, results] = await Promise.all([
    gqlRequest(HotelByIdDocument, { id: hotelId }),
    stayResultsFor(hotelId, params),
  ]);
  if (!hotel) return null;
  return {
    hotel: mapHotelToProperty(hotel),
    rooms: results.map((e) => ({
      room: e.room,
      availability: e.availability,
      plans: e.plans,
      fits: true,
    })),
  };
}

/** Room detail with availability + plans + siblings (backend mode). */
export async function getStayRoom(
  hotelId: string | undefined,
  roomId: string,
  params: StayParams = {}
): Promise<StayRoomResult | null> {
  const rt = (await gqlRequest(RoomTypeByIdDocument, { id: roomId })).roomType;
  if (!rt || rt.status !== 'active') return null;
  const hId = hotelId ?? rt.hotelId;
  const [{ hotel }, { availability }, { rates }, { roomTypes }] = await Promise.all([
    gqlRequest(HotelByIdDocument, { id: hId }),
    gqlRequest(StayAvailabilityDocument, { input: stayInputOf(hId, params) }),
    gqlRequest(StayRatesDocument, { input: ratesInputOf(hId, params) }),
    gqlRequest(HotelRoomTypesDocument, { hotelId: hId }),
  ]);
  if (!hotel) return null;
  const availFor = (id: string) =>
    mapAvailabilityStatus(availability.find((a) => a.roomTypeId === id)?.status ?? 'soldout');
  return {
    property: mapHotelToProperty(hotel),
    room: mapRoomTypeToRoom(rt),
    availability: availFor(rt.id),
    plans: ratePlansForRoom(rt.id, rates),
    fits: availability.find((a) => a.roomTypeId === rt.id)?.capacityFits ?? false,
    siblingRooms: roomTypes
      .filter((x) => x.id !== rt.id && x.status === 'active')
      .map((x) => ({
        room: mapRoomTypeToRoom(x),
        availability: availFor(x.id),
        plans: ratePlansForRoom(x.id, rates),
      })),
  };
}

/** Property lookup (backend mode). */
export async function getProperty(id?: string): Promise<Property | null> {
  const { hotel } = await gqlRequest(HotelByIdDocument, { id: id ?? '' });
  return hotel ? mapHotelToProperty(hotel) : null;
}

export async function getHotelById(id: string) {
  const { hotel } = await gqlRequest(HotelByIdDocument, { id });
  return hotel;
}