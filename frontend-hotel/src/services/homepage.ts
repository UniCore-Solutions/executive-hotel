/** Homepage curated sections — sourced from the backend homepage query.
    Returns empty sections when the backend is unreachable (the page then
    renders its fixture sections instead). */
import { HomepageDocument, type HomepageQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';

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