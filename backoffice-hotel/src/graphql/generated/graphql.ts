/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  LocalDate: { input: string; output: string };
};

export type AdminCreateUserInput = {
  email: Scalars["String"]["input"];
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  password: Scalars["String"]["input"];
  roleName: Scalars["String"]["input"];
};

export type AdminDashboard = {
  __typename?: "AdminDashboard";
  arrivalsToday: Scalars["Int"]["output"];
  availableTonight: Scalars["Int"]["output"];
  departuresToday: Scalars["Int"]["output"];
  hotelId: Scalars["ID"]["output"];
  hotelName: Scalars["String"]["output"];
  inHouseToday: Scalars["Int"]["output"];
  occupancyPct: Scalars["Float"]["output"];
  pendingInvoices: Scalars["Int"]["output"];
  pendingPayments: Scalars["Int"]["output"];
  recentReservations: Array<Reservation>;
  revenueTotal: Scalars["Float"]["output"];
  soldOutTonight: Scalars["Int"]["output"];
};

export type AdminGuest = {
  __typename?: "AdminGuest";
  countryCode?: Maybe<Scalars["String"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  firstName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  lastName: Scalars["String"]["output"];
  lastStayDate?: Maybe<Scalars["LocalDate"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  reservationsCount: Scalars["Int"]["output"];
  totalSpent: Scalars["Float"]["output"];
};

export type AdminGuestPage = {
  __typename?: "AdminGuestPage";
  items: Array<AdminGuest>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type AdminHotel = {
  __typename?: "AdminHotel";
  amenities: Array<Amenity>;
  availability: Array<AvailabilityRow>;
  experiences: Array<Experience>;
  extras: Array<Extra>;
  faqs: Array<Faq>;
  hotel: Hotel;
  id: Scalars["ID"]["output"];
  media: Array<Media>;
  name: Scalars["String"]["output"];
  ratePlans: Array<AdminRatePlan>;
  restaurants: Array<Restaurant>;
  roomTypes: Array<AdminRoomType>;
  status: HotelStatus;
};

export type AdminHotelInput = {
  addressLine1?: InputMaybe<Scalars["String"]["input"]>;
  addressLine2?: InputMaybe<Scalars["String"]["input"]>;
  brand?: InputMaybe<Scalars["String"]["input"]>;
  checkInTime?: InputMaybe<Scalars["String"]["input"]>;
  checkOutTime?: InputMaybe<Scalars["String"]["input"]>;
  city?: InputMaybe<Scalars["String"]["input"]>;
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  defaultCurrency?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  email?: InputMaybe<Scalars["String"]["input"]>;
  hotelType?: InputMaybe<Scalars["String"]["input"]>;
  latitude?: InputMaybe<Scalars["Float"]["input"]>;
  longDescription?: InputMaybe<Scalars["String"]["input"]>;
  longitude?: InputMaybe<Scalars["Float"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  starRating?: InputMaybe<Scalars["Int"]["input"]>;
  status?: InputMaybe<HotelStatus>;
};

export type AdminHotelPage = {
  __typename?: "AdminHotelPage";
  items: Array<AdminHotelSummary>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type AdminHotelSummary = {
  __typename?: "AdminHotelSummary";
  activeReservations: Scalars["Int"]["output"];
  brand?: Maybe<Scalars["String"]["output"]>;
  city?: Maybe<Scalars["String"]["output"]>;
  countryCode?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  roomTypeCount: Scalars["Int"]["output"];
  starRating?: Maybe<Scalars["Int"]["output"]>;
  status: HotelStatus;
};

export type AdminPromotion = {
  __typename?: "AdminPromotion";
  applicableDaysOfWeek?: Maybe<Scalars["String"]["output"]>;
  appliesToAllRatePlans: Scalars["Boolean"]["output"];
  appliesToAllRoomTypes: Scalars["Boolean"]["output"];
  bookingWindowEnd?: Maybe<Scalars["LocalDate"]["output"]>;
  bookingWindowStart?: Maybe<Scalars["LocalDate"]["output"]>;
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  discountType: Scalars["String"]["output"];
  discountValue: Scalars["Float"]["output"];
  hotelId?: Maybe<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
  maxUsagePerGuest?: Maybe<Scalars["Int"]["output"]>;
  maxUsageTotal?: Maybe<Scalars["Int"]["output"]>;
  minNights?: Maybe<Scalars["Int"]["output"]>;
  name: Scalars["String"]["output"];
  stackable: Scalars["Boolean"]["output"];
  status: PromotionStatus;
  stayWindowEnd?: Maybe<Scalars["LocalDate"]["output"]>;
  stayWindowStart?: Maybe<Scalars["LocalDate"]["output"]>;
};

export type AdminPromotionInput = {
  applicableDaysOfWeek?: InputMaybe<Scalars["String"]["input"]>;
  appliesToAllRatePlans?: InputMaybe<Scalars["Boolean"]["input"]>;
  appliesToAllRoomTypes?: InputMaybe<Scalars["Boolean"]["input"]>;
  bookingWindowEnd?: InputMaybe<Scalars["LocalDate"]["input"]>;
  bookingWindowStart?: InputMaybe<Scalars["LocalDate"]["input"]>;
  code?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  discountType?: InputMaybe<Scalars["String"]["input"]>;
  discountValue?: InputMaybe<Scalars["Float"]["input"]>;
  maxUsagePerGuest?: InputMaybe<Scalars["Int"]["input"]>;
  maxUsageTotal?: InputMaybe<Scalars["Int"]["input"]>;
  minNights?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  stackable?: InputMaybe<Scalars["Boolean"]["input"]>;
  status?: InputMaybe<PromotionStatus>;
  stayWindowEnd?: InputMaybe<Scalars["LocalDate"]["input"]>;
  stayWindowStart?: InputMaybe<Scalars["LocalDate"]["input"]>;
};

export type AdminRatePlan = {
  __typename?: "AdminRatePlan";
  cancellationDeadlineDays?: Maybe<Scalars["Int"]["output"]>;
  cancellationPenaltyType?: Maybe<Scalars["String"]["output"]>;
  cancellationPenaltyValue?: Maybe<Scalars["Float"]["output"]>;
  cancellationPolicy?: Maybe<Scalars["String"]["output"]>;
  code: Scalars["String"]["output"];
  currencyCode: Scalars["String"]["output"];
  depositPercentage?: Maybe<Scalars["Float"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  isRefundable: Scalars["Boolean"]["output"];
  links: Array<RoomTypeRatePlanInfo>;
  maxStay?: Maybe<Scalars["Int"]["output"]>;
  mealPlan?: Maybe<Scalars["String"]["output"]>;
  minStay?: Maybe<Scalars["Int"]["output"]>;
  name: Scalars["String"]["output"];
  paymentPolicy?: Maybe<Scalars["String"]["output"]>;
  paymentTiming: Scalars["String"]["output"];
  status: RatePlanStatus;
};

export type AdminRatePlanInput = {
  cancellationDeadlineDays?: InputMaybe<Scalars["Int"]["input"]>;
  cancellationPenaltyType?: InputMaybe<Scalars["String"]["input"]>;
  cancellationPenaltyValue?: InputMaybe<Scalars["Float"]["input"]>;
  cancellationPolicy?: InputMaybe<Scalars["String"]["input"]>;
  code?: InputMaybe<Scalars["String"]["input"]>;
  currencyCode?: InputMaybe<Scalars["String"]["input"]>;
  depositPercentage?: InputMaybe<Scalars["Float"]["input"]>;
  isRefundable?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxStay?: InputMaybe<Scalars["Int"]["input"]>;
  mealPlan?: InputMaybe<Scalars["String"]["input"]>;
  minStay?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  paymentPolicy?: InputMaybe<Scalars["String"]["input"]>;
  paymentTiming?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<RatePlanStatus>;
};

export type AdminRole = {
  __typename?: "AdminRole";
  hotelScoped: Scalars["Boolean"]["output"];
  name: Scalars["String"]["output"];
};

export type AdminRoomInput = {
  floor?: InputMaybe<Scalars["String"]["input"]>;
  housekeepingStatus?: InputMaybe<Scalars["String"]["input"]>;
  maintenanceStatus?: InputMaybe<Scalars["String"]["input"]>;
  roomNumber?: InputMaybe<Scalars["String"]["input"]>;
  roomTypeId?: InputMaybe<Scalars["ID"]["input"]>;
  status?: InputMaybe<Scalars["String"]["input"]>;
};

export type AdminRoomType = {
  __typename?: "AdminRoomType";
  amenities: Array<Amenity>;
  bedConfiguration?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  maxAdults: Scalars["Int"]["output"];
  maxChildren: Scalars["Int"]["output"];
  media: Array<Media>;
  name: Scalars["String"]["output"];
  rooms: Array<Room>;
  sizeSqm?: Maybe<Scalars["Float"]["output"]>;
  slug: Scalars["String"]["output"];
  status: RoomTypeStatus;
  totalInventory: Scalars["Int"]["output"];
  viewType?: Maybe<Scalars["String"]["output"]>;
};

export type AdminRoomTypeInput = {
  bedConfiguration?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  longDescription?: InputMaybe<Scalars["String"]["input"]>;
  maxAdults?: InputMaybe<Scalars["Int"]["input"]>;
  maxChildren?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  sizeSqm?: InputMaybe<Scalars["Float"]["input"]>;
  status?: InputMaybe<RoomTypeStatus>;
  totalInventory?: InputMaybe<Scalars["Int"]["input"]>;
  viewType?: InputMaybe<Scalars["String"]["input"]>;
};

export type AdminUser = {
  __typename?: "AdminUser";
  createdAt: Scalars["DateTime"]["output"];
  email: Scalars["String"]["output"];
  firstName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  lastLoginAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastName?: Maybe<Scalars["String"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  roles: Array<AdminUserRole>;
  status: Scalars["String"]["output"];
};

export type AdminUserRole = {
  __typename?: "AdminUserRole";
  hotelId?: Maybe<Scalars["ID"]["output"]>;
  hotelName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  roleName: Scalars["String"]["output"];
};

export type Amenity = {
  __typename?: "Amenity";
  category?: Maybe<Scalars["String"]["output"]>;
  icon?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
};

export type AuditLogEntry = {
  __typename?: "AuditLogEntry";
  action: Scalars["String"]["output"];
  actorEmail?: Maybe<Scalars["String"]["output"]>;
  actorUserId?: Maybe<Scalars["ID"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  hotelId?: Maybe<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
  metadata?: Maybe<Scalars["String"]["output"]>;
  resourceId: Scalars["ID"]["output"];
  resourceType: Scalars["String"]["output"];
  result: Scalars["String"]["output"];
};

export type AuditLogPage = {
  __typename?: "AuditLogPage";
  items: Array<AuditLogEntry>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type AuthPayload = {
  __typename?: "AuthPayload";
  me: Me;
  token: Scalars["String"]["output"];
};

export type AvailabilityInput = {
  adults: Scalars["Int"]["input"];
  checkInDate: Scalars["LocalDate"]["input"];
  checkOutDate: Scalars["LocalDate"]["input"];
  children: Scalars["Int"]["input"];
  hotelId: Scalars["ID"]["input"];
  rooms: Scalars["Int"]["input"];
};

export type AvailabilityRangeInput = {
  blocked?: InputMaybe<Scalars["Int"]["input"]>;
  fromDate: Scalars["LocalDate"]["input"];
  outOfOrder?: InputMaybe<Scalars["Int"]["input"]>;
  roomTypeId: Scalars["ID"]["input"];
  toDate: Scalars["LocalDate"]["input"];
  totalInventory?: InputMaybe<Scalars["Int"]["input"]>;
};

export type AvailabilityRow = {
  __typename?: "AvailabilityRow";
  blocked: Scalars["Int"]["output"];
  free: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  outOfOrder: Scalars["Int"]["output"];
  roomTypeId: Scalars["ID"]["output"];
  roomsSold: Scalars["Int"]["output"];
  stayDate: Scalars["LocalDate"]["output"];
  totalInventory: Scalars["Int"]["output"];
};

export enum AvailabilityStatus {
  Available = "available",
  Few = "few",
  Soldout = "soldout",
}

export type AvailabilityUpdateInput = {
  blocked?: InputMaybe<Scalars["Int"]["input"]>;
  outOfOrder?: InputMaybe<Scalars["Int"]["input"]>;
  roomTypeId: Scalars["ID"]["input"];
  stayDate: Scalars["LocalDate"]["input"];
  totalInventory?: InputMaybe<Scalars["Int"]["input"]>;
};

export type CancelReservationInput = {
  email: Scalars["String"]["input"];
  reasonCode?: InputMaybe<Scalars["String"]["input"]>;
  reasonNote?: InputMaybe<Scalars["String"]["input"]>;
  reference: Scalars["String"]["input"];
};

export type CapturePaymentInput = {
  /**
   * See CreatePaymentInput.guestEmail — the same proof is re-checked here
   * since capture independently re-validates access.
   */
  guestEmail?: InputMaybe<Scalars["String"]["input"]>;
  paymentId: Scalars["ID"]["input"];
};

/** Base fields shared by every content block (platform_content_blocks row). */
export type ContentBlock = {
  id: Scalars["ID"]["output"];
  isEnabled: Scalars["Boolean"]["output"];
  position: Scalars["Int"]["output"];
  type: PlatformBlockType;
};

export type Country = {
  __typename?: "Country";
  callingCode?: Maybe<Scalars["String"]["output"]>;
  code: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
};

export type CreatePaymentInput = {
  amount: Scalars["Float"]["input"];
  currencyCode: Scalars["String"]["input"];
  /**
   * Guest email on file for an accountless reservation — required proof of
   * possession when the caller is not authenticated as the reservation's owner
   * or hotel staff, mirroring the reference+email pattern used by reservation
   * lookup/cancel.
   */
  guestEmail?: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  provider: Scalars["String"]["input"];
  reservationId: Scalars["ID"]["input"];
};

export type CreateReservationInput = {
  adults: Scalars["Int"]["input"];
  checkInDate: Scalars["LocalDate"]["input"];
  checkOutDate: Scalars["LocalDate"]["input"];
  children: Scalars["Int"]["input"];
  currencyCode: Scalars["String"]["input"];
  extras?: InputMaybe<Array<ReservationExtraInput>>;
  guest: ReservationGuestInput;
  hotelId: Scalars["ID"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  promoCode?: InputMaybe<Scalars["String"]["input"]>;
  rooms: Array<ReservationRoomInput>;
};

export type CreateReviewInput = {
  comment?: InputMaybe<Scalars["String"]["input"]>;
  hotelId: Scalars["ID"]["input"];
  rating: Scalars["Int"]["input"];
  reservationId?: InputMaybe<Scalars["ID"]["input"]>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type Experience = {
  __typename?: "Experience";
  category?: Maybe<Scalars["String"]["output"]>;
  currencyCode?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  durationMinutes?: Maybe<Scalars["Int"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  location?: Maybe<Scalars["String"]["output"]>;
  name: Scalars["String"]["output"];
  priceAmount?: Maybe<Scalars["Float"]["output"]>;
  sortOrder: Scalars["Int"]["output"];
};

export type Extra = {
  __typename?: "Extra";
  currencyCode: Scalars["String"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  priceAmount: Scalars["Float"]["output"];
  pricingModel: ExtraPricingModel;
};

export enum ExtraPricingModel {
  PerNight = "per_night",
  PerPerson = "per_person",
  PerRoom = "per_room",
  PerStay = "per_stay",
}

export type Faq = {
  __typename?: "Faq";
  answer: Scalars["String"]["output"];
  category?: Maybe<Scalars["String"]["output"]>;
  hotelId?: Maybe<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
  question: Scalars["String"]["output"];
  sortOrder: Scalars["Int"]["output"];
};

/** Ordered curation row referencing a real Experience (single source of truth). */
export type FeaturedExperienceItem = {
  __typename?: "FeaturedExperienceItem";
  experience: Experience;
  id: Scalars["ID"]["output"];
  position: Scalars["Int"]["output"];
};

export type FeaturedExperiencesBlock = ContentBlock & {
  __typename?: "FeaturedExperiencesBlock";
  id: Scalars["ID"]["output"];
  isEnabled: Scalars["Boolean"]["output"];
  items: Array<FeaturedExperienceItem>;
  position: Scalars["Int"]["output"];
  title: Scalars["String"]["output"];
  type: PlatformBlockType;
};

export type HeroBlock = ContentBlock & {
  __typename?: "HeroBlock";
  ctaLabel?: Maybe<Scalars["String"]["output"]>;
  ctaTarget?: Maybe<Scalars["String"]["output"]>;
  eyebrow?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  image?: Maybe<Media>;
  isEnabled: Scalars["Boolean"]["output"];
  mobileImage?: Maybe<Media>;
  position: Scalars["Int"]["output"];
  subtitle?: Maybe<Scalars["String"]["output"]>;
  title: Scalars["String"]["output"];
  type: PlatformBlockType;
};

export type Homepage = {
  __typename?: "Homepage";
  featuredExperiences: Array<Experience>;
  featuredHotels: Array<Hotel>;
  featuredReviews: Array<Review>;
  featuredRoomTypes: Array<RoomType>;
};

export type Hotel = {
  __typename?: "Hotel";
  addressLine1?: Maybe<Scalars["String"]["output"]>;
  addressLine2?: Maybe<Scalars["String"]["output"]>;
  amenities: Array<Amenity>;
  averageRating?: Maybe<Scalars["Float"]["output"]>;
  brand?: Maybe<Scalars["String"]["output"]>;
  checkInTime?: Maybe<Scalars["String"]["output"]>;
  checkOutTime?: Maybe<Scalars["String"]["output"]>;
  city?: Maybe<Scalars["String"]["output"]>;
  countryCode?: Maybe<Scalars["String"]["output"]>;
  defaultCurrency: Scalars["String"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  fromPricePerNight?: Maybe<Scalars["Int"]["output"]>;
  hotelType?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  latitude?: Maybe<Scalars["Float"]["output"]>;
  longitude?: Maybe<Scalars["Float"]["output"]>;
  media: Array<Media>;
  name: Scalars["String"]["output"];
  phone?: Maybe<Scalars["String"]["output"]>;
  roomTypes: Array<RoomType>;
  starRating?: Maybe<Scalars["Int"]["output"]>;
  status: HotelStatus;
};

export type HotelDetails = {
  __typename?: "HotelDetails";
  averageRating?: Maybe<Scalars["Float"]["output"]>;
  experiences: Array<Experience>;
  faqs: Array<Faq>;
  hotel: Hotel;
  policies: Array<HotelPolicy>;
  restaurants: Array<Restaurant>;
  reviews: ReviewPage;
  reviewsCount: Scalars["Int"]["output"];
};

export type HotelPolicy = {
  __typename?: "HotelPolicy";
  hotelId: Scalars["ID"]["output"];
  icon?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  sortOrder: Scalars["Int"]["output"];
  value: Scalars["String"]["output"];
};

export type HotelPolicyInput = {
  icon?: InputMaybe<Scalars["String"]["input"]>;
  name: Scalars["String"]["input"];
  sortOrder?: InputMaybe<Scalars["Int"]["input"]>;
  value: Scalars["String"]["input"];
};

export type HotelSearchInput = {
  page?: InputMaybe<PageInput>;
  query?: InputMaybe<Scalars["String"]["input"]>;
  sort?: InputMaybe<HotelSort>;
};

export type HotelSearchResult = {
  __typename?: "HotelSearchResult";
  items: Array<Hotel>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export enum HotelSort {
  NameAsc = "NAME_ASC",
  PriceAsc = "PRICE_ASC",
  RatingDesc = "RATING_DESC",
}

export enum HotelStatus {
  Active = "active",
  Draft = "draft",
  Inactive = "inactive",
}

export type Invoice = {
  __typename?: "Invoice";
  billingName: Scalars["String"]["output"];
  currencyCode: Scalars["String"]["output"];
  discountAmount: Scalars["Float"]["output"];
  feeAmount: Scalars["Float"]["output"];
  id: Scalars["ID"]["output"];
  invoiceNumber: Scalars["String"]["output"];
  issuedAt: Scalars["DateTime"]["output"];
  items: Array<InvoiceItem>;
  reservationId: Scalars["ID"]["output"];
  status: Scalars["String"]["output"];
  subtotalAmount: Scalars["Float"]["output"];
  taxAmount: Scalars["Float"]["output"];
  totalAmount: Scalars["Float"]["output"];
};

export type InvoiceItem = {
  __typename?: "InvoiceItem";
  description: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  itemType: Scalars["String"]["output"];
  quantity: Scalars["Float"]["output"];
  totalPrice: Scalars["Float"]["output"];
  unitPrice: Scalars["Float"]["output"];
};

export type InvoicePage = {
  __typename?: "InvoicePage";
  items: Array<Invoice>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type LoginInput = {
  email: Scalars["String"]["input"];
  password: Scalars["String"]["input"];
};

export type Me = {
  __typename?: "Me";
  email: Scalars["String"]["output"];
  firstName?: Maybe<Scalars["String"]["output"]>;
  hotelIds: Array<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
  lastName?: Maybe<Scalars["String"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
  roles: Array<Scalars["String"]["output"]>;
};

export type Media = {
  __typename?: "Media";
  altText?: Maybe<Scalars["String"]["output"]>;
  category?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  isPrimary: Scalars["Boolean"]["output"];
  sortOrder: Scalars["Int"]["output"];
  url: Scalars["String"]["output"];
};

export type MediaInput = {
  altText?: InputMaybe<Scalars["String"]["input"]>;
  category?: InputMaybe<Scalars["String"]["input"]>;
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortOrder?: InputMaybe<Scalars["Int"]["input"]>;
  url: Scalars["String"]["input"];
};

export type Notification = {
  __typename?: "Notification";
  attempts: Scalars["Int"]["output"];
  body?: Maybe<Scalars["String"]["output"]>;
  channel: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  hotelId?: Maybe<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
  provider?: Maybe<Scalars["String"]["output"]>;
  recipientId: Scalars["ID"]["output"];
  recipientType: Scalars["String"]["output"];
  sentAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: Scalars["String"]["output"];
  subject?: Maybe<Scalars["String"]["output"]>;
  type: Scalars["String"]["output"];
};

export type NotificationPage = {
  __typename?: "NotificationPage";
  items: Array<Notification>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type Offer = {
  __typename?: "Offer";
  appliesToAllRatePlans: Scalars["Boolean"]["output"];
  appliesToAllRoomTypes: Scalars["Boolean"]["output"];
  bookingWindowEnd?: Maybe<Scalars["LocalDate"]["output"]>;
  bookingWindowStart?: Maybe<Scalars["LocalDate"]["output"]>;
  code: Scalars["String"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  discountType: Scalars["String"]["output"];
  discountValue: Scalars["Float"]["output"];
  id: Scalars["ID"]["output"];
  minNights?: Maybe<Scalars["Int"]["output"]>;
  name: Scalars["String"]["output"];
  stackable: Scalars["Boolean"]["output"];
  status: PromotionStatus;
  stayWindowEnd?: Maybe<Scalars["LocalDate"]["output"]>;
  stayWindowStart?: Maybe<Scalars["LocalDate"]["output"]>;
};

export type PageInput = {
  page?: InputMaybe<Scalars["Int"]["input"]>;
  size?: InputMaybe<Scalars["Int"]["input"]>;
};

export type Payment = {
  __typename?: "Payment";
  amount: Scalars["Float"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  currencyCode: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  provider: Scalars["String"]["output"];
  providerReference?: Maybe<Scalars["String"]["output"]>;
  reservationId: Scalars["ID"]["output"];
  status: PaymentStatus;
};

export type PaymentPage = {
  __typename?: "PaymentPage";
  items: Array<Payment>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export enum PaymentStatus {
  Authorized = "authorized",
  Captured = "captured",
  Failed = "failed",
  PartiallyRefunded = "partially_refunded",
  Pending = "pending",
  Refunded = "refunded",
}

/** The collection / brand tenant; identity + site-level content blocks. */
export type Platform = {
  __typename?: "Platform";
  contentBlocks: Array<ContentBlock>;
  createdAt: Scalars["DateTime"]["output"];
  defaultCurrency?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  hotels: Array<Hotel>;
  id: Scalars["ID"]["output"];
  media: Array<Media>;
  name: Scalars["String"]["output"];
  slug: Scalars["String"]["output"];
  status: PlatformStatus;
  tagline?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

/** Closed block-type enum; new types require a migration + GraphQL type. */
export enum PlatformBlockType {
  Experiences = "EXPERIENCES",
  Hero = "HERO",
}

export enum PlatformStatus {
  Active = "active",
  Draft = "draft",
  Inactive = "inactive",
}

export enum PromotionStatus {
  Active = "active",
  Expired = "expired",
  Inactive = "inactive",
}

export type Query = {
  __typename?: "Query";
  adminAmenities: Array<Amenity>;
  adminAuditLogs: AuditLogPage;
  adminDashboard: AdminDashboard;
  adminGuests: AdminGuestPage;
  adminHotel?: Maybe<AdminHotel>;
  adminHotels: AdminHotelPage;
  adminInvoices: InvoicePage;
  adminNotifications: NotificationPage;
  adminPayments: PaymentPage;
  adminPromotions: Array<AdminPromotion>;
  adminReservations: ReservationPage;
  adminReviews: ReviewPage;
  adminRoles: Array<AdminRole>;
  adminUsers: Array<AdminUser>;
  availability: Array<RoomAvailability>;
  canonicalHotel: Hotel;
  countries: Array<Country>;
  experiences: Array<Experience>;
  extras: Array<Extra>;
  faqs: Array<Faq>;
  /** Curated homepage sections for the guest frontend (database-driven flags). */
  homepage: Homepage;
  hotel?: Maybe<Hotel>;
  hotelDetails?: Maybe<HotelDetails>;
  hotels: HotelSearchResult;
  me: Me;
  myReservations: Array<Reservation>;
  offers: Array<Offer>;
  platform: Platform;
  quote: Quote;
  rates: Array<RoomRateOption>;
  reservation?: Maybe<Reservation>;
  restaurants: Array<Restaurant>;
  reviews: ReviewPage;
  roomType?: Maybe<RoomType>;
  roomTypes: Array<RoomType>;
  staySearch: Array<StaySearchRoom>;
};

export type QueryAdminAuditLogsArgs = {
  page?: InputMaybe<PageInput>;
};

export type QueryAdminDashboardArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryAdminGuestsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
  query?: InputMaybe<Scalars["String"]["input"]>;
};

export type QueryAdminHotelArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryAdminHotelsArgs = {
  page?: InputMaybe<PageInput>;
};

export type QueryAdminInvoicesArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
};

export type QueryAdminNotificationsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
};

export type QueryAdminPaymentsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
};

export type QueryAdminPromotionsArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryAdminReservationsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
  status?: InputMaybe<ReservationStatus>;
};

export type QueryAdminReviewsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
  status?: InputMaybe<ReviewModerationStatus>;
};

export type QueryAvailabilityArgs = {
  input: AvailabilityInput;
};

export type QueryExperiencesArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryExtrasArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryFaqsArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryHotelArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryHotelDetailsArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryHotelsArgs = {
  input?: InputMaybe<HotelSearchInput>;
};

export type QueryOffersArgs = {
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type QueryPlatformArgs = {
  slug: Scalars["String"]["input"];
};

export type QueryQuoteArgs = {
  input: QuoteInput;
};

export type QueryRatesArgs = {
  input: RatesInput;
};

export type QueryReservationArgs = {
  input: ReservationLookupInput;
};

export type QueryRestaurantsArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryReviewsArgs = {
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
};

export type QueryRoomTypeArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryRoomTypesArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type QueryStaySearchArgs = {
  input: StaySearchInput;
};

export type Quote = {
  __typename?: "Quote";
  amountDueNow: Scalars["Float"]["output"];
  charges: Array<QuoteChargeLine>;
  currencyCode: Scalars["String"]["output"];
  discountAmount: Scalars["Float"]["output"];
  extras: Array<QuoteExtraLine>;
  feeAmount: Scalars["Float"]["output"];
  lines: Array<QuoteLine>;
  message?: Maybe<Scalars["String"]["output"]>;
  originalTotal: Scalars["Float"]["output"];
  paymentTiming: Scalars["String"]["output"];
  subtotalAmount: Scalars["Float"]["output"];
  taxAmount: Scalars["Float"]["output"];
  totalAmount: Scalars["Float"]["output"];
  valid: Scalars["Boolean"]["output"];
};

export type QuoteChargeLine = {
  __typename?: "QuoteChargeLine";
  amount: Scalars["Float"]["output"];
  chargeType: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
  taxFeeTypeId: Scalars["ID"]["output"];
};

export type QuoteExtraInput = {
  extraId: Scalars["ID"]["input"];
  quantity: Scalars["Int"]["input"];
};

export type QuoteExtraLine = {
  __typename?: "QuoteExtraLine";
  extraId: Scalars["ID"]["output"];
  quantity: Scalars["Int"]["output"];
  totalPrice: Scalars["Float"]["output"];
  unitPrice: Scalars["Float"]["output"];
};

export type QuoteInput = {
  adults: Scalars["Int"]["input"];
  checkInDate: Scalars["LocalDate"]["input"];
  checkOutDate: Scalars["LocalDate"]["input"];
  children: Scalars["Int"]["input"];
  currencyCode: Scalars["String"]["input"];
  extras?: InputMaybe<Array<QuoteExtraInput>>;
  hotelId: Scalars["ID"]["input"];
  promoCode?: InputMaybe<Scalars["String"]["input"]>;
  rooms: Array<QuoteRoomInput>;
};

export type QuoteLine = {
  __typename?: "QuoteLine";
  nights: Scalars["Int"]["output"];
  ratePerNight: Scalars["Float"]["output"];
  ratePlanId: Scalars["ID"]["output"];
  roomTypeId: Scalars["ID"]["output"];
  subtotalAmount: Scalars["Float"]["output"];
};

export type QuoteRoomInput = {
  ratePlanId: Scalars["ID"]["input"];
  roomTypeId: Scalars["ID"]["input"];
};

export type RatePlan = {
  __typename?: "RatePlan";
  cancellationDeadlineDays?: Maybe<Scalars["Int"]["output"]>;
  cancellationPenaltyType?: Maybe<Scalars["String"]["output"]>;
  cancellationPenaltyValue?: Maybe<Scalars["Float"]["output"]>;
  cancellationPolicy?: Maybe<Scalars["String"]["output"]>;
  code: Scalars["String"]["output"];
  currencyCode: Scalars["String"]["output"];
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  isRefundable: Scalars["Boolean"]["output"];
  maxStay?: Maybe<Scalars["Int"]["output"]>;
  mealPlan?: Maybe<Scalars["String"]["output"]>;
  minStay?: Maybe<Scalars["Int"]["output"]>;
  name: Scalars["String"]["output"];
  paymentTiming: Scalars["String"]["output"];
  status: RatePlanStatus;
};

export type RatePlanPriceInfo = {
  __typename?: "RatePlanPriceInfo";
  id: Scalars["ID"]["output"];
  priceAmount: Scalars["Float"]["output"];
  validFrom: Scalars["LocalDate"]["output"];
  validTo: Scalars["LocalDate"]["output"];
};

export type RatePlanPriceInput = {
  priceAmount: Scalars["Float"]["input"];
  validFrom: Scalars["LocalDate"]["input"];
  validTo: Scalars["LocalDate"]["input"];
};

export enum RatePlanStatus {
  Active = "active",
  Inactive = "inactive",
}

export type RatesInput = {
  adults: Scalars["Int"]["input"];
  checkInDate: Scalars["LocalDate"]["input"];
  checkOutDate: Scalars["LocalDate"]["input"];
  children: Scalars["Int"]["input"];
  hotelId: Scalars["ID"]["input"];
  roomTypeId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type RegisterInput = {
  email: Scalars["String"]["input"];
  firstName: Scalars["String"]["input"];
  lastName: Scalars["String"]["input"];
  password: Scalars["String"]["input"];
};

export type Reservation = {
  __typename?: "Reservation";
  adults: Scalars["Int"]["output"];
  cancellation?: Maybe<ReservationCancellation>;
  charges: Array<ReservationChargeLine>;
  checkInDate: Scalars["LocalDate"]["output"];
  checkOutDate: Scalars["LocalDate"]["output"];
  children: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  currencyCode: Scalars["String"]["output"];
  discountAmount: Scalars["Float"]["output"];
  extras: Array<ReservationExtraLine>;
  feeAmount: Scalars["Float"]["output"];
  guest: ReservationGuestInfo;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  notes?: Maybe<Scalars["String"]["output"]>;
  paymentStatus: PaymentStatus;
  reference: Scalars["String"]["output"];
  roomLines: Array<ReservationRoomLine>;
  source: Scalars["String"]["output"];
  status: ReservationStatus;
  subtotalAmount: Scalars["Float"]["output"];
  taxAmount: Scalars["Float"]["output"];
  totalAmount: Scalars["Float"]["output"];
};

export type ReservationCancellation = {
  __typename?: "ReservationCancellation";
  cancelledAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  isRefundable: Scalars["Boolean"]["output"];
  penaltyAmount: Scalars["Float"]["output"];
  reason?: Maybe<Scalars["String"]["output"]>;
  reasonNote?: Maybe<Scalars["String"]["output"]>;
  refundAmount: Scalars["Float"]["output"];
};

export type ReservationChargeLine = {
  __typename?: "ReservationChargeLine";
  amount: Scalars["Float"]["output"];
  chargeType: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
};

export type ReservationExtraInput = {
  extraId: Scalars["ID"]["input"];
  quantity: Scalars["Int"]["input"];
};

export type ReservationExtraLine = {
  __typename?: "ReservationExtraLine";
  extraId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  quantity: Scalars["Int"]["output"];
  totalPrice: Scalars["Float"]["output"];
  unitPrice: Scalars["Float"]["output"];
};

export type ReservationGuestInfo = {
  __typename?: "ReservationGuestInfo";
  countryCode?: Maybe<Scalars["String"]["output"]>;
  email?: Maybe<Scalars["String"]["output"]>;
  firstName: Scalars["String"]["output"];
  id?: Maybe<Scalars["ID"]["output"]>;
  lastName: Scalars["String"]["output"];
  phone?: Maybe<Scalars["String"]["output"]>;
};

export type ReservationGuestInput = {
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  email: Scalars["String"]["input"];
  firstName: Scalars["String"]["input"];
  lastName: Scalars["String"]["input"];
  phone?: InputMaybe<Scalars["String"]["input"]>;
};

export type ReservationLookupInput = {
  email: Scalars["String"]["input"];
  reference: Scalars["String"]["input"];
};

export type ReservationPage = {
  __typename?: "ReservationPage";
  items: Array<Reservation>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type ReservationRoomInput = {
  ratePlanId: Scalars["ID"]["input"];
  roomTypeId: Scalars["ID"]["input"];
};

export type ReservationRoomLine = {
  __typename?: "ReservationRoomLine";
  checkInDate: Scalars["LocalDate"]["output"];
  checkOutDate: Scalars["LocalDate"]["output"];
  freeCancellationUntil?: Maybe<Scalars["LocalDate"]["output"]>;
  id: Scalars["ID"]["output"];
  isRefundable: Scalars["Boolean"]["output"];
  nights: Scalars["Int"]["output"];
  paymentTiming: Scalars["String"]["output"];
  ratePerNight: Scalars["Float"]["output"];
  ratePlanId: Scalars["ID"]["output"];
  ratePlanName?: Maybe<Scalars["String"]["output"]>;
  roomTypeId: Scalars["ID"]["output"];
  roomTypeImageUrl?: Maybe<Scalars["String"]["output"]>;
  roomTypeName: Scalars["String"]["output"];
  status: Scalars["String"]["output"];
  subtotalAmount: Scalars["Float"]["output"];
};

export enum ReservationStatus {
  Cancelled = "cancelled",
  CheckedIn = "checked_in",
  CheckedOut = "checked_out",
  Confirmed = "confirmed",
  Modified = "modified",
  NoShow = "no_show",
  Pending = "pending",
}

export type Restaurant = {
  __typename?: "Restaurant";
  cuisineType?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  location?: Maybe<Scalars["String"]["output"]>;
  name: Scalars["String"]["output"];
  openingHours?: Maybe<Scalars["String"]["output"]>;
  sortOrder: Scalars["Int"]["output"];
};

export type Review = {
  __typename?: "Review";
  authorName?: Maybe<Scalars["String"]["output"]>;
  comment?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  moderationStatus: Scalars["String"]["output"];
  rating: Scalars["Int"]["output"];
  responseText?: Maybe<Scalars["String"]["output"]>;
  title?: Maybe<Scalars["String"]["output"]>;
};

export enum ReviewModerationStatus {
  Approved = "approved",
  Pending = "pending",
  Rejected = "rejected",
}

export type ReviewPage = {
  __typename?: "ReviewPage";
  items: Array<Review>;
  page: Scalars["Int"]["output"];
  size: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type Room = {
  __typename?: "Room";
  createdAt: Scalars["DateTime"]["output"];
  floor?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  housekeepingStatus: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  maintenanceStatus: Scalars["String"]["output"];
  roomNumber: Scalars["String"]["output"];
  roomTypeId: Scalars["ID"]["output"];
  status: Scalars["String"]["output"];
};

export type RoomAvailability = {
  __typename?: "RoomAvailability";
  available: Scalars["Boolean"]["output"];
  capacityFits: Scalars["Boolean"]["output"];
  free: Scalars["Int"]["output"];
  roomTypeId: Scalars["ID"]["output"];
  status: AvailabilityStatus;
};

export type RoomRateOption = {
  __typename?: "RoomRateOption";
  cancellationPolicy?: Maybe<Scalars["String"]["output"]>;
  currencyCode: Scalars["String"]["output"];
  depositPercentage?: Maybe<Scalars["Float"]["output"]>;
  isRefundable: Scalars["Boolean"]["output"];
  mealPlan?: Maybe<Scalars["String"]["output"]>;
  paymentTiming: Scalars["String"]["output"];
  pricePerNight: Scalars["Float"]["output"];
  ratePlanCode: Scalars["String"]["output"];
  ratePlanId: Scalars["ID"]["output"];
  ratePlanName: Scalars["String"]["output"];
  roomTypeId: Scalars["ID"]["output"];
};

export type RoomType = {
  __typename?: "RoomType";
  amenities: Array<Amenity>;
  bedConfiguration?: Maybe<Scalars["String"]["output"]>;
  currencyCode?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  hotelName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  maxAdults: Scalars["Int"]["output"];
  maxChildren: Scalars["Int"]["output"];
  media: Array<Media>;
  name: Scalars["String"]["output"];
  pricePerNight?: Maybe<Scalars["Int"]["output"]>;
  sizeSqm?: Maybe<Scalars["Float"]["output"]>;
  slug: Scalars["String"]["output"];
  status: RoomTypeStatus;
  viewType?: Maybe<Scalars["String"]["output"]>;
};

export type RoomTypeRatePlanInfo = {
  __typename?: "RoomTypeRatePlanInfo";
  currencyCode: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  prices: Array<RatePlanPriceInfo>;
  ratePlanId: Scalars["ID"]["output"];
  roomTypeId: Scalars["ID"]["output"];
  roomTypeName: Scalars["String"]["output"];
};

export enum RoomTypeStatus {
  Active = "active",
  Draft = "draft",
  Inactive = "inactive",
}

export type StaySearchInput = {
  adults: Scalars["Int"]["input"];
  checkInDate: Scalars["LocalDate"]["input"];
  checkOutDate: Scalars["LocalDate"]["input"];
  children: Scalars["Int"]["input"];
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
  rooms: Scalars["Int"]["input"];
};

export type StaySearchRoom = {
  __typename?: "StaySearchRoom";
  capacityFits: Scalars["Boolean"]["output"];
  hotelId: Scalars["ID"]["output"];
  hotelName: Scalars["String"]["output"];
  rates: Array<RoomRateOption>;
  roomType: RoomType;
  status: AvailabilityStatus;
};

export type UpdateProfileInput = {
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
};

export type AdminAuditLogsQueryVariables = Exact<{
  page?: InputMaybe<PageInput>;
}>;

export type AdminAuditLogsQuery = {
  __typename?: "Query";
  adminAuditLogs: {
    __typename?: "AuditLogPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "AuditLogEntry";
      id: string;
      actorUserId?: string | null;
      actorEmail?: string | null;
      action: string;
      resourceType: string;
      resourceId: string;
      hotelId?: string | null;
      result: string;
      metadata?: string | null;
      createdAt: string;
    }>;
  };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
  __typename?: "Query";
  me: {
    __typename?: "Me";
    id: string;
    email: string;
    roles: Array<string>;
    hotelIds: Array<string>;
  };
};

export type AdminDashboardQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
}>;

export type AdminDashboardQuery = {
  __typename?: "Query";
  adminDashboard: {
    __typename?: "AdminDashboard";
    hotelId: string;
    hotelName: string;
    arrivalsToday: number;
    departuresToday: number;
    inHouseToday: number;
    soldOutTonight: number;
    occupancyPct: number;
    availableTonight: number;
    revenueTotal: number;
    pendingPayments: number;
    pendingInvoices: number;
    recentReservations: Array<{
      __typename?: "Reservation";
      id: string;
      reference: string;
      status: ReservationStatus;
      paymentStatus: PaymentStatus;
      checkInDate: string;
      checkOutDate: string;
      totalAmount: number;
      currencyCode: string;
      guest: {
        __typename?: "ReservationGuestInfo";
        firstName: string;
        lastName: string;
      };
    }>;
  };
};

export type AdminGuestsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  query?: InputMaybe<Scalars["String"]["input"]>;
  page?: InputMaybe<PageInput>;
}>;

export type AdminGuestsQuery = {
  __typename?: "Query";
  adminGuests: {
    __typename?: "AdminGuestPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "AdminGuest";
      id: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      countryCode?: string | null;
      reservationsCount: number;
      totalSpent: number;
      lastStayDate?: string | null;
    }>;
  };
};

export type AdminHotelsQueryVariables = Exact<{
  page?: InputMaybe<PageInput>;
}>;

export type AdminHotelsQuery = {
  __typename?: "Query";
  adminHotels: {
    __typename?: "AdminHotelPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "AdminHotelSummary";
      id: string;
      name: string;
      brand?: string | null;
      city?: string | null;
      countryCode?: string | null;
      status: HotelStatus;
      starRating?: number | null;
      roomTypeCount: number;
      activeReservations: number;
    }>;
  };
};

export type AdminHotelWorkspaceQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
}>;

export type AdminHotelWorkspaceQuery = {
  __typename?: "Query";
  adminHotel?: {
    __typename?: "AdminHotel";
    id: string;
    name: string;
    status: HotelStatus;
    hotel: {
      __typename?: "Hotel";
      id: string;
      name: string;
      brand?: string | null;
      description?: string | null;
      hotelType?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      countryCode?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      phone?: string | null;
      email?: string | null;
      starRating?: number | null;
      checkInTime?: string | null;
      checkOutTime?: string | null;
      defaultCurrency: string;
      status: HotelStatus;
    };
    amenities: Array<{
      __typename?: "Amenity";
      id: string;
      name: string;
      icon?: string | null;
      category?: string | null;
    }>;
    media: Array<{
      __typename?: "Media";
      id: string;
      url: string;
      altText?: string | null;
      category?: string | null;
      isPrimary: boolean;
      sortOrder: number;
    }>;
    roomTypes: Array<{
      __typename?: "AdminRoomType";
      id: string;
      hotelId: string;
      name: string;
      description?: string | null;
      maxAdults: number;
      maxChildren: number;
      bedConfiguration?: string | null;
      sizeSqm?: number | null;
      viewType?: string | null;
      status: RoomTypeStatus;
      amenities: Array<{
        __typename?: "Amenity";
        id: string;
        name: string;
        category?: string | null;
      }>;
      media: Array<{
        __typename?: "Media";
        id: string;
        url: string;
        altText?: string | null;
        isPrimary: boolean;
      }>;
      rooms: Array<{
        __typename?: "Room";
        id: string;
        roomNumber: string;
        floor?: string | null;
        status: string;
        housekeepingStatus: string;
        maintenanceStatus: string;
      }>;
    }>;
    ratePlans: Array<{
      __typename?: "AdminRatePlan";
      id: string;
      hotelId: string;
      name: string;
      code: string;
      currencyCode: string;
      mealPlan?: string | null;
      cancellationPolicy?: string | null;
      paymentPolicy?: string | null;
      isRefundable: boolean;
      cancellationDeadlineDays?: number | null;
      cancellationPenaltyType?: string | null;
      cancellationPenaltyValue?: number | null;
      paymentTiming: string;
      depositPercentage?: number | null;
      minStay?: number | null;
      maxStay?: number | null;
      status: RatePlanStatus;
      links: Array<{
        __typename?: "RoomTypeRatePlanInfo";
        id: string;
        roomTypeId: string;
        roomTypeName: string;
        currencyCode: string;
        prices: Array<{
          __typename?: "RatePlanPriceInfo";
          id: string;
          validFrom: string;
          validTo: string;
          priceAmount: number;
        }>;
      }>;
    }>;
    availability: Array<{
      __typename?: "AvailabilityRow";
      id: string;
      roomTypeId: string;
      stayDate: string;
      totalInventory: number;
      roomsSold: number;
      outOfOrder: number;
      blocked: number;
      free: number;
    }>;
    experiences: Array<{
      __typename?: "Experience";
      id: string;
      name: string;
      category?: string | null;
      priceAmount?: number | null;
      currencyCode?: string | null;
    }>;
    restaurants: Array<{
      __typename?: "Restaurant";
      id: string;
      name: string;
      cuisineType?: string | null;
    }>;
    extras: Array<{
      __typename?: "Extra";
      id: string;
      name: string;
      pricingModel: ExtraPricingModel;
      priceAmount: number;
      currencyCode: string;
    }>;
  } | null;
};

export type AdminAmenitiesQueryVariables = Exact<{ [key: string]: never }>;

export type AdminAmenitiesQuery = {
  __typename?: "Query";
  adminAmenities: Array<{
    __typename?: "Amenity";
    id: string;
    name: string;
    icon?: string | null;
    category?: string | null;
  }>;
};

export type AdminInvoicesQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
}>;

export type AdminInvoicesQuery = {
  __typename?: "Query";
  adminInvoices: {
    __typename?: "InvoicePage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "Invoice";
      id: string;
      invoiceNumber: string;
      reservationId: string;
      billingName: string;
      currencyCode: string;
      subtotalAmount: number;
      discountAmount: number;
      taxAmount: number;
      feeAmount: number;
      totalAmount: number;
      status: string;
      issuedAt: string;
      items: Array<{
        __typename?: "InvoiceItem";
        id: string;
        description: string;
        itemType: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    }>;
  };
};

export type AdminNotificationsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
}>;

export type AdminNotificationsQuery = {
  __typename?: "Query";
  adminNotifications: {
    __typename?: "NotificationPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "Notification";
      id: string;
      hotelId?: string | null;
      recipientType: string;
      recipientId: string;
      channel: string;
      type: string;
      subject?: string | null;
      body?: string | null;
      status: string;
      provider?: string | null;
      attempts: number;
      sentAt?: string | null;
      createdAt: string;
    }>;
  };
};

export type AdminPaymentsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  page?: InputMaybe<PageInput>;
}>;

export type AdminPaymentsQuery = {
  __typename?: "Query";
  adminPayments: {
    __typename?: "PaymentPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "Payment";
      id: string;
      reservationId: string;
      amount: number;
      currencyCode: string;
      status: PaymentStatus;
      provider: string;
      providerReference?: string | null;
      createdAt: string;
    }>;
  };
};

export type AdminPromotionsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
}>;

export type AdminPromotionsQuery = {
  __typename?: "Query";
  adminPromotions: Array<{
    __typename?: "AdminPromotion";
    id: string;
    hotelId?: string | null;
    code: string;
    name: string;
    description?: string | null;
    discountType: string;
    discountValue: number;
    bookingWindowStart?: string | null;
    bookingWindowEnd?: string | null;
    stayWindowStart?: string | null;
    stayWindowEnd?: string | null;
    minNights?: number | null;
    maxUsageTotal?: number | null;
    maxUsagePerGuest?: number | null;
    stackable: boolean;
    appliesToAllRoomTypes: boolean;
    appliesToAllRatePlans: boolean;
    applicableDaysOfWeek?: string | null;
    status: PromotionStatus;
    createdAt: string;
  }>;
};

export type AdminReservationsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  status?: InputMaybe<ReservationStatus>;
  page?: InputMaybe<PageInput>;
}>;

export type AdminReservationsQuery = {
  __typename?: "Query";
  adminReservations: {
    __typename?: "ReservationPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "Reservation";
      id: string;
      reference: string;
      status: ReservationStatus;
      paymentStatus: PaymentStatus;
      checkInDate: string;
      checkOutDate: string;
      adults: number;
      children: number;
      currencyCode: string;
      totalAmount: number;
      source: string;
      createdAt: string;
      guest: {
        __typename?: "ReservationGuestInfo";
        id?: string | null;
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        countryCode?: string | null;
      };
      roomLines: Array<{
        __typename?: "ReservationRoomLine";
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        checkInDate: string;
        checkOutDate: string;
        nights: number;
        ratePerNight: number;
        subtotalAmount: number;
        status: string;
      }>;
      extras: Array<{
        __typename?: "ReservationExtraLine";
        id: string;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      charges: Array<{
        __typename?: "ReservationChargeLine";
        id: string;
        name: string;
        chargeType: string;
        amount: number;
      }>;
      cancellation?: {
        __typename?: "ReservationCancellation";
        id: string;
        reason?: string | null;
        reasonNote?: string | null;
        isRefundable: boolean;
        penaltyAmount: number;
        refundAmount: number;
        cancelledAt: string;
      } | null;
    }>;
  };
};

export type AdminReviewsQueryVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  status?: InputMaybe<ReviewModerationStatus>;
  page?: InputMaybe<PageInput>;
}>;

export type AdminReviewsQuery = {
  __typename?: "Query";
  adminReviews: {
    __typename?: "ReviewPage";
    total: number;
    page: number;
    size: number;
    items: Array<{
      __typename?: "Review";
      id: string;
      hotelId: string;
      authorName?: string | null;
      rating: number;
      title?: string | null;
      comment?: string | null;
      moderationStatus: string;
      responseText?: string | null;
      createdAt: string;
    }>;
  };
};

export type AdminUsersQueryVariables = Exact<{ [key: string]: never }>;

export type AdminUsersQuery = {
  __typename?: "Query";
  adminUsers: Array<{
    __typename?: "AdminUser";
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    status: string;
    lastLoginAt?: string | null;
    createdAt: string;
    roles: Array<{
      __typename?: "AdminUserRole";
      id: string;
      roleName: string;
      hotelId?: string | null;
      hotelName?: string | null;
    }>;
  }>;
};

export type AdminRolesQueryVariables = Exact<{ [key: string]: never }>;

export type AdminRolesQuery = {
  __typename?: "Query";
  adminRoles: Array<{
    __typename?: "AdminRole";
    name: string;
    hotelScoped: boolean;
  }>;
};

export const AdminAuditLogsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminAuditLogs" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminAuditLogs" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "actorUserId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "actorEmail" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "action" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "resourceType" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "resourceId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "result" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "metadata" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "createdAt" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminAuditLogsQuery, AdminAuditLogsQueryVariables>;
export const MeDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Me" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "me" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "roles" } },
                { kind: "Field", name: { kind: "Name", value: "hotelIds" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const AdminDashboardDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminDashboard" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminDashboard" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "hotelId" } },
                { kind: "Field", name: { kind: "Name", value: "hotelName" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "arrivalsToday" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "departuresToday" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "inHouseToday" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "soldOutTonight" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "occupancyPct" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "availableTonight" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "revenueTotal" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pendingPayments" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pendingInvoices" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recentReservations" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "reference" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "paymentStatus" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkInDate" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkOutDate" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "totalAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "guest" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "firstName" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "lastName" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminDashboardQuery, AdminDashboardQueryVariables>;
export const AdminGuestsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminGuests" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "query" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminGuests" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "query" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "query" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "firstName" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "lastName" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "email" } },
                      { kind: "Field", name: { kind: "Name", value: "phone" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "countryCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "reservationsCount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "totalSpent" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "lastStayDate" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminGuestsQuery, AdminGuestsQueryVariables>;
export const AdminHotelsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminHotels" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminHotels" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "brand" } },
                      { kind: "Field", name: { kind: "Name", value: "city" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "countryCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "starRating" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "roomTypeCount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "activeReservations" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminHotelsQuery, AdminHotelsQueryVariables>;
export const AdminHotelWorkspaceDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminHotelWorkspace" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminHotel" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "hotel" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "brand" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "description" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelType" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "addressLine1" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "addressLine2" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "city" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "countryCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "latitude" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "longitude" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "phone" } },
                      { kind: "Field", name: { kind: "Name", value: "email" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "starRating" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkInTime" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkOutTime" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "defaultCurrency" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "amenities" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "icon" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "category" },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "media" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "url" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "altText" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "category" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "isPrimary" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "sortOrder" },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "roomTypes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "description" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "maxAdults" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "maxChildren" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "bedConfiguration" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "sizeSqm" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "viewType" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "amenities" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "name" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "category" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "media" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "url" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "altText" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "isPrimary" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "rooms" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "roomNumber" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "floor" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "status" },
                            },
                            {
                              kind: "Field",
                              name: {
                                kind: "Name",
                                value: "housekeepingStatus",
                              },
                            },
                            {
                              kind: "Field",
                              name: {
                                kind: "Name",
                                value: "maintenanceStatus",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "ratePlans" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "mealPlan" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "cancellationPolicy" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "paymentPolicy" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "isRefundable" },
                      },
                      {
                        kind: "Field",
                        name: {
                          kind: "Name",
                          value: "cancellationDeadlineDays",
                        },
                      },
                      {
                        kind: "Field",
                        name: {
                          kind: "Name",
                          value: "cancellationPenaltyType",
                        },
                      },
                      {
                        kind: "Field",
                        name: {
                          kind: "Name",
                          value: "cancellationPenaltyValue",
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "paymentTiming" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "depositPercentage" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "minStay" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "maxStay" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "links" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "roomTypeId" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "roomTypeName" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "currencyCode" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "prices" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "id" },
                                  },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "validFrom" },
                                  },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "validTo" },
                                  },
                                  {
                                    kind: "Field",
                                    name: {
                                      kind: "Name",
                                      value: "priceAmount",
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "availability" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "roomTypeId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "stayDate" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "totalInventory" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "roomsSold" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "outOfOrder" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "blocked" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "free" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "experiences" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "category" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "priceAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "restaurants" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "cuisineType" },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "extras" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "pricingModel" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "priceAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AdminHotelWorkspaceQuery,
  AdminHotelWorkspaceQueryVariables
>;
export const AdminAmenitiesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminAmenities" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminAmenities" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "icon" } },
                { kind: "Field", name: { kind: "Name", value: "category" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminAmenitiesQuery, AdminAmenitiesQueryVariables>;
export const AdminInvoicesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminInvoices" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminInvoices" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "invoiceNumber" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "reservationId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "billingName" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "subtotalAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "discountAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "taxAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "feeAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "totalAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "issuedAt" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "items" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "description" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "itemType" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "quantity" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "unitPrice" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "totalPrice" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminInvoicesQuery, AdminInvoicesQueryVariables>;
export const AdminNotificationsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminNotifications" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminNotifications" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "recipientType" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "recipientId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "channel" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "type" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "subject" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "body" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "provider" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "attempts" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "sentAt" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "createdAt" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AdminNotificationsQuery,
  AdminNotificationsQueryVariables
>;
export const AdminPaymentsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminPayments" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminPayments" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "reservationId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "amount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "provider" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "providerReference" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "createdAt" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminPaymentsQuery, AdminPaymentsQueryVariables>;
export const AdminPromotionsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminPromotions" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminPromotions" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "hotelId" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "discountType" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "discountValue" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "bookingWindowStart" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "bookingWindowEnd" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "stayWindowStart" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "stayWindowEnd" },
                },
                { kind: "Field", name: { kind: "Name", value: "minNights" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "maxUsageTotal" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "maxUsagePerGuest" },
                },
                { kind: "Field", name: { kind: "Name", value: "stackable" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "appliesToAllRoomTypes" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "appliesToAllRatePlans" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "applicableDaysOfWeek" },
                },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AdminPromotionsQuery,
  AdminPromotionsQueryVariables
