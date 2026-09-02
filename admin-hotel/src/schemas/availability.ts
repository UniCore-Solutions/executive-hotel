import { z } from 'zod';

/**
 * Block / out-of-order range form. The backend (`AvailabilityRangeInput`,
 * `PUT /admin/availability/hotels/{hotelId}`) SETS `blocked`/`outOfOrder`
 * to these exact counts for every day in [fromDate, toDate] — it does not
 * add to whatever is already there. The form always shows the counts that
 * apply today (see AvailabilityBlockSheet) so submitting without changes is
 * a no-op, not a silent reset to zero.
 */
export const availabilityRangeSchema = z
  .object({
    roomTypeId: z.string().min(1, 'Room type is required'),
    fromDate: z.string().min(1, 'Start date is required'),
    toDate: z.string().min(1, 'End date is required'),
    blocked: z.number().int().min(0, 'Cannot be negative').max(999),
    outOfOrder: z.number().int().min(0, 'Cannot be negative').max(999),
  })
  .refine((v) => v.toDate >= v.fromDate, {
    message: 'End date must be on or after the start date',
    path: ['toDate'],
  });
export type AvailabilityRangeFormValues = z.infer<typeof availabilityRangeSchema>;
