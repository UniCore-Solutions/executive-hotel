/** Catalog GraphQL services — Phases 3–8 service seams.
    Each accessor prefers the backend GraphQL gateway and falls back to the static
    fixture when mock mode is on or the gateway is unreachable. */
import { DATA } from '@/data';
import {
  HotelByIdDocument,
  HotelExperiencesDocument,
  HotelOffersDocument,
  HotelReviewsDocument,
  HotelRoomTypesDocument,
  HotelsDocument,
  RoomTypeByIdDocument,
  StayAvailabilityDocument,
  StayRatesDocument,
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
import { gqlRequest, useGraphql } from './graphqlClient';
import { toISODate } from '@/lib/dates';
import {
  demandFor,
  getProperty as mockGetProperty,
  getStay as mockGetStay,
  getStayRoom as mockGetStayRoom,
  searchRooms as mockSearchRooms,
} from './availability';

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
  return rest;
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
  if (!useGraphql) return DATA.PROPERTY.rooms;
  try {
    const { roomTypes } = await gqlRequest(HotelRoomTypesDocument, { hotelId });
    return roomTypes.filter((rt) => rt.status === 'active').map((rt) => mapRoomTypeToRoom(rt));
  } catch {
    return DATA.PROPERTY.rooms;
  }
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
  if (!useGraphql) return DATA.OFFERS;
  try {
    const { offers } = await gqlRequest(HotelOffersDocument, { hotelId });
    return offers
      .filter((o) => o.status === 'active')
      .map(mapOfferToOffer)
      .slice(0, 3);
  } catch {
    return DATA.OFFERS;
  }
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
  if (!useGraphql) return DATA.PROPERTY.reviews;
  try {
    const { reviews } = await gqlRequest(HotelReviewsDocument, {
      hotelId,
      page: { page: 0, size: 10 },
    });
    return reviews.items.map(mapReviewToReview);
  } catch {
    return DATA.PROPERTY.reviews;
  }
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
  if (!useGraphql) return DATA.PROPERTY.experiences;
  try {
    const { experiences } = await gqlRequest(HotelExperiencesDocument, { hotelId });
    return experiences.map(mapExperienceToExperience);
  } catch {
    return DATA.PROPERTY.experiences;
  }
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

async function stayResultsFor(hotelId: string, params: StayParams): Promise<StayResult> {
  const input = stayInputOf(hotelId, params);
  const [{ availability }, { rates }, { roomTypes }] = await Promise.all([
    gqlRequest(StayAvailabilityDocument, { input }),
    gqlRequest(StayRatesDocument, { input: ratesInputOf(hotelId, params) }),
    gqlRequest(HotelRoomTypesDocument, { hotelId }),
  ]);
  return roomTypes
    .filter((rt) => rt.status === 'active')
    .map((rt) => {
      const avail = availability.find((a) => a.roomTypeId === rt.id);
      if (!avail || avail.status === 'soldout' || !avail.capacityFits) return null;
      const room = mapRoomTypeToRoom(rt);
      return {
        room,
        availability: mapAvailabilityStatus(avail.status),
        plans: ratePlansForRoom(rt.id, rates),
        hotelId: rt.hotelId,
        hotelName: room.hotelName,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** Availability-driven room search across one hotel (hotelId) or all active
    hotels (hotelId undefined) — backend inventory semantics. Falls back to the
    deterministic mock on error or when mock mode is on. */
export async function searchStay(
  hotelId: string | undefined,
  params: StayParams = {}
): Promise<SearchResultEntry[]> {
  const mockFallback = async (): Promise<SearchResultEntry[]> =>
    mockSearchRooms({ ...params, checkin: params.checkin ?? null });
  if (!useGraphql) return mockFallback();
  try {
    const active: Array<{ id: string; name?: string }> = hotelId
      ? [{ id: hotelId }]
      : (await gqlRequest(HotelsDocument, { input: { page: { page: 0, size: 100 } } }))
          .hotels.items.filter((h) => h.status === 'active')
          .map((h) => ({ id: h.id, name: h.name }));
    const perHotel = await Promise.all(
      active.map(async (h) => {
        const entries = await stayResultsFor(h.id, params);
        return entries.map((e) => ({ ...e, demand: demandFor(e.room) }));
      })
    );
    return perHotel.flat();
  } catch {
    return mockFallback();
  }
}

/** All rooms with availability for one hotel (backend mode). */
export async function getStay(
  hotelId: string,
  params: StayParams = {}
): Promise<{
  hotel: Property;
  rooms: Array<{ room: Room; availability: Availability; plans: RatePlan[]; fits: boolean }>;
} | null> {
  if (!useGraphql) return mockGetStay(hotelId, params);
  try {
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
  } catch {
    return mockGetStay(hotelId, params);
  }
}

/** Room detail with availability + plans + siblings (backend mode). */
export async function getStayRoom(
  hotelId: string | undefined,
  roomId: string,
  params: StayParams = {}
): Promise<StayRoomResult | null> {
  if (!useGraphql) return mockGetStayRoom(hotelId, roomId, params);
  try {
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
  } catch {
    return mockGetStayRoom(hotelId, roomId, params);
  }
}

/** Property lookup (backend mode). */
export async function getProperty(id?: string): Promise<Property | null> {
  if (!useGraphql) return mockGetProperty(id);
  try {
    const { hotel } = await gqlRequest(HotelByIdDocument, { id: id ?? '' });
    return hotel ? mapHotelToProperty(hotel) : null;
  } catch {
    return mockGetProperty(id);
  }
}

export async function getHotelById(id: string) {
  if (!useGraphql) return DATA.PROPERTY;
  try {
    const { hotel } = await gqlRequest(HotelByIdDocument, { id });
    return hotel;
  } catch {
    return DATA.PROPERTY;
  }
}