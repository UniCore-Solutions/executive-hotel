import { z } from 'zod';

/**
 * Rate plan create/update form. Mirrors `AdminRatePlanInput`
 * (backend-hotel `dto/rate/AdminRatePlanInput.java`) and the DB CHECK
 * constraints in `V4__pricing_promotions.sql`.
 *
 * `mealPlan` is a free VARCHAR(50) with no CHECK constraint — the migration
 * comment suggests `room_only`/`bb`/`half_board`, but the real seed data
 * uses `breakfast` (see `scripts/seed.sql`), so this stays a free-text
 * field rather than a fabricated enum.
 */
export const ratePlanSchema = z.object({
  name: z.string().min(2, 'Name is required').max(150),
  code: z
    .string()
    .min(2, 'Code is required')
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  currencyCode: z
    .string()
    .length(3, 'Use a 3-letter currency code (e.g. MAD)')
    .transform((v) => v.toUpperCase()),
  mealPlan: z.string().max(50).optional(),
  cancellationPolicy: z.string().max(4000).optional(),
  paymentPolicy: z.string().max(4000).optional(),
  isRefundable: z.boolean(),
  cancellationDeadlineDays: z.number().int().min(0).max(365).optional(),
  // 'none' is a UI-only sentinel for "no penalty configured" — the backend
  // column is nullable, but a Radix Select can't carry an empty string
  // value, so this is stripped back to `undefined` before the REST call.
  cancellationPenaltyType: z.enum(['none', 'percentage', 'fixed_amount', 'first_night', 'full_stay']),
  cancellationPenaltyValue: z.number().min(0).optional(),
  paymentTiming: z.enum(['pay_at_property', 'prepay_full', 'prepay_deposit']),
  depositPercentage: z.number().min(0).max(100).optional(),
  minStay: z.number().int().min(1).max(365).optional(),
  maxStay: z.number().int().min(1).max(365).optional(),
  status: z.enum(['active', 'inactive']),
});
export type RatePlanFormValues = z.infer<typeof ratePlanSchema>;

/** One price range row (back-office pricing editor). Inclusive bounds,
    validated against overlap by the backend (409 on save). */
export const ratePlanPriceRowSchema = z.object({
  validFrom: z.string().min(1, 'Start date is required'),
  validTo: z.string().min(1, 'End date is required'),
  priceAmount: z.number().positive('Price must be greater than 0'),
});
export type RatePlanPriceRow = z.infer<typeof ratePlanPriceRowSchema>;
