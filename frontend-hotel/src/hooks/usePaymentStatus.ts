/** Polls a reservation's payment status after an async payment attempt has
    started — the backend is authoritative and asynchronous (a simulated
    provider settles in the background; see backend-hotel's PaymentServiceImpl),
    so the frontend never assumes success and never marks a payment itself.
    Bypasses the Apollo cache on every poll (`fresh: true`) so a stale
    `pending` read can never mask a settlement that already landed. */
'use client';

import { useEffect, useRef, useState } from 'react';
import { reservations, type BackendReservation } from '@/services/reservations';
import { GraphqlClientError } from '@/services/graphqlClient';

export const PAYMENT_POLL_INTERVAL_MS = 2000;
export const PAYMENT_POLL_MAX_ATTEMPTS = 60; // 60 x 2s = 120s (2 min) ceiling

export type PaymentPollState =
  | { phase: 'processing' }
  | { phase: 'confirmed'; reservation: BackendReservation }
  | { phase: 'failed'; reservation: BackendReservation }
  | { phase: 'timeout' }
  | { phase: 'error'; message: string };

/** `enabled: false` leaves the hook idle (e.g. no reference/email known yet). */
export function usePaymentStatus(reference: string, email: string, enabled: boolean): PaymentPollState {
  const [state, setState] = useState<PaymentPollState>({ phase: 'processing' });
  const attempts = useRef(0);

  useEffect(() => {
    if (!enabled || !reference || !email) return undefined;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    attempts.current = 0;

    const tick = async () => {
      let outcome: BackendReservation | undefined;
      try {
        outcome = await reservations.find(reference, email, { fresh: true });
      } catch (err) {
        if (!alive) return;
        /* A miss is terminal — polling can never turn it into a hit, and
           swallowing it as "transient" left the guest watching a spinner
           until the 2-minute ceiling. Anything else (network blip, gateway
           restart) really is transient, so keep polling. */
        if (err instanceof GraphqlClientError && err.code === 'NOT_FOUND') {
          setState({ phase: 'error', message: err.message });
          return;
        }
        outcome = undefined;
      }
      if (!alive) return;

      if (outcome) {
        if (outcome.paymentStatus === 'captured') {
          setState({ phase: 'confirmed', reservation: outcome });
          return;
        }
        if (outcome.paymentStatus === 'failed') {
          setState({ phase: 'failed', reservation: outcome });
          return;
        }
      }

      attempts.current += 1;
      if (attempts.current >= PAYMENT_POLL_MAX_ATTEMPTS) {
        setState({ phase: 'timeout' });
        return;
      }
      timer = setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [reference, email, enabled]);

  return state;
}
