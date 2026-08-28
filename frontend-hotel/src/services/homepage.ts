/** Homepage curated sections — sourced from the backend homepage query.
    Errors PROPAGATE to the caller (no silent mock fallbacks): if the backend
    cannot provide the content, the page shows the real failure state. */
import { HomepageDocument, type HomepageQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';

export type HomepageRoomType = HomepageQuery['homepage']['featuredRoomTypes'][number];
export type HomepageExperience = HomepageQuery['homepage']['featuredExperiences'][number];
export type HomepageReview = HomepageQuery['homepage']['featuredReviews'][number];

export interface HomepageData {
  roomTypes: HomepageRoomType[];
  experiences: HomepageExperience[];
  reviews: HomepageReview[];
}

export async function getHomepage(): Promise<HomepageData> {
  const { homepage } = await gqlRequest(HomepageDocument, {});
  return {
    roomTypes: homepage.featuredRoomTypes,
    experiences: homepage.featuredExperiences,
    reviews: homepage.featuredReviews,
  };
}
