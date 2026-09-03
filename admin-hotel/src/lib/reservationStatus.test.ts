import { describe, expect, it } from 'vitest';
import { PaymentStatus, ReservationStatus } from '@/graphql/generated/graphql';
import { isPayAtProperty, paymentStatusDisplay, refundStatusNote } from './reservationStatus';

function roomLine(paymentTiming: string) {
  return { paymentTiming } as never;
}

describe('isPayAtProperty', () => {
  it('is false for a reservation with no room lines', () => {
    expect(isPayAtProperty({ roomLines: [] })).toBe(false);
  });

  it('is true when every room line is pay_at_property', () => {
    expect(
      isPayAtProperty({ roomLines: [roomLine('pay_at_property'), roomLine('pay_at_property')] })
    ).toBe(true);
  });

  it('is false when even one room line is prepaid (mixed timing)', () => {
    expect(
      isPayAtProperty({ roomLines: [roomLine('pay_at_property'), roomLine('prepay_full')] })
    ).toBe(false);
  });
});

// Regression coverage for a real fix: a bare `paymentStatus: 'pending'` used
// to render as an unqualified "Pending" badge for pay-at-property bookings
// (nothing owed online, by design) and for cancelled-and-never-charged
// bookings (nothing to collect or refund) — both read as "still needs
// attention" when they don't.
describe('paymentStatusDisplay', () => {
  it('reads a cancelled + still-pending booking as "nothing to refund", not "Pending"', () => {
    expect(
      paymentStatusDisplay({
        paymentStatus: PaymentStatus.Pending,
        status: ReservationStatus.Cancelled,
        roomLines: [roomLine('prepay_full')],
      })
    ).toEqual({ value: 'not_charged', label: 'Nothing to refund' });
  });

  it('reads a live pay-at-property booking as "due at hotel", not "Pending"', () => {
    expect(
      paymentStatusDisplay({
        paymentStatus: PaymentStatus.Pending,
        status: ReservationStatus.Confirmed,
        roomLines: [roomLine('pay_at_property')],
      })
    ).toEqual({ value: 'due_at_property', label: 'Due at hotel' });
  });

  it('cancellation is checked before pay-at-property: a cancelled pay-at-property booking still reads as nothing to refund', () => {
    expect(
      paymentStatusDisplay({
        paymentStatus: PaymentStatus.Pending,
        status: ReservationStatus.Cancelled,
        roomLines: [roomLine('pay_at_property')],
      })
    ).toEqual({ value: 'not_charged', label: 'Nothing to refund' });
  });

  it('leaves a genuinely pending prepay booking as plain Pending', () => {
    expect(
      paymentStatusDisplay({
        paymentStatus: PaymentStatus.Pending,
        status: ReservationStatus.Confirmed,
        roomLines: [roomLine('prepay_full')],
      })
    ).toEqual({ value: 'pending' });
  });

  it('passes every other payment status through unchanged, case-normalized', () => {
    // Defensive lowercasing beyond what the declared enum contract
    // guarantees — cast deliberately to exercise it.
    expect(
      paymentStatusDisplay({
        paymentStatus: 'CAPTURED' as PaymentStatus,
        status: ReservationStatus.Confirmed,
        roomLines: [],
      })
    ).toEqual({ value: 'captured' });
  });
});

describe('refundStatusNote', () => {
  it('says nothing was collected when payment was never captured', () => {
    expect(refundStatusNote({ paymentStatus: PaymentStatus.Pending, cancellation: null })).toBe(
      'No payment was ever collected — nothing to refund.'
    );
    expect(refundStatusNote({ paymentStatus: PaymentStatus.Failed, cancellation: null })).toBe(
      'No payment was ever collected — nothing to refund.'
    );
  });

  it('reports a full refund', () => {
    expect(refundStatusNote({ paymentStatus: PaymentStatus.Refunded, cancellation: null })).toBe(
      'Refunded in full.'
    );
  });

  it('reports a partial refund with the cancellation-fee explanation', () => {
    expect(
      refundStatusNote({ paymentStatus: PaymentStatus.PartiallyRefunded, cancellation: null })
    ).toBe('Partially refunded — a cancellation fee applied.');
  });

  it('reports a non-refundable rate when captured but the cancellation carries a zero refund amount', () => {
    expect(
      refundStatusNote({
        paymentStatus: PaymentStatus.Captured,
        cancellation: { refundAmount: 0 } as never,
      })
    ).toBe('Non-refundable rate — no refund applies.');
  });

  it('falls back to "not yet processed" when captured and refundable but no zero-amount cancellation is present', () => {
    expect(refundStatusNote({ paymentStatus: PaymentStatus.Captured, cancellation: null })).toBe(
      'Refund not yet processed.'
    );
  });
});
