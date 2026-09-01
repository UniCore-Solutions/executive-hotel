/** Catalog GraphQL services — all accessors call the backend gateway directly.
    Errors propagate to callers (no silent mock fallbacks). */
import {
  HotelByIdDocument,
  HotelDetailsDocument,
  HotelOffersDocument,
  HotelRoomTypesDocument,
  RoomTypeByIdDocument,
  StaySearchDocument,
  type HotelByIdQuery,
  type HotelDetailsQuery,
  type HotelOffersQuery,
  type HotelRoomTypesQuery,
  type RoomTypeByIdQuery,
  type StayAvailabilityQuery,
  type StayRatesQuery,
  type StaySearchQuery,
} from '@/graphql/generated/graphql';
import type {
  Availability,
  Experience,
  Offer,
  Property,
  RatePlan,
  PaymentTiming,
  Review,
  Room,
  SearchResultEntry,
  StayRoomResult,
} from '@/types';
import { gqlRequest } from './graphqlClient';
import { getCanonicalHotel } from './canonicalHotel';
import { toISODate } from '@/lib/dates';
import { FX } from '@/lib/format';
import { demandFor } from './availability';

/** Convert a price denominated in {@code currencyCode} (MAD today) to MAD —
    the single FX table (lib/format.ts) keeps search cards and quote displays
    consistent. */
