import type { AdminReservationsQuery } from '@/graphql/generated/graphql';

type ReservationLike = AdminReservationsQuery['adminReservations']['items'][number];

/** All room lines share one payment timing — the backend rejects a booking
    that mixes them — so checking one line would be enough; `every` is the
    defensive version. */
export function isPayAtProperty(reservation: Pick<ReservationLike, 'roomLines'>): boolean {
  return (
    reservation.roomLines.length > 0 &&
    reservation.roomLines.every((line) => line.paymentTiming === 'pay_at_property')
  );
}

/**
 * A bare backend `paymentStatus: 'pending'` means three very different
 * things depending on context, and showing all three as a flat "Pending"
 * badge in a list a staff member is scanning is actively misleading:
 *
 * 1. A prepay booking still genuinely waiting on card capture — real
 *    "Pending", something might need attention.
 * 2. A pay-at-property booking — nothing is owed online by design; this is
 *    the expected, steady state, not a problem.
 * 3. A cancelled booking that was never charged — money was never
 *    collected, so "Pending" reads as "still owed" when in fact there is
 *    nothing to collect or refund; the booking is simply over.
 *
 * Returns a `{ value, label }` pair for `StatusBadge` — `value` picks the
 * tone (see `due_at_property`/`not_charged` in `StatusBadge.tsx`), `label`
 * overrides the humanized text. Every other payment status (captured,
 * failed, refunded, partially_refunded) already reads correctly on its own
 * and passes through unchanged.
 */
export function paymentStatusDisplay(
  reservation: Pick<ReservationLike, 'paymentStatus' | 'status' | 'roomLines'>
): { value: string; label?: string } {
  const status = reservation.paymentStatus.toLowerCase();
  const cancelled = reservation.status.toLowerCase() === 'cancelled';
  if (status === 'pending' && cancelled) {
    return { value: 'not_charged', label: 'Nothing to refund' };
  }
  if (status === 'pending' && isPayAtProperty(reservation)) {
    return { value: 'due_at_property', label: 'Due at hotel' };
  }
  return { value: status };
}

/**
 * Post-cancellation detail line — what actually happened to the guest's
 * money, not an estimate. Same wording as the guest-facing cancellation
 * view (frontend-hotel's ReservationFlow) and backoffice-hotel's
 * reservations page, so a guest and staff member reading the same
 * reservation see the same story.
 */
export function refundStatusNote(
  reservation: Pick<ReservationLike, 'paymentStatus' | 'cancellation'>
): string {
  const status = reservation.paymentStatus.toLowerCase();
  if (status === 'pending' || status === 'failed') {
    return 'No payment was ever collected — nothing to refund.';
  }
  if (status === 'refunded') {
    return 'Refunded in full.';
  }
  if (status === 'partially_refunded') {
    return 'Partially refunded — a cancellation fee applied.';
  }
  if (reservation.cancellation && reservation.cancellation.refundAmount <= 0) {
    return 'Non-refundable rate — no refund applies.';
  }
  return 'Refund not yet processed.';
}
