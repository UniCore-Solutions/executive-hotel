import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    startPaymentAttemptMock: vi.fn(),
    pushMock: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixtures.pushMock }),
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
  startPaymentAttempt: (...args: unknown[]) => fixtures.startPaymentAttemptMock(...args),
}));

const { createMock, startPaymentAttemptMock, pushMock } = fixtures;

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
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reuses the same idempotency key across a synchronous-failure retry, and derives a stable payment key from it', async () => {
    createMock.mockResolvedValue({
      reservation: { id: 'res-1', reference: 'RC-TEST01' },
      created: true,
    });
    // A synchronous failure (network/validation) is the only case BookingFlow
    // itself still surfaces as a declined banner — the async simulated
    // outcome (success/decline) is discovered later on the processing screen,
    // never in this form (see BOOKING_PAYMENT_UX_PLAN §5).
    startPaymentAttemptMock
      .mockRejectedValueOnce(new Error('Network error — please check your connection'))
      .mockResolvedValueOnce({ paymentId: 'pay-1' });

    render(wrap());
    await fillDetailsAndAdvance();
    fillCard();

    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(startPaymentAttemptMock).toHaveBeenCalledTimes(1));
    await screen.findByText(/Network error/);

    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(startPaymentAttemptMock).toHaveBeenCalledTimes(2));

    const firstReservationKey = (createMock.mock.calls[0]![0] as { idempotencyKey: string })
      .idempotencyKey;
    const secondReservationKey = (createMock.mock.calls[1]![0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(secondReservationKey).toBe(firstReservationKey);

    const firstPaymentKey = (startPaymentAttemptMock.mock.calls[0]![0] as { idempotencyKey: string })
      .idempotencyKey;
    const secondPaymentKey = (startPaymentAttemptMock.mock.calls[1]![0] as { idempotencyKey: string })
      .idempotencyKey;
    expect(firstPaymentKey).toBe(secondPaymentKey);
    expect(firstPaymentKey).toBe(`${firstReservationKey}:payment`);

    // startPaymentAttempt() also receives the guest email as accountless-checkout proof.
    expect((startPaymentAttemptMock.mock.calls[0]![0] as { guestEmail?: string }).guestEmail).toBe(
      'amine@example.com'
    );

    // Never calls a capture endpoint directly — the backend settles asynchronously.
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining('/confirmation?ref=RC-TEST01&email=amine%40example.com&status=processing')
      )
    );
  });

  it('persists the idempotency key to sessionStorage so a reload before payment resolves does not double-book', async () => {
    createMock.mockResolvedValue({
      reservation: { id: 'res-1', reference: 'RC-TEST01' },
      created: true,
    });
    // Deliberately never resolves — this reproduces the exact gap the
    // sessionStorage persistence exists for: a reload happening WHILE the
    // payment attempt is still in flight (before success/failure and before
    // the successful-attempt cleanup below would otherwise clear the key).
    startPaymentAttemptMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(wrap());
    await fillDetailsAndAdvance();
    fillCard();
    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(startPaymentAttemptMock).toHaveBeenCalledTimes(1));
    const keyBeforeReload = (createMock.mock.calls[0]![0] as { idempotencyKey: string }).idempotencyKey;

    // Simulate a reload: unmount and mount a fresh instance (a real reload
    // creates a brand-new component tree, exactly like this does) — the
    // stored key must still be there since the in-flight attempt above never
    // reached the success cleanup.
    unmount();
    startPaymentAttemptMock.mockResolvedValue({ paymentId: 'pay-1' });
    render(wrap());
    await fillDetailsAndAdvance();
    fillCard();
    fireEvent.click(screen.getByText('Confirm & pay'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2));
    const keyAfterReload = (createMock.mock.calls[1]![0] as { idempotencyKey: string }).idempotencyKey;

    expect(keyAfterReload).toBe(keyBeforeReload);
  });
});