export function toBaseMad(amount: number, currencyCode: string | null | undefined): number {
  const fx = currencyCode ? (FX as Record<string, number>)[currencyCode] : undefined;
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
    // The room-level field is unpopulated for real rooms; cancellation terms
    // live on the rate plan (RoomRateOption.cancellationPolicy), which the
    // room and booking pages display. Nothing is invented here.
    cancellationPolicy: '',
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
    eligiblePlans: ['bb', 'hb', 'ro'],
    // The backend discounts are percentage/fixed_amount today; the badge
    // renders the value with the right sign for either.
    badge:
      offer.discountType === 'fixed_amount'
        ? `−${offer.discountValue}`
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

type BackendReview = NonNullable<HotelDetailsQuery['hotelDetails']>['reviews']['items'][number];

type BackendExperience = NonNullable<HotelDetailsQuery['hotelDetails']>['experiences'][number];

export function mapExperienceToExperience(experience: BackendExperience): Experience {
  return {
    name: experience.name,
    desc: experience.description ?? '',
    icon: 'eye',
  };
}

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

type BackendAvailability = StayAvailabilityQuery['availability'][number];

export function mapAvailabilityStatus(status: BackendAvailability['status']): Availability {
  if (status === 'soldout') return 'soldout';
  if (status === 'few') return 'few';
  return 'available';
}

type BackendRate = StayRatesQuery['rates'][number];

/** Narrows the backend's `payment_timing` string to the union the UI switches
    on. The column is CHECK-constrained to these three values, so an unknown
    one means the contract drifted — fall back to the safest reading, that the
    guest pays now, rather than promising a settlement we cannot honour. */
function normalizePaymentTiming(value: string | null | undefined): PaymentTiming {
  return value === 'pay_at_property' || value === 'prepay_deposit' ? value : 'prepay_full';
}

export function ratePlansForRoom(roomId: string, rates: BackendRate[]): RatePlan[] {
  return rates
    .filter((r) => r.roomTypeId === roomId)
    .map((r) => ({
      id: `${roomId}::${r.ratePlanCode.toLowerCase()}`,
      backendRatePlanId: r.ratePlanId,
      name: r.ratePlanName,
      mealPlan: r.mealPlan ?? '',
      price: toBaseMad(r.pricePerNight, r.currencyCode),
      cancellationPolicy: r.cancellationPolicy ?? '',
      benefits: [],
      freeCancellation: r.isRefundable,
      paymentTiming: normalizePaymentTiming(r.paymentTiming),
      depositPercentage: r.depositPercentage ?? undefined,
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

/** One staySearch round trip: every room type of the hotel + its availability
    status and rates for the requested stay. The single-hotel platform needs
    no multi-hotel aliasing — this one query is the shared read for search,
    the hotel grid, the room page and the booking page. */
async function staySearchRows(
  hotelId: string,
  params: StayParams
): Promise<StaySearchQuery['staySearch']> {
  const input = { ...stayInputOf(hotelId ?? '', params), hotelId: hotelId || undefined };
  const { staySearch } = await gqlRequest(StaySearchDocument, { input });
  return staySearch;
}

function mapStayRows(rows: StaySearchQuery['staySearch']) {
  return rows
    .filter(
      (row) =>
        row.status !== 'soldout' && row.capacityFits && row.roomType.status === 'active'
    )
    .map((row) => ({
      room: mapRoomTypeToRoom(row.roomType),
      availability: mapAvailabilityStatus(row.status),
      plans: ratePlansForRoom(row.roomType.id, row.rates),
      hotelId: row.hotelId,
      hotelName: row.hotelName,
    }));
}

/** Availability-driven room search across one hotel (hotelId) or the
    canonical hotel (hotelId undefined) — one backend staySearch round trip. */
export async function searchStay(
  hotelId: string | undefined,
  params: StayParams = {}
): Promise<SearchResultEntry[]> {
  const rows = await staySearchRows(hotelId ?? '', params);
  return mapStayRows(rows).map((entry) => ({ ...entry, demand: demandFor(entry.room) }));
}

/** All rooms with availability for one hotel (backend mode) — one staySearch
    round trip. The hotel itself is not re-fetched: callers already hold it
    (HotelDetails on the hotel page). */
export async function getStay(
  hotelId: string,
  params: StayParams = {}
): Promise<
  Array<{ room: Room; availability: Availability; plans: RatePlan[]; fits: boolean }> | null
> {
  const rows = await staySearchRows(hotelId, params);
  return mapStayRows(rows).map((e) => ({ ...e, fits: true }));
}

/** Room detail with availability + plans + siblings — two round trips:
    staySearch (room types + availability + rates) + HotelById (property).
    The hotel id is resolved from the cached canonical hotel when absent. */
export async function getStayRoom(
  hotelId: string | undefined,
  roomId: string,
  params: StayParams = {}
): Promise<StayRoomResult | null> {
  const hId = hotelId ?? (await getCanonicalHotelId());
  const [rows, { hotel }] = await Promise.all([
    staySearchRows(hId, params),
    gqlRequest(HotelByIdDocument, { id: hId }),
  ]);
  if (!hotel) return null;
  const rowFor = (id: string) => rows.find((r) => r.roomType.id === id);
  const mine = rowFor(roomId);
  if (!mine || mine.roomType.status !== 'active') return null;
  const availFor = (id: string) => mapAvailabilityStatus(rowFor(id)?.status ?? 'soldout');
  return {
    property: mapHotelToProperty(hotel),
    room: mapRoomTypeToRoom(mine.roomType),
    availability: availFor(roomId),
    plans: ratePlansForRoom(roomId, mine.rates),
    fits: mine.capacityFits ?? false,
    siblingRooms: rows
      .filter((r) => r.roomType.id !== roomId && r.roomType.status === 'active')
      .map((r) => ({
        room: mapRoomTypeToRoom(r.roomType),
        availability: availFor(r.roomType.id),
        plans: ratePlansForRoom(r.roomType.id, r.rates),
      })),
  };
}

/** Stay-variant refresh for the room page: only the availability/rates of the
    stay change when the guest edits dates — the room and hotel entities are
    already on screen, so only staySearch is re-run (no hotel/room re-fetch). */
export async function refreshRoomStay(
  hotelId: string,
  roomId: string,
  params: StayParams = {}
): Promise<{
  availability: Availability;
  fits: boolean;
  siblings: Array<{
    room: Room;
    availability: Availability;
    plans: RatePlan[];
  }>;
} | null> {
  const rows = await staySearchRows(hotelId, params);
  const mine = rows.find((r) => r.roomType.id === roomId);
  if (!mine) return null;
  const availFor = (id: string) => mapAvailabilityStatus(rows.find((r) => r.roomType.id === id)?.status ?? 'soldout');
  return {
    availability: availFor(roomId),
    fits: mine.capacityFits ?? false,
    siblings: rows
      .filter((r) => r.roomType.id !== roomId && r.roomType.status === 'active')
      .map((r) => ({
        room: mapRoomTypeToRoom(r.roomType),
        availability: availFor(r.roomType.id),
        plans: ratePlansForRoom(r.roomType.id, r.rates),
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

/** The platform's single property id (single-hotel platform). */
export async function getCanonicalHotelId(): Promise<string> {
  return (await getCanonicalHotel()).id;
}

/** Resolve one room type by backend UUID (recently-viewed rooms etc.). */
export async function getRoomTypeById(roomId: string): Promise<Room | null> {
  const { roomType } = await gqlRequest(RoomTypeByIdDocument, { id: roomId });
  if (!roomType || roomType.status !== 'active') return null;
  return mapRoomTypeToRoom(roomType);
}

type BackendHotelDetails = NonNullable<HotelDetailsQuery['hotelDetails']>;

export interface HotelDetailsResult {
  hotel: BackendHotelDetails['hotel'];
  experiences: Experience[];
  restaurants: BackendHotelDetails['restaurants'];
  faqs: BackendHotelDetails['faqs'];
  policies: BackendHotelDetails['policies'];
  reviews: Review[];
  reviewsCount: number;
  averageRating: number | null;
}

/** The hotel page's single aggregation query — hotel, experiences, restaurants,
    faqs and reviews in one round trip, replacing what used to be four separate
    calls (getHotelById + getExperiences + getReviews, with a fourth for
    restaurants/faqs that was never actually made — see Task 7 in
    docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md). */
export async function getHotelDetails(id: string): Promise<HotelDetailsResult | null> {
  const { hotelDetails } = await gqlRequest(HotelDetailsDocument, { id });
  if (!hotelDetails) return null;
  return {
    hotel: hotelDetails.hotel,
    experiences: hotelDetails.experiences.map(mapExperienceToExperience),
    restaurants: hotelDetails.restaurants,
    faqs: hotelDetails.faqs,
    policies: hotelDetails.policies,
    reviews: hotelDetails.reviews.items.map(mapReviewToReview),
    reviewsCount: hotelDetails.reviewsCount,
    averageRating: hotelDetails.averageRating ?? null,
  };
}