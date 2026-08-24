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
  status: RoomTypeStatus;
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
  paymentId: Scalars["ID"]["input"];
};

export type CreatePaymentInput = {
  amount: Scalars["Float"]["input"];
  currencyCode: Scalars["String"]["input"];
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

export type Hotel = {
  __typename?: "Hotel";
  addressLine1?: Maybe<Scalars["String"]["output"]>;
  addressLine2?: Maybe<Scalars["String"]["output"]>;
  amenities: Array<Amenity>;
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
  restaurants: Array<Restaurant>;
  reviews: ReviewPage;
  reviewsCount: Scalars["Int"]["output"];
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
  hotelIds: Array<Scalars["ID"]["output"]>;
  id: Scalars["ID"]["output"];
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

export type Mutation = {
  __typename?: "Mutation";
  adminCancelReservation: Reservation;
  assignRole: AdminUser;
  cancelReservation: ReservationResult;
  capturePayment: Payment;
  createHotel: Hotel;
  createPayment: Payment;
  createPromotion: AdminPromotion;
  createRatePlan: RatePlan;
  createReservation: ReservationResult;
  createReview: Review;
  createRoom: Room;
  createRoomType: RoomType;
  createUser: AdminUser;
  issueInvoice: Invoice;
  linkRoomTypeRatePlan: RoomTypeRatePlanInfo;
  login: AuthPayload;
  moderateReview: Review;
  register: AuthPayload;
  revokeRole: AdminUser;
  setHotelAmenities: Array<Amenity>;
  setHotelMedia: Array<Media>;
  setPromotionStatus: AdminPromotion;
  setRatePlanPrices: Array<RatePlanPriceInfo>;
  setRoomTypeAmenities: Array<Amenity>;
  setRoomTypeMedia: Array<Media>;
  unlinkRoomTypeRatePlan: Scalars["Boolean"]["output"];
  updateAvailability: Array<AvailabilityRow>;
  updateHotel: Hotel;
  updatePromotion: AdminPromotion;
  updateRatePlan: RatePlan;
  updateRoom: Room;
  updateRoomType: RoomType;
};

export type MutationAdminCancelReservationArgs = {
  reasonCode?: InputMaybe<Scalars["String"]["input"]>;
  reasonNote?: InputMaybe<Scalars["String"]["input"]>;
  reservationId: Scalars["ID"]["input"];
};

export type MutationAssignRoleArgs = {
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
  roleName: Scalars["String"]["input"];
  userId: Scalars["ID"]["input"];
};

export type MutationCancelReservationArgs = {
  input: CancelReservationInput;
};

export type MutationCapturePaymentArgs = {
  input: CapturePaymentInput;
};

export type MutationCreateHotelArgs = {
  input: AdminHotelInput;
};

export type MutationCreatePaymentArgs = {
  input: CreatePaymentInput;
};

export type MutationCreatePromotionArgs = {
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
  input: AdminPromotionInput;
};

export type MutationCreateRatePlanArgs = {
  hotelId: Scalars["ID"]["input"];
  input: AdminRatePlanInput;
};

export type MutationCreateReservationArgs = {
  input: CreateReservationInput;
};

export type MutationCreateReviewArgs = {
  input: CreateReviewInput;
};

export type MutationCreateRoomArgs = {
  hotelId: Scalars["ID"]["input"];
  input: AdminRoomInput;
};

export type MutationCreateRoomTypeArgs = {
  hotelId: Scalars["ID"]["input"];
  input: AdminRoomTypeInput;
};

export type MutationCreateUserArgs = {
  input: AdminCreateUserInput;
};

export type MutationIssueInvoiceArgs = {
  input: ReservationLookupInput;
};

export type MutationLinkRoomTypeRatePlanArgs = {
  ratePlanId: Scalars["ID"]["input"];
  roomTypeId: Scalars["ID"]["input"];
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationModerateReviewArgs = {
  id: Scalars["ID"]["input"];
  response?: InputMaybe<Scalars["String"]["input"]>;
  status: ReviewModerationStatus;
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationRevokeRoleArgs = {
  userRoleId: Scalars["ID"]["input"];
};

export type MutationSetHotelAmenitiesArgs = {
  amenityIds: Array<Scalars["ID"]["input"]>;
  hotelId: Scalars["ID"]["input"];
};

export type MutationSetHotelMediaArgs = {
  hotelId: Scalars["ID"]["input"];
  media: Array<MediaInput>;
};

export type MutationSetPromotionStatusArgs = {
  id: Scalars["ID"]["input"];
  status: PromotionStatus;
};

export type MutationSetRatePlanPricesArgs = {
  linkId: Scalars["ID"]["input"];
  prices: Array<RatePlanPriceInput>;
};

export type MutationSetRoomTypeAmenitiesArgs = {
  amenityIds: Array<Scalars["ID"]["input"]>;
  roomTypeId: Scalars["ID"]["input"];
};

export type MutationSetRoomTypeMediaArgs = {
  media: Array<MediaInput>;
  roomTypeId: Scalars["ID"]["input"];
};

export type MutationUnlinkRoomTypeRatePlanArgs = {
  linkId: Scalars["ID"]["input"];
};

export type MutationUpdateAvailabilityArgs = {
  hotelId: Scalars["ID"]["input"];
  rows: Array<AvailabilityUpdateInput>;
};

export type MutationUpdateHotelArgs = {
  id: Scalars["ID"]["input"];
  input: AdminHotelInput;
};

export type MutationUpdatePromotionArgs = {
  id: Scalars["ID"]["input"];
  input: AdminPromotionInput;
};

export type MutationUpdateRatePlanArgs = {
  id: Scalars["ID"]["input"];
  input: AdminRatePlanInput;
};

export type MutationUpdateRoomArgs = {
  id: Scalars["ID"]["input"];
  input: AdminRoomInput;
};

export type MutationUpdateRoomTypeArgs = {
  id: Scalars["ID"]["input"];
  input: AdminRoomTypeInput;
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
  experiences: Array<Experience>;
  extras: Array<Extra>;
  faqs: Array<Faq>;
  hotel?: Maybe<Hotel>;
  hotelDetails?: Maybe<HotelDetails>;
  hotels: HotelSearchResult;
  me: Me;
  myReservations: Array<Reservation>;
  offers: Array<Offer>;
  quote: Quote;
  rates: Array<RoomRateOption>;
  reservation?: Maybe<Reservation>;
  restaurants: Array<Restaurant>;
  reviews: ReviewPage;
  roomTypes: Array<RoomType>;
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

export type QueryRoomTypesArgs = {
  hotelId: Scalars["ID"]["input"];
};

export type Quote = {
  __typename?: "Quote";
  currencyCode: Scalars["String"]["output"];
  discountAmount: Scalars["Float"]["output"];
  feeAmount: Scalars["Float"]["output"];
  lines: Array<QuoteLine>;
  message?: Maybe<Scalars["String"]["output"]>;
  originalTotal: Scalars["Float"]["output"];
  subtotalAmount: Scalars["Float"]["output"];
  taxAmount: Scalars["Float"]["output"];
  totalAmount: Scalars["Float"]["output"];
  valid: Scalars["Boolean"]["output"];
};

export type QuoteExtraInput = {
  extraId: Scalars["ID"]["input"];
  quantity: Scalars["Int"]["input"];
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

export type ReservationResult = {
  __typename?: "ReservationResult";
  created: Scalars["Boolean"]["output"];
  reservation: Reservation;
};

export type ReservationRoomInput = {
  ratePlanId: Scalars["ID"]["input"];
  roomTypeId: Scalars["ID"]["input"];
};

export type ReservationRoomLine = {
  __typename?: "ReservationRoomLine";
  checkInDate: Scalars["LocalDate"]["output"];
  checkOutDate: Scalars["LocalDate"]["output"];
  id: Scalars["ID"]["output"];
  nights: Scalars["Int"]["output"];
  ratePerNight: Scalars["Float"]["output"];
  ratePlanId: Scalars["ID"]["output"];
  roomTypeId: Scalars["ID"]["output"];
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
  roomTypeId: Scalars["ID"]["output"];
  status: AvailabilityStatus;
};

export type RoomRateOption = {
  __typename?: "RoomRateOption";
  cancellationPolicy?: Maybe<Scalars["String"]["output"]>;
  currencyCode: Scalars["String"]["output"];
  isRefundable: Scalars["Boolean"]["output"];
  mealPlan?: Maybe<Scalars["String"]["output"]>;
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
  description?: Maybe<Scalars["String"]["output"]>;
  hotelId: Scalars["ID"]["output"];
  id: Scalars["ID"]["output"];
  maxAdults: Scalars["Int"]["output"];
  maxChildren: Scalars["Int"]["output"];
  media: Array<Media>;
  name: Scalars["String"]["output"];
  pricePerNight?: Maybe<Scalars["Int"]["output"]>;
  sizeSqm?: Maybe<Scalars["Float"]["output"]>;
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

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;

export type LoginMutation = {
  __typename?: "Mutation";
  login: {
    __typename?: "AuthPayload";
    token: string;
    me: {
      __typename?: "Me";
      id: string;
      email: string;
      roles: Array<string>;
      hotelIds: Array<string>;
    };
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

export type UpdateAvailabilityMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  rows: Array<AvailabilityUpdateInput> | AvailabilityUpdateInput;
}>;

export type UpdateAvailabilityMutation = {
  __typename?: "Mutation";
  updateAvailability: Array<{
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

export type CreateHotelMutationVariables = Exact<{
  input: AdminHotelInput;
}>;

export type CreateHotelMutation = {
  __typename?: "Mutation";
  createHotel: {
    __typename?: "Hotel";
    id: string;
    name: string;
    status: HotelStatus;
  };
};

export type UpdateHotelMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: AdminHotelInput;
}>;

export type UpdateHotelMutation = {
  __typename?: "Mutation";
  updateHotel: {
    __typename?: "Hotel";
    id: string;
    name: string;
    status: HotelStatus;
  };
};

export type SetHotelAmenitiesMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  amenityIds: Array<Scalars["ID"]["input"]> | Scalars["ID"]["input"];
}>;

export type SetHotelAmenitiesMutation = {
  __typename?: "Mutation";
  setHotelAmenities: Array<{
    __typename?: "Amenity";
    id: string;
    name: string;
  }>;
};

export type SetHotelMediaMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  media: Array<MediaInput> | MediaInput;
}>;

export type SetHotelMediaMutation = {
  __typename?: "Mutation";
  setHotelMedia: Array<{
    __typename?: "Media";
    id: string;
    url: string;
    altText?: string | null;
    isPrimary: boolean;
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

export type CreatePromotionMutationVariables = Exact<{
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
  input: AdminPromotionInput;
}>;

export type CreatePromotionMutation = {
  __typename?: "Mutation";
  createPromotion: {
    __typename?: "AdminPromotion";
    id: string;
    code: string;
    name: string;
    status: PromotionStatus;
  };
};

export type UpdatePromotionMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: AdminPromotionInput;
}>;

export type UpdatePromotionMutation = {
  __typename?: "Mutation";
  updatePromotion: {
    __typename?: "AdminPromotion";
    id: string;
    code: string;
    name: string;
    status: PromotionStatus;
  };
};

export type SetPromotionStatusMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  status: PromotionStatus;
}>;

export type SetPromotionStatusMutation = {
  __typename?: "Mutation";
  setPromotionStatus: {
    __typename?: "AdminPromotion";
    id: string;
    code: string;
    name: string;
    status: PromotionStatus;
  };
};

export type CreateRatePlanMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  input: AdminRatePlanInput;
}>;

export type CreateRatePlanMutation = {
  __typename?: "Mutation";
  createRatePlan: {
    __typename?: "RatePlan";
    id: string;
    name: string;
    code: string;
    currencyCode: string;
    status: RatePlanStatus;
  };
};

export type UpdateRatePlanMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: AdminRatePlanInput;
}>;

export type UpdateRatePlanMutation = {
  __typename?: "Mutation";
  updateRatePlan: {
    __typename?: "RatePlan";
    id: string;
    name: string;
    code: string;
    currencyCode: string;
    status: RatePlanStatus;
  };
};

export type LinkRoomTypeRatePlanMutationVariables = Exact<{
  roomTypeId: Scalars["ID"]["input"];
  ratePlanId: Scalars["ID"]["input"];
}>;

export type LinkRoomTypeRatePlanMutation = {
  __typename?: "Mutation";
  linkRoomTypeRatePlan: {
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
  };
};

export type UnlinkRoomTypeRatePlanMutationVariables = Exact<{
  linkId: Scalars["ID"]["input"];
}>;

export type UnlinkRoomTypeRatePlanMutation = {
  __typename?: "Mutation";
  unlinkRoomTypeRatePlan: boolean;
};

export type SetRatePlanPricesMutationVariables = Exact<{
  linkId: Scalars["ID"]["input"];
  prices: Array<RatePlanPriceInput> | RatePlanPriceInput;
}>;

export type SetRatePlanPricesMutation = {
  __typename?: "Mutation";
  setRatePlanPrices: Array<{
    __typename?: "RatePlanPriceInfo";
    id: string;
    validFrom: string;
    validTo: string;
    priceAmount: number;
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

export type AdminCancelReservationMutationVariables = Exact<{
  reservationId: Scalars["ID"]["input"];
  reasonCode?: InputMaybe<Scalars["String"]["input"]>;
  reasonNote?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type AdminCancelReservationMutation = {
  __typename?: "Mutation";
  adminCancelReservation: {
    __typename?: "Reservation";
    id: string;
    reference: string;
    status: ReservationStatus;
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

export type ModerateReviewMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  status: ReviewModerationStatus;
  response?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type ModerateReviewMutation = {
  __typename?: "Mutation";
  moderateReview: {
    __typename?: "Review";
    id: string;
    moderationStatus: string;
    responseText?: string | null;
  };
};

export type CreateRoomTypeMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  input: AdminRoomTypeInput;
}>;

export type CreateRoomTypeMutation = {
  __typename?: "Mutation";
  createRoomType: {
    __typename?: "RoomType";
    id: string;
    name: string;
    status: RoomTypeStatus;
  };
};

export type UpdateRoomTypeMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: AdminRoomTypeInput;
}>;

export type UpdateRoomTypeMutation = {
  __typename?: "Mutation";
  updateRoomType: {
    __typename?: "RoomType";
    id: string;
    name: string;
    status: RoomTypeStatus;
  };
};

export type SetRoomTypeAmenitiesMutationVariables = Exact<{
  roomTypeId: Scalars["ID"]["input"];
  amenityIds: Array<Scalars["ID"]["input"]> | Scalars["ID"]["input"];
}>;

export type SetRoomTypeAmenitiesMutation = {
  __typename?: "Mutation";
  setRoomTypeAmenities: Array<{
    __typename?: "Amenity";
    id: string;
    name: string;
  }>;
};

export type SetRoomTypeMediaMutationVariables = Exact<{
  roomTypeId: Scalars["ID"]["input"];
  media: Array<MediaInput> | MediaInput;
}>;

export type SetRoomTypeMediaMutation = {
  __typename?: "Mutation";
  setRoomTypeMedia: Array<{
    __typename?: "Media";
    id: string;
    url: string;
    altText?: string | null;
    isPrimary: boolean;
  }>;
};

export type CreateRoomMutationVariables = Exact<{
  hotelId: Scalars["ID"]["input"];
  input: AdminRoomInput;
}>;

export type CreateRoomMutation = {
  __typename?: "Mutation";
  createRoom: {
    __typename?: "Room";
    id: string;
    roomNumber: string;
    floor?: string | null;
    status: string;
    housekeepingStatus: string;
    maintenanceStatus: string;
  };
};

export type UpdateRoomMutationVariables = Exact<{
  id: Scalars["ID"]["input"];
  input: AdminRoomInput;
}>;

export type UpdateRoomMutation = {
  __typename?: "Mutation";
  updateRoom: {
    __typename?: "Room";
    id: string;
    roomNumber: string;
    floor?: string | null;
    status: string;
    housekeepingStatus: string;
    maintenanceStatus: string;
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

export type CreateUserMutationVariables = Exact<{
  input: AdminCreateUserInput;
}>;

export type CreateUserMutation = {
  __typename?: "Mutation";
  createUser: {
    __typename?: "AdminUser";
    id: string;
    email: string;
    status: string;
    roles: Array<{
      __typename?: "AdminUserRole";
      id: string;
      roleName: string;
      hotelId?: string | null;
      hotelName?: string | null;
    }>;
  };
};

export type AssignRoleMutationVariables = Exact<{
  userId: Scalars["ID"]["input"];
  roleName: Scalars["String"]["input"];
  hotelId?: InputMaybe<Scalars["ID"]["input"]>;
}>;

export type AssignRoleMutation = {
  __typename?: "Mutation";
  assignRole: {
    __typename?: "AdminUser";
    id: string;
    email: string;
    roles: Array<{
      __typename?: "AdminUserRole";
      id: string;
      roleName: string;
      hotelId?: string | null;
      hotelName?: string | null;
    }>;
  };
};

export type RevokeRoleMutationVariables = Exact<{
  userRoleId: Scalars["ID"]["input"];
}>;

export type RevokeRoleMutation = {
  __typename?: "Mutation";
  revokeRole: {
    __typename?: "AdminUser";
    id: string;
    email: string;
    roles: Array<{
      __typename?: "AdminUserRole";
      id: string;
      roleName: string;
      hotelId?: string | null;
      hotelName?: string | null;
    }>;
  };
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
export const LoginDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "Login" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "LoginInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "login" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "token" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "me" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "email" } },
                      { kind: "Field", name: { kind: "Name", value: "roles" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "hotelIds" },
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
} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
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
export const UpdateAvailabilityDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateAvailability" },
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
          variable: { kind: "Variable", name: { kind: "Name", value: "rows" } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "AvailabilityUpdateInput" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateAvailability" },
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
                name: { kind: "Name", value: "rows" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "rows" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "roomTypeId" } },
                { kind: "Field", name: { kind: "Name", value: "stayDate" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "totalInventory" },
                },
                { kind: "Field", name: { kind: "Name", value: "roomsSold" } },
                { kind: "Field", name: { kind: "Name", value: "outOfOrder" } },
                { kind: "Field", name: { kind: "Name", value: "blocked" } },
                { kind: "Field", name: { kind: "Name", value: "free" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateAvailabilityMutation,
  UpdateAvailabilityMutationVariables
>;
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
export const CreateHotelDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateHotel" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminHotelInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createHotel" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateHotelMutation, CreateHotelMutationVariables>;
export const UpdateHotelDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateHotel" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminHotelInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateHotel" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateHotelMutation, UpdateHotelMutationVariables>;
export const SetHotelAmenitiesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetHotelAmenities" },
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
            name: { kind: "Name", value: "amenityIds" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "ID" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setHotelAmenities" },
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
                name: { kind: "Name", value: "amenityIds" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "amenityIds" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetHotelAmenitiesMutation,
  SetHotelAmenitiesMutationVariables
>;
export const SetHotelMediaDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetHotelMedia" },
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
            name: { kind: "Name", value: "media" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "MediaInput" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setHotelMedia" },
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
                name: { kind: "Name", value: "media" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "media" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "altText" } },
                { kind: "Field", name: { kind: "Name", value: "isPrimary" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetHotelMediaMutation,
  SetHotelMediaMutationVariables
>;
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
export const CreatePromotionDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreatePromotion" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminPromotionInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createPromotion" },
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
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreatePromotionMutation,
  CreatePromotionMutationVariables
>;
export const UpdatePromotionDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdatePromotion" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminPromotionInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updatePromotion" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdatePromotionMutation,
  UpdatePromotionMutationVariables
>;
export const SetPromotionStatusDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetPromotionStatus" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
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
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "PromotionStatus" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setPromotionStatus" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
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
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetPromotionStatusMutation,
  SetPromotionStatusMutationVariables
>;
export const CreateRatePlanDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateRatePlan" },
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
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRatePlanInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createRatePlan" },
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
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "currencyCode" },
                },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateRatePlanMutation,
  CreateRatePlanMutationVariables
>;
export const UpdateRatePlanDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateRatePlan" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRatePlanInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateRatePlan" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "code" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "currencyCode" },
                },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateRatePlanMutation,
  UpdateRatePlanMutationVariables
>;
export const LinkRoomTypeRatePlanDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "LinkRoomTypeRatePlan" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "roomTypeId" },
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
            name: { kind: "Name", value: "ratePlanId" },
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
            name: { kind: "Name", value: "linkRoomTypeRatePlan" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "roomTypeId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "roomTypeId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "ratePlanId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "ratePlanId" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "roomTypeId" } },
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
                      { kind: "Field", name: { kind: "Name", value: "id" } },
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
                        name: { kind: "Name", value: "priceAmount" },
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
  LinkRoomTypeRatePlanMutation,
  LinkRoomTypeRatePlanMutationVariables
>;
export const UnlinkRoomTypeRatePlanDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UnlinkRoomTypeRatePlan" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "linkId" },
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
            name: { kind: "Name", value: "unlinkRoomTypeRatePlan" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "linkId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "linkId" },
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UnlinkRoomTypeRatePlanMutation,
  UnlinkRoomTypeRatePlanMutationVariables
>;
export const SetRatePlanPricesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetRatePlanPrices" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "linkId" },
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
            name: { kind: "Name", value: "prices" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "RatePlanPriceInput" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setRatePlanPrices" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "linkId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "linkId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "prices" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "prices" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "validFrom" } },
                { kind: "Field", name: { kind: "Name", value: "validTo" } },
                { kind: "Field", name: { kind: "Name", value: "priceAmount" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetRatePlanPricesMutation,
  SetRatePlanPricesMutationVariables
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
export const AdminCancelReservationDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "AdminCancelReservation" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "reservationId" },
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
            name: { kind: "Name", value: "reasonCode" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "reasonNote" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "adminCancelReservation" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "reservationId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "reservationId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "reasonCode" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "reasonCode" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "reasonNote" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "reasonNote" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "reference" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "cancellation" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
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
} as unknown as DocumentNode<
  AdminCancelReservationMutation,
  AdminCancelReservationMutationVariables
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
export const ModerateReviewDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "ModerateReview" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
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
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "ReviewModerationStatus" },
            },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "response" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "moderateReview" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
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
                name: { kind: "Name", value: "response" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "response" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "moderationStatus" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "responseText" },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ModerateReviewMutation,
  ModerateReviewMutationVariables
>;
export const CreateRoomTypeDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateRoomType" },
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
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRoomTypeInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createRoomType" },
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
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateRoomTypeMutation,
  CreateRoomTypeMutationVariables
>;
export const UpdateRoomTypeDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateRoomType" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRoomTypeInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateRoomType" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateRoomTypeMutation,
  UpdateRoomTypeMutationVariables
>;
export const SetRoomTypeAmenitiesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetRoomTypeAmenities" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "roomTypeId" },
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
            name: { kind: "Name", value: "amenityIds" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "ID" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setRoomTypeAmenities" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "roomTypeId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "roomTypeId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "amenityIds" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "amenityIds" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetRoomTypeAmenitiesMutation,
  SetRoomTypeAmenitiesMutationVariables
>;
export const SetRoomTypeMediaDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "SetRoomTypeMedia" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "roomTypeId" },
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
            name: { kind: "Name", value: "media" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "ListType",
              type: {
                kind: "NonNullType",
                type: {
                  kind: "NamedType",
                  name: { kind: "Name", value: "MediaInput" },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setRoomTypeMedia" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "roomTypeId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "roomTypeId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "media" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "media" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "altText" } },
                { kind: "Field", name: { kind: "Name", value: "isPrimary" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetRoomTypeMediaMutation,
  SetRoomTypeMediaMutationVariables
>;
export const CreateRoomDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateRoom" },
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
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRoomInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createRoom" },
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
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "roomNumber" } },
                { kind: "Field", name: { kind: "Name", value: "floor" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "housekeepingStatus" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "maintenanceStatus" },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateRoomMutation, CreateRoomMutationVariables>;
export const UpdateRoomDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "UpdateRoom" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminRoomInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateRoom" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "roomNumber" } },
                { kind: "Field", name: { kind: "Name", value: "floor" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "housekeepingStatus" },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "maintenanceStatus" },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateRoomMutation, UpdateRoomMutationVariables>;
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
export const CreateUserDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateUser" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "input" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "AdminCreateUserInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createUser" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "input" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
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
} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>;
export const AssignRoleDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "AssignRole" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "userId" },
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
            name: { kind: "Name", value: "roleName" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String" },
            },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "hotelId" },
          },
          type: { kind: "NamedType", name: { kind: "Name", value: "ID" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "assignRole" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "userId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "userId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "roleName" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "roleName" },
                },
              },
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
                { kind: "Field", name: { kind: "Name", value: "email" } },
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
} as unknown as DocumentNode<AssignRoleMutation, AssignRoleMutationVariables>;
export const RevokeRoleDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "RevokeRole" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "userRoleId" },
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
            name: { kind: "Name", value: "revokeRole" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "userRoleId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "userRoleId" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "email" } },
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
} as unknown as DocumentNode<RevokeRoleMutation, RevokeRoleMutationVariables>;
