/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AvailabilityInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelId: string | number;
  rooms: number;
};

export type AvailabilityStatus = 'available' | 'few' | 'soldout';

export type ExtraPricingModel = 'per_night' | 'per_person' | 'per_room' | 'per_stay';

export type HotelStatus = 'active' | 'draft' | 'inactive';

export type PaymentStatus =
  'authorized' | 'captured' | 'failed' | 'partially_refunded' | 'pending' | 'refunded';

/** Closed block-type enum; new types require a migration + GraphQL type. */
export type PlatformBlockType = 'EXPERIENCES' | 'HERO';

export type PlatformStatus = 'active' | 'draft' | 'inactive';

export type PromotionStatus = 'active' | 'expired' | 'inactive';

export type QuoteExtraInput = {
  extraId: string | number;
  quantity: number;
};

export type QuoteInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  currencyCode: string;
  extras?: Array<QuoteExtraInput> | null | undefined;
  hotelId: string | number;
  promoCode?: string | null | undefined;
  rooms: Array<QuoteRoomInput>;
};

export type QuoteRoomInput = {
  ratePlanId: string | number;
  roomTypeId: string | number;
};

export type RatesInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelId: string | number;
  roomTypeId?: string | number | null | undefined;
};

export type ReservationLookupInput = {
  email: string;
  reference: string;
};

export type ReservationStatus =
  'cancelled' | 'checked_in' | 'checked_out' | 'confirmed' | 'modified' | 'no_show' | 'pending';

export type RoomTypeStatus = 'active' | 'draft' | 'inactive';

export type StaySearchInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelId?: string | number | null | undefined;
  rooms: number;
};

export type CanonicalHotelQueryVariables = Exact<{ [key: string]: never }>;

export type CanonicalHotelQuery = {
  canonicalHotel: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    hotelType: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    countryCode: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    starRating: number | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    defaultCurrency: string;
    status: HotelStatus;
    averageRating: number | null;
    amenities: Array<{ id: string; name: string; icon: string | null; category: string | null }>;
    media: Array<{
      id: string;
      url: string;
      altText: string | null;
      category: string | null;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  };
};

export type CountriesQueryVariables = Exact<{ [key: string]: never }>;

export type CountriesQuery = {
  countries: Array<{ code: string; name: string; callingCode: string | null }>;
};

export type HotelExtrasQueryVariables = Exact<{
  hotelId: string | number;
}>;

export type HotelExtrasQuery = {
  extras: Array<{
    id: string;
    name: string;
    description: string | null;
    pricingModel: ExtraPricingModel;
    priceAmount: number;
    currencyCode: string;
  }>;
};

export type ReservationSummaryFragment = {
  id: string;
  reference: string;
  hotelId: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  totalAmount: number;
  source: string;
  notes: string | null;
  createdAt: string;
  guest: {
    id: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    countryCode: string | null;
  };
  roomLines: Array<{
    id: string;
    roomTypeId: string;
    ratePlanId: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    ratePerNight: number;
    subtotalAmount: number;
    status: string;
    roomTypeName: string;
    roomTypeImageUrl: string | null;
    ratePlanName: string | null;
    isRefundable: boolean;
    freeCancellationUntil: string | null;
    paymentTiming: string;
  }>;
  extras: Array<{
    id: string;
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  charges: Array<{ id: string; name: string; chargeType: string; amount: number }>;
  cancellation: {
    id: string;
    reason: string | null;
    reasonNote: string | null;
    isRefundable: boolean;
    penaltyAmount: number;
    refundAmount: number;
    cancelledAt: string;
  } | null;
};

export type HotelSummaryFragment = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  hotelType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  starRating: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  defaultCurrency: string;
  status: HotelStatus;
  averageRating: number | null;
  amenities: Array<{ id: string; name: string; icon: string | null; category: string | null }>;
  media: Array<{
    id: string;
    url: string;
    altText: string | null;
    category: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
};

export type RoomTypeSummaryFragment = {
  id: string;
  hotelId: string;
  hotelName: string | null;
  currencyCode: string | null;
  name: string;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  bedConfiguration: string | null;
  sizeSqm: number | null;
  viewType: string | null;
  status: RoomTypeStatus;
  pricePerNight: number | null;
  amenities: Array<{ id: string; name: string; category: string | null }>;
  media: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean }>;
};

