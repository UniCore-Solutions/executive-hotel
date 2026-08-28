import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/context/ToastContext';
import { ApolloProvider } from '@/api/apollo/provider';
import BookingFlow from './BookingFlow';

/**
 * Proves the Task 3 frontend fix: the reservation idempotency key is
 * generated once per mounted checkout attempt and reused on retry (a
 * decline followed by "try again" must NOT mint a new key — see
 * docs/investigations/TASK2-TASK3-CURRENCY-AND-ATOMICITY.md).
 */

const fixtures = vi.hoisted(() => {
  const searchState = {
    checkin: new Date(2026, 8, 10),
    checkout: new Date(2026, 8, 12),
    adults: 2,
    children: 0,
    childrenAges: [] as number[],
    rooms: 1,
    promo: '',
    currency: 'MAD' as const,
  };

  const stayRoom = {
    property: {
      id: 'hotel-1',
      name: 'Test Hotel',
      brand: 'Test',
      city: 'Rabat',
      area: 'Agdal',
      type: 'hotel',
      tagline: '',
      rating: 4,
      reviewCount: 0,
      checkIn: '15:00',
      checkOut: '11:00',
      description: '',
      longDescription: '',
      amenities: [],
      highlights: [],
      location: { address: '', mapImage: '', distances: [] },
      facilities: [],
      restaurants: [],
      experiences: [],
      policies: [],
      faq: { general: [], bookings: [], atTheProperty: [] },
      gallery: [],
      reviews: [],
      images: [],
      rooms: [],
    },
    room: {
      id: 'room-1',
      name: 'Test Room',
      images: [],
      description: '',
      capacity: { adults: 2, children: 0 },
      bed: '1 double bed',
      size: '',
      category: 'standard',
      amenities: [],
      pricePerNight: 500,
      cancellationPolicy: '',
      availability: 'available',
      importantInfo: [],
      hotelId: 'hotel-1',
    },
    availability: 'available',
    plans: [
      {
        id: 'room-1::bb',
        backendRatePlanId: 'rp-1',
        name: 'Bed & Breakfast',
        mealPlan: 'bb',
        price: 500,
        cancellationPolicy: '',
        benefits: [],
        freeCancellation: true,
      },
    ],
    fits: true,
    siblingRooms: [],
  };

  return {
    searchState,
    stayRoom,
    createMock: vi.fn(),
    chargeMock: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ fmt: (n: number) => `MAD ${n}`, currency: 'MAD' }),
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ session: null }),
}));

vi.mock('@/context/SearchContext', () => ({
  useSearch: () => ({ state: fixtures.searchState, setPromo: vi.fn() }),
}));

vi.mock('@/services/pricingHydration', () => ({
  ensurePricingSources: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/catalog', () => ({
  getStayRoom: vi.fn().mockResolvedValue(fixtures.stayRoom),
}));

vi.mock('@/services/extras', () => ({
  getExtras: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/quote', () => ({
  getQuote: vi.fn().mockResolvedValue({
    quote: {
      perNight: 500,
      nights: 2,
      rooms: 1,
      roomSubtotal: 1000,
      discount: 0,
      taxedBase: 1000,
      taxes: 100,
      taxAmount: 100,
      feeAmount: 0,
      taxRate: 0.1,
      extrasTotal: 0,
      total: 1100,
      originalTotal: 1100,
      currency: 'MAD',
    },
    raw: { valid: true, message: null, lines: [], extras: [] },
  }),
  mapQuoteExtraLines: vi.fn().mockReturnValue([]),
}));

vi.mock('@/services/reservations', () => ({
  reservations: { create: (...args: unknown[]) => fixtures.createMock(...args) },
  generateIdempotencyKey: () => `bk-${Math.random().toString(36).slice(2)}`,
}));

vi.mock('@/services/payment', () => ({
  charge: (...args: unknown[]) => fixtures.chargeMock(...args),
}));

const { createMock, chargeMock } = fixtures;

function wrap() {
  return (
    <ApolloProvider>
      <ToastProvider>
        <BookingFlow roomId="room-1" planId="room-1::bb" initialExtras="" />
      </ToastProvider>
    </ApolloProvider>
  );
}

async function fillDetailsAndAdvance() {
  await screen.findByLabelText(/First name/i);
  fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'Amine' } });
  fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Idrissi' } });
  fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'amine@example.com' } });
  // Not `screen.getByLabelText(/^Phone/i)`: react-phone-number-input's country
  // select carries `aria-label="Phone number country"`, which also matches —
  // query the actual number input by its forwarded id instead.
  fireEvent.change(document.getElementById('f-phone') as HTMLInputElement, {
    target: { value: '+212600000000' },
  });
  fireEvent.click(screen.getByText(/Continue to payment/));
  await screen.findByLabelText(/Card number/i);
}

function fillCard() {
  fireEvent.change(screen.getByLabelText(/Name on card/i), { target: { value: 'Amine Idrissi' } });
  fireEvent.change(screen.getByLabelText(/Card number/i), { target: { value: '4111111111111111' } });
  fireEvent.change(screen.getByLabelText(/Expiry/i), { target: { value: '12/30' } });
  fireEvent.change(screen.getByLabelText(/CVC/i), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('BookingFlow — reservation idempotency key stability (Task 3)', () => {
  it('reuses the same idempotency key across a decline-then-retry, and derives a stable payment key from it', async () => {
    createMock.mockResolvedValue({
      reservation: { id: 'res-1', reference: 'RC-TEST01' },
      created: true,
    });
    chargeMock
      .mockResolvedValueOnce({ ok: false, message: 'Card declined by issuer.' })
      .mockResolvedValueOnce({ ok: true, message: 'Payment authorised' });

    render(wrap());
    await fillDetailsAndAdvance();
    fillCard();

    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(chargeMock).toHaveBeenCalledTimes(1));
    await screen.findByText(/Payment declined/);

    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(chargeMock).toHaveBeenCalledTimes(2));

    const firstReservationKey = (createMock.mock.calls[0]![0] as { idempotencyKey: string })
      .idempotencyKey;
    const secondReservationKey = (createMock.mock.calls[1]![0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(secondReservationKey).toBe(firstReservationKey);

    const firstPaymentKey = (chargeMock.mock.calls[0]![0] as { idempotencyKey: string })
      .idempotencyKey;
    const secondPaymentKey = (chargeMock.mock.calls[1]![0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(firstPaymentKey).toBe(secondPaymentKey);
    expect(firstPaymentKey).toBe(`${firstReservationKey}:payment`);

    // charge() also receives the guest email as accountless-checkout proof.
    expect((chargeMock.mock.calls[0]![0] as { guestEmail?: string }).guestEmail).toBe(
      'amine@example.com'
    );
  });
});
