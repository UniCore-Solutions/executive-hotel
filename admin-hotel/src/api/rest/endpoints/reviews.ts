import { restClient } from '../client';
import type { ReviewModerationStatus } from '@/graphql/generated/graphql';

/** `POST /api/v1/admin/reviews/{id}/moderation` — hotel-scoping enforced
    server-side in `ReviewService#moderate` (staff of the review's hotel, or
    super_admin). `response` is the hotel's optional public reply, stored as
    `Review.responseText`. */
export async function moderateReview(
  reviewId: string,
  input: { status: ReviewModerationStatus; response?: string },
): Promise<unknown> {
  const { data } = await restClient.post(`/admin/reviews/${reviewId}/moderation`, input);
  return data;
}
