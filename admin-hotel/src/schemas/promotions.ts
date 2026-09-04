import { z } from 'zod';

/**
 * Promotion create/update form. Mirrors `AdminPromotionInput`
 * (backend-hotel `dto/rate/AdminPromotionInput.java`) and the DB CHECK
 * constraints in `V4__pricing_promotions.sql` (`promotions` table):
 * `chk_promotions_discount_value` (> 0), `chk_promotions_percentage`
 * (percentage discounts <= 100), `chk_promotions_min_nights` (1-365),
 * `chk_promotions_max_usage_total`/`_per_guest` (> 0),
 * `chk_promotions_booking_window`/`_stay_window` (end >= start),
 * `chk_promotions_days` (comma-joined MON..SUN, no spaces).
 *
 * `applicableDaysOfWeek` is a `string[]` of day codes in the form — the
 * checkbox-list `MultiSelectField` needs an array value — joined back to the
 * backend's comma-separated `VARCHAR(20)` shape on submit (an empty array
 * means "no restriction, all days", sent as `undefined`/null, same
 * nullable-sentinel pattern as rate plans' `cancellationPenaltyType`).
 *
 * There is no admin API for `promotion_eligible_room_types`/
 * `promotion_eligible_rate_plans` (tables exist, zero read/write surface —
 * ground-truthed against `AdminRateRestController` and `rate.graphqls`) —
 * only the all-or-nothing `appliesToAllRoomTypes`/`appliesToAllRatePlans`
 * booleans are exposed, so that's all this form can offer.
 */
export const DAY_OF_WEEK_OPTIONS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
] as const;

export const promotionSchema = z
  .object({
    code: z
      .string()
      .min(2, 'Code is required')
      .max(30)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, - and _ only'),
    name: z.string().min(2, 'Name is required').max(150),
    description: z.string().max(4000).optional(),
    discountType: z.enum(['percentage', 'fixed_amount', 'stay_x_pay_y']),
    discountValue: z.number().positive('Discount value must be greater than 0'),
    bookingWindowStart: z.string().optional(),
    bookingWindowEnd: z.string().optional(),
    stayWindowStart: z.string().optional(),
    stayWindowEnd: z.string().optional(),
    minNights: z.number().int().min(1).max(365).optional(),
    maxUsageTotal: z.number().int().positive().optional(),
    maxUsagePerGuest: z.number().int().positive().optional(),
    stackable: z.boolean(),
    appliesToAllRoomTypes: z.boolean(),
    appliesToAllRatePlans: z.boolean(),
    applicableDaysOfWeek: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])),
    status: z.enum(['active', 'inactive', 'expired']),
  })
  .superRefine((values, ctx) => {
    if (values.discountType === 'percentage' && values.discountValue > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: 'A percentage discount cannot exceed 100',
      });
    }
    if (
      values.bookingWindowStart &&
      values.bookingWindowEnd &&
      values.bookingWindowEnd < values.bookingWindowStart
    ) {
      ctx.addIssue({ code: 'custom', path: ['bookingWindowEnd'], message: 'Must be on or after the start date' });
    }
    if (values.stayWindowStart && values.stayWindowEnd && values.stayWindowEnd < values.stayWindowStart) {
      ctx.addIssue({ code: 'custom', path: ['stayWindowEnd'], message: 'Must be on or after the start date' });
    }
  });
export type PromotionFormValues = z.infer<typeof promotionSchema>;
