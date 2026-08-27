/** Reservation service — calls backend GraphQL API. */
import { gqlRequest, TRANSACTION_CURRENCY } from './graphqlClient';
import type {
  CreateReservationMutation,
  CreateReservationMutationVariables,
  MyReservationsQuery,
  ReservationLookupQuery,
  ReservationLookupQueryVariables,
  CancelReservationMutation,
  CancelReservationMutationVariables,
  CreateReservationInput,
  CancelReservationInput,
  ReservationLookupInput,
  ReservationStatus,
  PaymentStatus,
} from '@/graphql/generated/graphql';
import { CreateReservationDocument, MyReservationsDocument, ReservationLookupDocument, CancelReservationDocument } from '@/graphql/generated/graphql';

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

export const reservations = {
  /** List all reservations for the current user. */
  async list(): Promise<BackendReservation[]> {
    const data = await gqlRequest(MyReservationsDocument, {});
    return (data as MyReservationsQuery).myReservations as BackendReservation[];
  },

  /** Look up a reservation by reference + email. */
  async find(reference: string, email: string): Promise<BackendReservation | null> {
    const input: ReservationLookupInput = { reference, email };
    const data = await gqlRequest(ReservationLookupDocument, { input } as ReservationLookupQueryVariables);
    return (data as ReservationLookupQuery).reservation as BackendReservation | null;
  },

  /** Create a reservation via backend. Transaction currency is always MAD
      (TRANSACTION_CURRENCY) — the display currency the guest has selected is
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
    idempotencyKey: string;
  }): Promise<{ reservation: BackendReservation; created: boolean }> {
    const gqlInput: CreateReservationInput = {
      hotelId: input.hotelId,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      adults: input.adults,
      children: input.children,
      currencyCode: TRANSACTION_CURRENCY,
      guest: input.guest,
      rooms: input.rooms,
      extras: input.extras,
      promoCode: input.promoCode,
      idempotencyKey: input.idempotencyKey,
    };
    const data = await gqlRequest(CreateReservationDocument, { input: gqlInput } as CreateReservationMutationVariables);
    const result = data as CreateReservationMutation;
    return { reservation: result.createReservation.reservation as BackendReservation, created: result.createReservation.created };
  },

  /** Cancel a reservation via backend. */
  async cancel(reference: string, email: string, reasonCode?: string, reasonNote?: string): Promise<BackendReservation> {
    const input: CancelReservationInput = { reference, email, reasonCode, reasonNote };
    const data = await gqlRequest(CancelReservationDocument, { input } as CancelReservationMutationVariables);
    const result = data as CancelReservationMutation;
    return result.cancelReservation.reservation as BackendReservation;
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

  finish(_ref: string): void {
    BK_KEY.finished = true;
  },

  clearDone(): void {
    BK_KEY.finished = false;
  },
};
