/** Reservation service — reads via GraphQL (through the Apollo cache in the
    browser), writes via REST (API rule: GraphQL = READ, REST = WRITE/ACTION).
    The cache is evicted by src/api/invalidation.ts after every REST write,
    so cached reads never go stale. */
import { gqlRequest } from './graphqlClient';
import { getApolloClient, toGraphqlClientError } from '@/api/apollo/client';
import { cancelReservation as cancelReservationRest, createReservation as createReservationRest } from '@/api/rest/endpoints';
import type {
  MyReservationsQuery,
  ReservationLookupQuery,
  ReservationLookupQueryVariables,
  ReservationLookupInput,
  ReservationStatus,
  PaymentStatus,
} from '@/graphql/generated/graphql';
import { MyReservationsDocument, ReservationLookupDocument } from '@/graphql/generated/graphql';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface AuthResult {
  ok: boolean;
  message?: string;
}

/** Backend reservation shape (from GraphQL). */
export interface BackendReservation {
  id: string;
  reference: string;
  hotelId: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  totalAmount: number;
  source: string;
  notes?: string | null;
  createdAt: string;
  guest: {
    id?: string | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    countryCode?: string | null;
  };
  roomLines: Array<{
    id: string;
    roomTypeId: string;
    ratePlanId: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    ratePerNight: number;
    subtotalAmount: number;
    status: string;
    roomTypeName?: string;
    roomTypeImageUrl?: string | null;
    ratePlanName?: string | null;
    isRefundable: boolean;
    freeCancellationUntil?: string | null;
  }>;
  extras: Array<{
    id: string;
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  charges: Array<{
    id: string;
    name: string;
    chargeType: string;
    amount: number;
  }>;
  cancellation?: {
    id: string;
    reason?: string | null;
    reasonNote?: string | null;
    isRefundable: boolean;
    penaltyAmount: number;
    refundAmount: number;
    cancelledAt: string;
  } | null;
}

/* ── Idempotency key ────────────────────────────────────────────────── */

export function generateIdempotencyKey(): string {
  return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ── CRUD ───────────────────────────────────────────────────────────── */

/** Browser reads go through the Apollo cache (cache-first); REST writes
    evict the affected queries via src/api/invalidation.ts, so a later read
    refetches. Server-side (no Apollo) falls back to the stateless helper. */

export const reservations = {
  /** List all reservations for the current user. */
  async list(): Promise<BackendReservation[]> {
    const client = getApolloClient();
    if (client) {
      try {
        const { data } = await client.query({
          query: MyReservationsDocument,
          variables: {},
          fetchPolicy: 'cache-first',
        });
        return (data as MyReservationsQuery).myReservations as BackendReservation[];
      } catch (err) {
        // Apollo throws its own error type; callers branch on GraphqlClientError.
        throw toGraphqlClientError(err);
      }
    }
    const data = await gqlRequest(MyReservationsDocument, {});
    return (data as MyReservationsQuery).myReservations as BackendReservation[];
  },

  /**
   * Look up a reservation by reference + email. `fresh: true` bypasses the
   * Apollo cache entirely (`no-cache`) — required by the payment-status
   * poller (BookingFlow → processing screen), which would otherwise keep
   * reading a stale cached `pending` after the backend has already resolved
   * the payment; every other caller keeps the default cache-first read.
   */
  async find(reference: string, email: string, opts?: { fresh?: boolean }): Promise<BackendReservation | null> {
    const input: ReservationLookupInput = { reference, email };
    const variables = { input } as ReservationLookupQueryVariables;
    const client = getApolloClient();
    if (client) {
      try {
        const { data } = await client.query({
          query: ReservationLookupDocument,
          variables,
          fetchPolicy: opts?.fresh ? 'no-cache' : 'cache-first',
        });
        return (data as ReservationLookupQuery).reservation as BackendReservation | null;
      } catch (err) {
        // Apollo throws its own error type; callers branch on GraphqlClientError.
        throw toGraphqlClientError(err);
      }
    }
    const data = await gqlRequest(ReservationLookupDocument, variables);
    return (data as ReservationLookupQuery).reservation as BackendReservation | null;
  },

  /** Create a reservation via REST (POST /api/v1/reservations). Transaction
      currency is always MAD — the display currency the guest has selected is
      never accepted here, so it cannot leak into the persisted reservation. */
  async create(input: {
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    guest: { firstName: string; lastName: string; email: string; phone?: string; countryCode?: string };
    rooms: Array<{ roomTypeId: string; ratePlanId: string }>;
    extras?: Array<{ extraId: string; quantity: number }>;
    promoCode?: string;
    arrivalSlot?: string;
    specialRequests?: string;
    idempotencyKey: string;
  }): Promise<{ reservation: BackendReservation; created: boolean }> {
    const result = await createReservationRest(input);
    return {
      reservation: result.reservation as unknown as BackendReservation,
      created: result.created,
    };
  },

  /** Cancel a reservation via REST (POST /api/v1/reservations/{reference}/cancel). */
  async cancel(reference: string, email: string, reasonCode?: string, reasonNote?: string): Promise<BackendReservation> {
    const result = await cancelReservationRest({ reference, email, reasonCode, reasonNote });
    return result as BackendReservation;
  },
};

/* ── Legacy compatibility (bookingKey) ──────────────────────────────── */
/* Kept for BookingFlow.tsx transition; will be removed once the flow
   is fully rewritten to use backend idempotency. */

const BK_KEY: { key: string; item: string; finished: boolean } = {
  key: '',
  item: '',
  finished: false,
};

export const bookingKey = {
  begin(item: string): { key: string; exitRef: string | null } {
    BK_KEY.item = item;
    BK_KEY.key = generateIdempotencyKey();
    BK_KEY.finished = false;
    return { key: BK_KEY.key, exitRef: null };
  },

  get(): { key: string; item: string; finished: boolean } {
    return BK_KEY;
  },

  finish(): void {
    BK_KEY.finished = true;
  },

  clearDone(): void {
    BK_KEY.finished = false;
  },
};