export type HomepageQueryVariables = Exact<{ [key: string]: never }>;

export type HomepageQuery = {
  homepage: {
    featuredRoomTypes: Array<{
      id: string;
      hotelId: string;
      hotelName: string | null;
      currencyCode: string | null;
      name: string;
      description: string | null;
      maxAdults: number;
      maxChildren: number;
      bedConfiguration: string | null;
      sizeSqm: number | null;
      viewType: string | null;
      status: RoomTypeStatus;
      pricePerNight: number | null;
      amenities: Array<{ name: string; icon: string | null }>;
      media: Array<{ url: string; altText: string | null }>;
    }>;
    featuredExperiences: Array<{
      id: string;
      hotelId: string;
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number | null;
      priceAmount: number | null;
      currencyCode: string | null;
      location: string | null;
    }>;
    featuredReviews: Array<{
      id: string;
      hotelId: string;
      authorName: string | null;
      rating: number;
      title: string | null;
      comment: string | null;
      moderationStatus: string;
      createdAt: string;
    }>;
  };
};

export type HotelByIdQueryVariables = Exact<{
  id: string | number;
}>;

export type HotelByIdQuery = {
  hotel: {
    id: string;
    name: string;
    brand: string | null;
    description: string | null;
    hotelType: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    countryCode: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    starRating: number | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    defaultCurrency: string;
    status: HotelStatus;
    averageRating: number | null;
    amenities: Array<{ id: string; name: string; icon: string | null; category: string | null }>;
    media: Array<{
      id: string;
      url: string;
      altText: string | null;
      category: string | null;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  } | null;
};

export type HotelDetailsQueryVariables = Exact<{
  id: string | number;
}>;

export type HotelDetailsQuery = {
  hotelDetails: {
    reviewsCount: number;
    averageRating: number | null;
    hotel: {
      id: string;
      name: string;
      brand: string | null;
      description: string | null;
      hotelType: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      countryCode: string | null;
      latitude: number | null;
      longitude: number | null;
      phone: string | null;
      email: string | null;
      starRating: number | null;
      checkInTime: string | null;
      checkOutTime: string | null;
      defaultCurrency: string;
      status: HotelStatus;
      averageRating: number | null;
      amenities: Array<{ id: string; name: string; icon: string | null; category: string | null }>;
      media: Array<{
        id: string;
        url: string;
        altText: string | null;
        category: string | null;
        isPrimary: boolean;
        sortOrder: number;
      }>;
    };
    experiences: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number | null;
      priceAmount: number | null;
      currencyCode: string | null;
      location: string | null;
      sortOrder: number;
    }>;
    restaurants: Array<{
      id: string;
      name: string;
      description: string | null;
      cuisineType: string | null;
      openingHours: string | null;
      location: string | null;
      sortOrder: number;
    }>;
    faqs: Array<{
      id: string;
      question: string;
      answer: string;
      category: string | null;
      sortOrder: number;
    }>;
    policies: Array<{
      id: string;
      name: string;
      value: string;
      icon: string | null;
      sortOrder: number;
    }>;
    reviews: {
      total: number;
      page: number;
      size: number;
      items: Array<{
        id: string;
        authorName: string | null;
        rating: number;
        title: string | null;
        comment: string | null;
        responseText: string | null;
        createdAt: string;
      }>;
    };
  } | null;
};

export type HotelRoomTypesQueryVariables = Exact<{
  hotelId: string | number;
}>;

export type HotelRoomTypesQuery = {
  roomTypes: Array<{
    id: string;
    hotelId: string;
    hotelName: string | null;
    currencyCode: string | null;
    name: string;
    description: string | null;
    maxAdults: number;
    maxChildren: number;
    bedConfiguration: string | null;
    sizeSqm: number | null;
    viewType: string | null;
    status: RoomTypeStatus;
    pricePerNight: number | null;
    amenities: Array<{ id: string; name: string; category: string | null }>;
    media: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean }>;
  }>;
};

export type HotelOffersQueryVariables = Exact<{
  hotelId: string | number;
}>;

export type HotelOffersQuery = {
  offers: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    discountType: string;
    discountValue: number;
    bookingWindowStart: string | null;
    bookingWindowEnd: string | null;
    stayWindowStart: string | null;
    stayWindowEnd: string | null;
    minNights: number | null;
    stackable: boolean;
    appliesToAllRoomTypes: boolean;
    appliesToAllRatePlans: boolean;
    status: PromotionStatus;
  }>;
};

