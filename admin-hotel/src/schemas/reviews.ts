import { z } from 'zod';

/**
 * Moderation write body — `POST /api/v1/admin/reviews/{id}/moderation`
 * (`AdminReviewRestController.ModerateRequest`). The backend only requires
 * `status`; `response` (the hotel's public reply, stored as
 * `Review.responseText`) is genuinely optional there — no "reason required
 * on reject" rule exists server-side (confirmed in `ReviewServiceImpl#moderate`
 * and `AdminGraphqlIntegrationTest#reviewModerationIsHotelScoped`), so this
 * form doesn't invent one either.
 */
export const moderateReviewSchema = z.object({
  response: z.string().max(2000, 'Keep it under 2000 characters').optional(),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
