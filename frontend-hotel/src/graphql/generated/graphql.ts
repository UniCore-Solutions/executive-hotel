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

export type HotelSearchInput = {
  page?: PageInput | null | undefined;
  query?: string | null | undefined;
  sort?: HotelSort | null | undefined;
};

export type HotelSort = 'NAME_ASC' | 'PRICE_ASC' | 'RATING_DESC';

export type HotelStatus = 'active' | 'draft' | 'inactive';

export type PageInput = {
  page?: number | null | undefined;
  size?: number | null | undefined;
};

/** Closed block-type enum; new types require a migration + GraphQL type. */
export type PlatformBlockType = 'EXPERIENCES' | 'HERO';

export type PlatformStatus = 'active' | 'draft' | 'inactive';

export type PromotionStatus = 'active' | 'expired' | 'inactive';

export type RatesInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  hotelId: string | number;
  roomTypeId?: string | number | null | undefined;
};

export type RoomTypeStatus = 'active' | 'draft' | 'inactive';

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

export type HomepageQueryVariables = Exact<{ [key: string]: never }>;

export type HomepageQuery = {
  homepage: {
    featuredHotels: Array<{
      id: string;
      name: string;
      brand: string | null;
      description: string | null;
      hotelType: string | null;
      city: string | null;
      countryCode: string | null;
      starRating: number | null;
      status: HotelStatus;
      averageRating: number | null;
      defaultCurrency: string;
      fromPricePerNight: number | null;
      media: Array<{ url: string; altText: string | null }>;
    }>;
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

export type HotelExperiencesQueryVariables = Exact<{
  hotelId: string | number;
}>;

export type HotelExperiencesQuery = {
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

export type HotelReviewsQueryVariables = Exact<{
  hotelId: string | number;
  page?: PageInput | null | undefined;
}>;

export type HotelReviewsQuery = {
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

export type HotelsQueryVariables = Exact<{
  input?: HotelSearchInput | null | undefined;
}>;

export type HotelsQuery = {
  hotels: {
    total: number;
    page: number;
    size: number;
    items: Array<{
      id: string;
      name: string;
      brand: string | null;
      description: string | null;
      hotelType: string | null;
      city: string | null;
      countryCode: string | null;
      starRating: number | null;
      checkInTime: string | null;
      checkOutTime: string | null;
      defaultCurrency: string;
      status: HotelStatus;
      averageRating: number | null;
      fromPricePerNight: number | null;
      amenities: Array<{ id: string; name: string; category: string | null }>;
      media: Array<{
        id: string;
        url: string;
        altText: string | null;
        category: string | null;
        isPrimary: boolean;
        sortOrder: number;
      }>;
    }>;
  };
};

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
                  name: { kind: 'Name', value: 'featuredHotels' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'city' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'fromPricePerNight' } },
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
} as unknown as DocumentNode<HotelByIdQuery, HotelByIdQueryVariables>;
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
      },
    },
  ],
} as unknown as DocumentNode<HotelRoomTypesQuery, HotelRoomTypesQueryVariables>;
export const HotelExperiencesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelExperiences' },
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
            name: { kind: 'Name', value: 'experiences' },
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
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'durationMinutes' } },
                { kind: 'Field', name: { kind: 'Name', value: 'priceAmount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'currencyCode' } },
                { kind: 'Field', name: { kind: 'Name', value: 'location' } },
                { kind: 'Field', name: { kind: 'Name', value: 'sortOrder' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelExperiencesQuery, HotelExperiencesQueryVariables>;
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
export const HotelReviewsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HotelReviews' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'PageInput' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'reviews' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'hotelId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'hotelId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
            ],
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
        ],
      },
    },
  ],
} as unknown as DocumentNode<HotelReviewsQuery, HotelReviewsQueryVariables>;
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
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RoomTypeByIdQuery, RoomTypeByIdQueryVariables>;
export const HotelsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Hotels' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'HotelSearchInput' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hotels' },
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
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'hotelType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'city' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'countryCode' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'starRating' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'checkInTime' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'checkOutTime' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'defaultCurrency' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'averageRating' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'fromPricePerNight' } },
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
      },
    },
  ],
} as unknown as DocumentNode<HotelsQuery, HotelsQueryVariables>;