export type StayAvailabilityQueryVariables = Exact<{
  input: AvailabilityInput;
}>;

export type StayAvailabilityQuery = {
  availability: Array<{
    roomTypeId: string;
    available: boolean;
    status: AvailabilityStatus;
    capacityFits: boolean;
  }>;
};

export type StayRatesQueryVariables = Exact<{
  input: RatesInput;
}>;

export type StayRatesQuery = {
  rates: Array<{
    roomTypeId: string;
    ratePlanId: string;
    ratePlanCode: string;
    ratePlanName: string;
    mealPlan: string | null;
    pricePerNight: number;
    currencyCode: string;
    cancellationPolicy: string | null;
    isRefundable: boolean;
    paymentTiming: string;
    depositPercentage: number | null;
  }>;
};

export type PlatformBySlugQueryVariables = Exact<{
  slug: string;
}>;

export type PlatformBySlugQuery = {
  platform: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    status: PlatformStatus;
    media: Array<{
      id: string;
      url: string;
      altText: string | null;
      category: string | null;
      isPrimary: boolean;
    }>;
    contentBlocks: Array<
      | {
          __typename: 'FeaturedExperiencesBlock';
          title: string;
          id: string;
          type: PlatformBlockType;
          position: number;
          isEnabled: boolean;
          items: Array<{
            id: string;
            position: number;
            experience: {
              id: string;
              hotelId: string;
              name: string;
              description: string | null;
              category: string | null;
              durationMinutes: number | null;
              priceAmount: number | null;
              currencyCode: string | null;
              location: string | null;
              sortOrder: number;
            };
          }>;
        }
      | {
          __typename: 'HeroBlock';
          eyebrow: string | null;
          title: string;
          subtitle: string | null;
          ctaLabel: string | null;
          ctaTarget: string | null;
          id: string;
          type: PlatformBlockType;
          position: number;
          isEnabled: boolean;
          image: { id: string; url: string; altText: string | null } | null;
          mobileImage: { id: string; url: string; altText: string | null } | null;
        }
    >;
  };
};

export type QuoteQueryVariables = Exact<{
  input: QuoteInput;
}>;

export type QuoteQuery = {
  quote: {
    currencyCode: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    feeAmount: number;
    totalAmount: number;
    paymentTiming: string;
    amountDueNow: number;
    originalTotal: number;
    valid: boolean;
    message: string | null;
    lines: Array<{
      roomTypeId: string;
      ratePlanId: string;
      ratePerNight: number;
      nights: number;
      subtotalAmount: number;
    }>;
    extras: Array<{ extraId: string; quantity: number; unitPrice: number; totalPrice: number }>;
    charges: Array<{ taxFeeTypeId: string; chargeType: string; name: string; amount: number }>;
  };
};

export type MyReservationsQueryVariables = Exact<{ [key: string]: never }>;

