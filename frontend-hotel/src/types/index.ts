/** Domain types — single source of truth (see docs/DATA_FLOW.md). */

export interface Capacity {
  adults: number;
  children: number;
}

export type Availability = 'available' | 'soldout' | 'few';

export interface Room {
  id: string;
  name: string;
  images: string[];
  description: string;
  capacity: Capacity;
  bed: string;
  size: string;
  view?: string;
  category: 'standard' | 'suite';
  amenities: string[];
  pricePerNight: number;
  cancellationPolicy: string;
  availability: Availability;
  importantInfo: string[];
  /** Backend mode: owning hotel (set by the catalog gateway). */
  hotelId?: string;
  hotelName?: string;
  currencyCode?: string;
}

export type PlanSuffix = 'bb' | 'ro' | 'hb';

export interface RatePlan {
  id: string;
  backendRatePlanId: string;
  name: string;
  mealPlan: string;
  price: number;
  cancellationPolicy: string;
  benefits: string[];
  freeCancellation: boolean;
}

export type Discount =
  { type: 'percent'; value: number } | { type: 'night'; every: number; free: number };

export interface Offer {
  id: string;
  code: string;
  title: string;
  desc: string;
  discount: Discount;
  bookingWindow: { from: string; to: string };
  stayWindow: { from: string; to: string };
  minNights: number;
  eligiblePlans: string[];
  badge: string;
  conditions: string[];
}

export type ExtraUnit = 'per stay' | 'per day' | 'per item' | 'per person';

export interface Extra {
  id: string;
  name: string;
  desc?: string;
  price: number;
  unit: ExtraUnit;
  icon: string;
}

export interface Guest {
  title: 'Mr' | 'Ms' | 'Mrs' | 'Mx' | 'Dr';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  arrival: string;
  requests: string;
}

export interface PromoResult {
  valid: boolean;
  code: string;
  offer: Offer | null;
  message: string;
}

export interface QuoteExtraLine {
  extraId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteChargeLine {
  name: string;
  chargeType: 'tax' | 'fee';
  amount: number;
}

export interface PriceBreakdown {
  perNight: number;
  nights: number;
  rooms: number;
  roomSubtotal: number;
  discount: number;
  taxedBase: number;
  taxes: number;
  extrasTotal: number;
  total: number;
  originalTotal: number;
  currency?: string;
  promo?: PromoResult;
  /** Itemized extras (name/quantity/unit price) — undefined where a caller
      hasn't wired it through yet; QuoteTable falls back to one aggregate line. */
  extras?: QuoteExtraLine[];
  /** Server-derived figures when pricing came from the backend quote engine.
      `taxes` is the aggregate for display; these preserve the split. */
  taxAmount?: number;
  feeAmount?: number;
  /** Effective combined tax+fee rate over the taxed base (0..1). Optional —
      clients must render the generic "Taxes & fees" label unless this is set. */
  taxRate?: number;
  /** Itemized tax/fee lines as priced by the backend (tax_fee_types) — the
      only legitimate source for a tax breakdown. Undefined for locally-built
      breakdowns; QuoteTable falls back to the generic aggregate row. */
  charges?: QuoteChargeLine[];
}

export type ReservationStatus = 'confirmed' | 'checked-in' | 'cancelled';

export interface Reservation {
  ref: string;
  email: string;
  status: ReservationStatus;
  checkedIn: boolean;
  createdAt: string;
  guest: Guest;
  hotelId: string;
  roomId: string;
  planId: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  childrenAges?: number[];
  rooms: number;
  extras: Array<{ id: string; qty: number }>;
  promo: string;
  price?: Partial<PriceBreakdown>;
  demo?: boolean;
  /** Denormalized display names captured at booking time (backend room ids
      cannot be resolved against the static fixture). */
  hotelName?: string;
  roomName?: string;
  extrasSnapshot?: Array<{ id: string; name: string; price: number; unit: string; qty: number }>;
  checkedInAt?: string | null;
  arrivalDoc?: string;
  arrival?: string;
  checkedInByName?: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: string;
}

export interface SearchState {
  checkin: Date | null;
  checkout: Date | null;
  adults: number;
  children: number;
  childrenAges: number[];
  rooms: number;
  promo: string;
  currency: CurrencyCode;
}

export type CurrencyCode = 'MAD' | 'EUR' | 'USD' | 'GBP';
export type LangCode = 'en' | 'fr' | 'ar';

export interface Distance {
  label: string;
  value: string;
}

export interface Facility {
  name: string;
  desc: string;
  icon: string;
}

export interface Restaurant {
  name: string;
  type: string;
  hours: string;
  dress: string;
  reservation: boolean;
  desc: string;
}

export interface Policy {
  name: string;
  value: string;
  icon: string;
}

export interface Experience {
  name: string;
  desc: string;
  icon: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Review {
  author: string;
  country: string;
  rating: number;
  date: string;
  stay: string;
  title: string;
  text: string;
}

export interface GalleryImage {
  src: string;
  category: string;
  alt: string;
}

export interface Property {
  id: string;
  name: string;
  brand: string;
  city: string;
  area: string;
  type: string;
  tagline: string;
  rating: number;
  reviewCount: number;
  checkIn: string;
  checkOut: string;
  description: string;
  longDescription: string;
  amenities: string[];
  highlights: string[];
  location: {
    address: string;
    mapImage: string;
    distances: Distance[];
  };
  facilities: Facility[];
  restaurants: Restaurant[];
  experiences: Experience[];
  policies: Policy[];
  faq: {
    general: FaqItem[];
    bookings: FaqItem[];
    atTheProperty: FaqItem[];
  };
  gallery: GalleryImage[];
  reviews: Review[];
  images: string[];
  rooms: Room[];
}

export interface SearchResultEntry {
  room: Room;
  availability: Availability;
  plans: RatePlan[];
  demand: number;
  /** Backend mode: owning hotel, for linking to /hotel/[hotelId]?roomId=… */
  hotelId?: string;
  hotelName?: string;
}

export interface StayRoomResult {
  property: Property;
  room: Room;
  availability: Availability;
  plans: RatePlan[];
  fits: boolean;
  siblingRooms: Array<{ room: Room; availability: Availability; plans: RatePlan[] }>;
}

export interface CancellationEvaluation {
  fee: number;
  refund: number;
  label: string;
  freeUntilIso: string;
}

export interface User {
  email: string;
  name: string;
  password: string;
}

export interface Session {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  roles: string[];
  hotelIds: string[];
  token: string;
  at: number;
}

export interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
  updatedAt: string | null;
  chosen: boolean;
}

export interface PaymentResult {
  ok: boolean;
  message: string;
}

export interface SiteSearchResult {
  rooms: Room[];
  offers: Offer[];
  faq: Array<{ q: string; a: string; topic: string }>;
  content: Array<{ type: 'restaurant' | 'experience'; name: string }>;
}
