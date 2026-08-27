import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import CheckinFlow from './CheckinFlow';
import type { BackendReservation } from '@/services/reservations';

let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={href ? String(href) : '#'} {...rest}>
      {children}
    </a>
  ),
}));

const mockReservation: BackendReservation = {
  id: 'test-id',
  reference: 'RC-TEST1',
  hotelId: 'hotel-1',
  status: 'confirmed',
  paymentStatus: 'captured',
  checkInDate: '2026-09-12',
  checkOutDate: '2026-09-14',
  adults: 2,
  children: 0,
  currencyCode: 'MAD',
  subtotalAmount: 1820,
  discountAmount: 0,
  taxAmount: 218,
  feeAmount: 0,
  totalAmount: 2038,
  source: 'web',
  createdAt: '2026-08-01T00:00:00Z',
  guest: {
    firstName: 'Adam',
    lastName: 'Benali',
    email: 'demo@hotelcollection.com',
    phone: '+212 6 61 23 45 67',
  },
  roomLines: [
    {
      id: 'line-1',
      roomTypeId: 'standard-double',
      ratePlanId: 'standard-double::bb',
      checkInDate: '2026-09-12',
      checkOutDate: '2026-09-14',
      nights: 2,
      ratePerNight: 910,
      subtotalAmount: 1820,
      status: 'active',
    },
  ],
  extras: [],
  charges: [],
};

vi.mock('@/services/reservations', () => ({
  reservations: {
    find: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    cancel: vi.fn(),
  },
  generateIdempotencyKey: vi.fn().mockReturnValue('bk-test-123'),
}));

vi.mock('@/services/extras', () => ({
  getExtras: vi.fn().mockResolvedValue([]),
}));

function wrap() {
  return (
    <ToastProvider>
      <CheckinFlow />
    </ToastProvider>
  );
}

describe('CheckinFlow', () => {
  it('shows Booking not found when no ref is given', async () => {
    params = new URLSearchParams('');
    render(wrap());
    expect(await screen.findByText('Booking not found')).toBeInTheDocument();
  });

  it('shows email form for a ref', async () => {
    params = new URLSearchParams('ref=RC-TEST1');
    render(wrap());
    expect(
      await screen.findByText('Enter your booking reference and email to start check-in.')
    ).toBeInTheDocument();
  });

  it('shows the all-checked-in state when lookup returns a checked_in reservation', async () => {
    const { reservations } = await import('@/services/reservations');
    vi.mocked(reservations.find).mockResolvedValue({
      ...mockReservation,
      status: 'checked_in',
    });
    params = new URLSearchParams('ref=RC-TEST1');
    render(wrap());
    const emailInput = await screen.findByLabelText(/Email used at booking/);
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.type(emailInput, 'demo@hotelcollection.com');
    const findBtn = await screen.findByText('Find my booking');
    await userEvent.click(findBtn);
    expect(await screen.findByText("You're all checked in")).toBeInTheDocument();
    expect(screen.getByText('RC-TEST1')).toBeInTheDocument();
  });
});