export type MyReservationsQuery = {
  myReservations: Array<{
    id: string;
    reference: string;
    hotelId: string;
    status: ReservationStatus;
    paymentStatus: PaymentStatus;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    currencyCode: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    feeAmount: number;
    totalAmount: number;
    source: string;
    notes: string | null;
    createdAt: string;
    guest: {
      id: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      countryCode: string | null;
    };
    roomLines: Array<{
      id: string;
      roomTypeId: string;
      ratePlanId: string;
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      ratePerNight: number;
      subtotalAmount: number;
      status: string;
      roomTypeName: string;
      roomTypeImageUrl: string | null;
      ratePlanName: string | null;
      isRefundable: boolean;
      freeCancellationUntil: string | null;
      paymentTiming: string;
    }>;
    extras: Array<{
      id: string;
      extraId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    charges: Array<{ id: string; name: string; chargeType: string; amount: number }>;
    cancellation: {
      id: string;
      reason: string | null;
      reasonNote: string | null;
      isRefundable: boolean;
      penaltyAmount: number;
      refundAmount: number;
      cancelledAt: string;
    } | null;
  }>;
};

export type ReservationLookupQueryVariables = Exact<{
  input: ReservationLookupInput;
}>;

export type ReservationLookupQuery = {
  reservation: {
    id: string;
    reference: string;
    hotelId: string;
    status: ReservationStatus;
    paymentStatus: PaymentStatus;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    currencyCode: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    feeAmount: number;
    totalAmount: number;
    source: string;
    notes: string | null;
    createdAt: string;
    guest: {
      id: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      countryCode: string | null;
    };
    roomLines: Array<{
      id: string;
      roomTypeId: string;
      ratePlanId: string;
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      ratePerNight: number;
      subtotalAmount: number;
      status: string;
      roomTypeName: string;
      roomTypeImageUrl: string | null;
      ratePlanName: string | null;
      isRefundable: boolean;
      freeCancellationUntil: string | null;
      paymentTiming: string;
    }>;
    extras: Array<{
      id: string;
      extraId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    charges: Array<{ id: string; name: string; chargeType: string; amount: number }>;
    cancellation: {
      id: string;
      reason: string | null;
      reasonNote: string | null;
      isRefundable: boolean;
      penaltyAmount: number;
      refundAmount: number;
      cancelledAt: string;
    } | null;
  } | null;
};

export type RoomTypeByIdQueryVariables = Exact<{
  id: string | number;
}>;

export type RoomTypeByIdQuery = {
  roomType: {
    id: string;
    hotelId: string;
    hotelName: string | null;
    currencyCode: string | null;
    name: string;
    description: string | null;
    maxAdults: number;
    maxChildren: number;
    bedConfiguration: string | null;
    sizeSqm: number | null;
    viewType: string | null;
    status: RoomTypeStatus;
    pricePerNight: number | null;
    amenities: Array<{ id: string; name: string; category: string | null }>;
    media: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean }>;
  } | null;
};

export type StaySearchQueryVariables = Exact<{
  input: StaySearchInput;
}>;

export type StaySearchQuery = {
  staySearch: Array<{
    hotelId: string;
    hotelName: string;
    status: AvailabilityStatus;
    capacityFits: boolean;
    roomType: {
      id: string;
      hotelId: string;
      hotelName: string | null;
      currencyCode: string | null;
      name: string;
      description: string | null;
      maxAdults: number;
      maxChildren: number;
      bedConfiguration: string | null;
      sizeSqm: number | null;
      viewType: string | null;
      status: RoomTypeStatus;
      pricePerNight: number | null;
      amenities: Array<{ id: string; name: string; category: string | null }>;
      media: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean }>;
    };
    rates: Array<{
      roomTypeId: string;
      ratePlanId: string;
      ratePlanCode: string;
      ratePlanName: string;
      mealPlan: string | null;
      pricePerNight: number;
      currencyCode: string;
      cancellationPolicy: string | null;
      isRefundable: boolean;
      paymentTiming: string;
      depositPercentage: number | null;
    }>;
  }>;
};

