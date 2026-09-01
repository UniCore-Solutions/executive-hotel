import { z } from 'zod';

export const cancelReservationSchema = z.object({
  reasonCode: z.string().min(1, 'Choose a reason'),
  reasonNote: z.string().max(500).optional(),
});
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;

/**
 * The backend's `cancellation_reasons` reference table (6 active rows,
 * verified live 2026-09-01) has no GraphQL query exposing it — unlike
 * `countries`, which does. Hardcoded here as a discovered backend gap
 * (see docs/ADMIN_REBUILD_PROGRESS.md, "Backend gaps found during
 * implementation"). Revisit if the table changes.
 */
export const CANCELLATION_REASONS = [
  { value: 'guest_changed_plans', label: 'Guest changed plans' },
  { value: 'guest_duplicate_booking', label: 'Duplicate booking' },
  { value: 'guest_found_cheaper', label: 'Guest found a better price' },
  { value: 'guest_no_show_policy', label: 'No-show policy applied' },
  { value: 'payment_timeout', label: 'Payment hold expired before payment completed' },
  { value: 'property_issue', label: 'Issue with the property' },
] as const;
