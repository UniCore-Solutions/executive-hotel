/** Homepage curated sections — sourced from the backend homepage query.
    Falls back to empty sections when mock mode is on or the backend is
    unreachable (the page then renders its fixture sections instead). */
import { HomepageDocument, type HomepageQuery } from '@/graphql/generated/graphql';
import { gqlRequest, useGraphql } from './graphqlClient';

export type HomepageHotel = HomepageQuery['homepage']['featuredHotels'][number];
export type HomepageRoomType = HomepageQuery['homepage']['featuredRoomTypes'][number];
export type HomepageExperience = HomepageQuery['homepage']['featuredExperiences'][number];
export type HomepageReview = HomepageQuery['homepage']['featuredReviews'][number];

export interface HomepageData {
  hotels: HomepageHotel[];
  roomTypes: HomepageRoomType[];
  experiences: HomepageExperience[];
  reviews: HomepageReview[];
}

export const EMPTY_HOMEPAGE: HomepageData = {
  hotels: [],
  roomTypes: [],
  experiences: [],
  reviews: [],
};

export async function getHomepage(): Promise<HomepageData> {
  if (!useGraphql) return EMPTY_HOMEPAGE;
  try {
    const { homepage } = await gqlRequest(HomepageDocument, {});
    return {
      hotels: homepage.featuredHotels,
      roomTypes: homepage.featuredRoomTypes,
      experiences: homepage.featuredExperiences,
      reviews: homepage.featuredReviews,
    };
  } catch {
    return EMPTY_HOMEPAGE;
  }
}