export const ReservationSummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ReservationSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Reservation' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reference' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'paymentStatus' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'adults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'children' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'discountAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taxAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'feeAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'guest' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'firstName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roomLines' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nights' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePerNight' } },
                { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeImageUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'freeCancellationUntil' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'extras' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'extraId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'quantity' } },
                { kind: 'Field', name: { kind: 'Name', value: 'unitPrice' } },
                { kind: 'Field', name: { kind: 'Name', value: 'totalPrice' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'charges' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'chargeType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'amount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancellation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reasonNote' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'penaltyAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refundAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'cancelledAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ReservationSummaryFragment, unknown>;
export const HotelSummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HotelSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Hotel' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine1' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine2' } },
          { kind: 'Field', name: { kind: 'Name', value: 'city' } },
          { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'latitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'longitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelSummaryFragment, unknown>;
export const RoomTypeSummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RoomTypeSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'RoomType' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxAdults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxChildren' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bedConfiguration' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sizeSqm' } },
          { kind: 'Field', name: { kind: 'Name', value: 'viewType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RoomTypeSummaryFragment, unknown>;
export const CanonicalHotelDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'CanonicalHotel' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'canonicalHotel' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'addressLine1' } },
                { kind: 'Field', name: { kind: 'Name', value: 'addressLine2' } },
                { kind: 'Field', name: { kind: 'Name', value: 'city' } },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'latitude' } },
                { kind: 'Field', name: { kind: 'Name', value: 'longitude' } },
                { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkInTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkOutTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'amenities' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'media' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
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
} as unknown as DocumentNode<CanonicalHotelQuery, CanonicalHotelQueryVariables>;
export const CountriesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Countries' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'countries' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'callingCode' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CountriesQuery, CountriesQueryVariables>;
export const HotelExtrasDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelExtras' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'extras' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'hotelId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'pricingModel' } },
                { kind: 'Field', name: { kind: 'Name', value: 'priceAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelExtrasQuery, HotelExtrasQueryVariables>;
export const HomepageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Homepage' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'homepage' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'featuredRoomTypes' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'maxAdults' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'maxChildren' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'bedConfiguration' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sizeSqm' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'viewType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'amenities' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'media' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'featuredExperiences' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'durationMinutes' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'priceAmount' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'location' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'featuredReviews' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'authorName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'rating' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'comment' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'moderationStatus' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
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
} as unknown as DocumentNode<HomepageQuery, HomepageQueryVariables>;
export const HotelByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hotel' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'HotelSummary' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HotelSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Hotel' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine1' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine2' } },
          { kind: 'Field', name: { kind: 'Name', value: 'city' } },
          { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'latitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'longitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelByIdQuery, HotelByIdQueryVariables>;
export const HotelDetailsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelDetails' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hotelDetails' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'hotel' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'FragmentSpread', name: { kind: 'Name', value: 'HotelSummary' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'experiences' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'durationMinutes' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'priceAmount' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'location' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'restaurants' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'cuisineType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'openingHours' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'location' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'faqs' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'question' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'answer' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'policies' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'reviews' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'total' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'page' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'size' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'items' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'authorName' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'rating' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'comment' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'responseText' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'reviewsCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'HotelSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Hotel' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine1' } },
          { kind: 'Field', name: { kind: 'Name', value: 'addressLine2' } },
          { kind: 'Field', name: { kind: 'Name', value: 'city' } },
          { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'latitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'longitude' } },
          { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
          { kind: 'Field', name: { kind: 'Name', value: 'email' } },
          { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'icon' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelDetailsQuery, HotelDetailsQueryVariables>;
export const HotelRoomTypesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelRoomTypes' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roomTypes' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'hotelId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RoomTypeSummary' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RoomTypeSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'RoomType' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxAdults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxChildren' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bedConfiguration' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sizeSqm' } },
          { kind: 'Field', name: { kind: 'Name', value: 'viewType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelRoomTypesQuery, HotelRoomTypesQueryVariables>;
export const HotelOffersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelOffers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'offers' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'hotelId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'code' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'discountType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'discountValue' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bookingWindowStart' } },
                { kind: 'Field', name: { kind: 'Name', value: 'bookingWindowEnd' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stayWindowStart' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stayWindowEnd' } },
                { kind: 'Field', name: { kind: 'Name', value: 'minNights' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stackable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'appliesToAllRoomTypes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'appliesToAllRatePlans' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelOffersQuery, HotelOffersQueryVariables>;
export const StayAvailabilityDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StayAvailability' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'AvailabilityInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'availability' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'available' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'capacityFits' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StayAvailabilityQuery, StayAvailabilityQueryVariables>;
export const StayRatesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StayRates' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'RatesInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'rates' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'mealPlan' } },
                { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
                { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'cancellationPolicy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
                { kind: 'Field', name: { kind: 'Name', value: 'depositPercentage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StayRatesQuery, StayRatesQueryVariables>;
export const PlatformBySlugDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'PlatformBySlug' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'platform' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'tagline' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'media' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'contentBlocks' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isEnabled' } },
                      {
                        kind: 'InlineFragment',
                        typeCondition: {
                          kind: 'NamedType',
                          name: { kind: 'Name', value: 'HeroBlock' },
                        },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'eyebrow' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'subtitle' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'image' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                                ],
                              },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'mobileImage' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                                ],
                              },
                            },
                            { kind: 'Field', name: { kind: 'Name', value: 'ctaLabel' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'ctaTarget' } },
                          ],
                        },
                      },
                      {
                        kind: 'InlineFragment',
                        typeCondition: {
                          kind: 'NamedType',
                          name: { kind: 'Name', value: 'FeaturedExperiencesBlock' },
                        },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'items' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'position' } },
                                  {
                                    kind: 'Field',
                                    name: { kind: 'Name', value: 'experience' },
                                    selectionSet: {
                                      kind: 'SelectionSet',
                                      selections: [
                                        { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                        { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
                                        { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'description' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'category' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'durationMinutes' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'priceAmount' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'currencyCode' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'location' },
                                        },
                                        {
                                          kind: 'Field',
                                          name: { kind: 'Name', value: 'sortOrder' },
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
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<PlatformBySlugQuery, PlatformBySlugQueryVariables>;
export const QuoteDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Quote' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'QuoteInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'quote' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'discountAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'taxAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'feeAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'totalAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
                { kind: 'Field', name: { kind: 'Name', value: 'amountDueNow' } },
                { kind: 'Field', name: { kind: 'Name', value: 'originalTotal' } },
                { kind: 'Field', name: { kind: 'Name', value: 'valid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lines' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ratePerNight' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'nights' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'extras' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'extraId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'quantity' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'unitPrice' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'totalPrice' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'charges' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'taxFeeTypeId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'chargeType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'amount' } },
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
} as unknown as DocumentNode<QuoteQuery, QuoteQueryVariables>;
export const MyReservationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MyReservations' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myReservations' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'ReservationSummary' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ReservationSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Reservation' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reference' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'paymentStatus' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'adults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'children' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'discountAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taxAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'feeAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'guest' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'firstName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roomLines' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nights' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePerNight' } },
                { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeImageUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'freeCancellationUntil' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'extras' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'extraId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'quantity' } },
                { kind: 'Field', name: { kind: 'Name', value: 'unitPrice' } },
                { kind: 'Field', name: { kind: 'Name', value: 'totalPrice' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'charges' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'chargeType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'amount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancellation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reasonNote' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'penaltyAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refundAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'cancelledAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MyReservationsQuery, MyReservationsQueryVariables>;
export const ReservationLookupDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'ReservationLookup' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ReservationLookupInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reservation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'ReservationSummary' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'ReservationSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'Reservation' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'reference' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          { kind: 'Field', name: { kind: 'Name', value: 'paymentStatus' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'adults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'children' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'discountAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'taxAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'feeAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'totalAmount' } },
          { kind: 'Field', name: { kind: 'Name', value: 'source' } },
          { kind: 'Field', name: { kind: 'Name', value: 'notes' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'guest' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'firstName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'phone' } },
                { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roomLines' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkInDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'checkOutDate' } },
                { kind: 'Field', name: { kind: 'Name', value: 'nights' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePerNight' } },
                { kind: 'Field', name: { kind: 'Name', value: 'subtotalAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roomTypeImageUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'ratePlanName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'freeCancellationUntil' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'extras' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'extraId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'quantity' } },
                { kind: 'Field', name: { kind: 'Name', value: 'unitPrice' } },
                { kind: 'Field', name: { kind: 'Name', value: 'totalPrice' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'charges' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'chargeType' } },
                { kind: 'Field', name: { kind: 'Name', value: 'amount' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cancellation' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reason' } },
                { kind: 'Field', name: { kind: 'Name', value: 'reasonNote' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                { kind: 'Field', name: { kind: 'Name', value: 'penaltyAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refundAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'cancelledAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ReservationLookupQuery, ReservationLookupQueryVariables>;
export const RoomTypeByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'RoomTypeById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roomType' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RoomTypeSummary' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RoomTypeSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'RoomType' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxAdults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxChildren' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bedConfiguration' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sizeSqm' } },
          { kind: 'Field', name: { kind: 'Name', value: 'viewType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RoomTypeByIdQuery, RoomTypeByIdQueryVariables>;
export const StaySearchDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'StaySearch' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'StaySearchInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'staySearch' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'capacityFits' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'roomType' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'FragmentSpread', name: { kind: 'Name', value: 'RoomTypeSummary' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'rates' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'roomTypeId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ratePlanId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ratePlanCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ratePlanName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'mealPlan' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'cancellationPolicy' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isRefundable' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'paymentTiming' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'depositPercentage' } },
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
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RoomTypeSummary' },
      typeCondition: { kind: 'NamedType', name: { kind: 'Name', value: 'RoomType' } },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hotelName' } },
          { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxAdults' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxChildren' } },
          { kind: 'Field', name: { kind: 'Name', value: 'bedConfiguration' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sizeSqm' } },
          { kind: 'Field', name: { kind: 'Name', value: 'viewType' } },
          { kind: 'Field', name: { kind: 'Name', value: 'status' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'amenities' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'media' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'altText' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'pricePerNight' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<StaySearchQuery, StaySearchQueryVariables>;