>;
export const AdminReservationsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminReservations" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "status" },
          },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "ReservationStatus" },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminReservations" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "status" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "status" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "reference" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "status" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "paymentStatus" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkInDate" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "checkOutDate" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "adults" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "children" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "currencyCode" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "totalAmount" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "source" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "createdAt" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "guest" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "firstName" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "lastName" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "email" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "phone" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "countryCode" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "roomLines" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "roomTypeId" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "ratePlanId" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "checkInDate" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "checkOutDate" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "nights" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "ratePerNight" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "subtotalAmount" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "status" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "extras" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "name" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "quantity" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "unitPrice" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "totalPrice" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "charges" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "name" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "chargeType" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "amount" },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "cancellation" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "id" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "reason" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "reasonNote" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "isRefundable" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "penaltyAmount" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "refundAmount" },
                            },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "cancelledAt" },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  AdminReservationsQuery,
  AdminReservationsQueryVariables
>;
export const AdminReviewsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminReviews" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "status" },
          },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "ReviewModerationStatus" },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "page" } },
          type: {
            kind: "NamedType",
            name: { kind: "Name", value: "PageInput" },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminReviews" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "hotelId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "hotelId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "status" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "status" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "page" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "page" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "total" } },
                { kind: "Field", name: { kind: "Name", value: "page" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "items" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "authorName" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "rating" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "title" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "comment" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "moderationStatus" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "responseText" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "createdAt" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminReviewsQuery, AdminReviewsQueryVariables>;
export const AdminUsersDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminUsers" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminUsers" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "firstName" } },
                { kind: "Field", name: { kind: "Name", value: "lastName" } },
                { kind: "Field", name: { kind: "Name", value: "phone" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "lastLoginAt" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "roles" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "roleName" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelId" },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelName" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminUsersQuery, AdminUsersQueryVariables>;
export const AdminRolesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "AdminRoles" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminRoles" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "hotelScoped" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AdminRolesQuery, AdminRolesQueryVariables>;
