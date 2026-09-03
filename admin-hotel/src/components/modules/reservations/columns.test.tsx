import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentStatus, ReservationStatus } from '@/graphql/generated/graphql';
import { reservationColumns, type ReservationRow } from './columns';

function cellFor(id: string, original: ReservationRow) {
  const col = reservationColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: ReservationRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function reservation(overrides: Partial<ReservationRow>): ReservationRow {
  return {
    id: 'res1',
    reference: 'RC-ABC123',
    guest: { firstName: 'Ines', lastName: 'Testeur', email: null },
    checkInDate: '2026-09-10',
    checkOutDate: '2026-09-12',
    roomLines: [{ paymentTiming: 'prepay_full' }],
    status: ReservationStatus.Confirmed,
    paymentStatus: PaymentStatus.Captured,
    totalAmount: 1200,
    ...overrides,
  } as ReservationRow;
}

describe('reservationColumns — rooms', () => {
  it('singularizes "room" for exactly one room line', () => {
    render(<>{cellFor('rooms', reservation({ roomLines: [{ paymentTiming: 'prepay_full' }] as ReservationRow['roomLines'] }))}</>);
    expect(screen.getByText('1 room')).toBeInTheDocument();
  });

  it('pluralizes "rooms" for more than one room line', () => {
    render(
      <>
        {cellFor(
          'rooms',
          reservation({
            roomLines: [{ paymentTiming: 'prepay_full' }, { paymentTiming: 'prepay_full' }] as ReservationRow['roomLines'],
          })
        )}
      </>
    );
    expect(screen.getByText('2 rooms')).toBeInTheDocument();
  });
});

describe('reservationColumns — payment (wired through the real paymentStatusDisplay)', () => {
  it('reads a pending pay-at-property booking as "Due at hotel", not a bare Pending badge', () => {
    render(
      <>
        {cellFor(
          'payment',
          reservation({
            paymentStatus: PaymentStatus.Pending,
            status: ReservationStatus.Confirmed,
            roomLines: [{ paymentTiming: 'pay_at_property' }] as ReservationRow['roomLines'],
          })
        )}
      </>
    );
    expect(screen.getByText('Due at hotel')).toBeInTheDocument();
  });

  it('reads a cancelled + pending booking as "Nothing to refund"', () => {
    render(
      <>
        {cellFor(
          'payment',
          reservation({ paymentStatus: PaymentStatus.Pending, status: ReservationStatus.Cancelled })
        )}
      </>
    );
    expect(screen.getByText('Nothing to refund')).toBeInTheDocument();
  });
});

describe('reservationColumns — guest', () => {
  it('omits the email line when the guest has none on file', () => {
    const { container } = render(<>{cellFor('guest', reservation({ guest: { firstName: 'Ines', lastName: 'Testeur', email: null } as ReservationRow['guest'] }))}</>);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
