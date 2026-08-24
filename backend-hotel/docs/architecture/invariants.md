# Backend Invariants

The non-negotiable rules the backend enforces. Frontend mirrors these where
it can; **the backend is the source of truth** — client-supplied prices are
advisory only.

## Money & pricing

1. **Server-side pricing only.** Client-provided amounts are never trusted;
   `BookingService` recomputes every line from `RatePlanPrice` +
   `TaxFeeType` + promotion. Client price mismatch → VALIDATION.
2. **Nightly rate rule.** A price applies when `valid_from <= check_in <=
   valid_to`; rates are matched per room-type/rate-plan and per night of the
   stay. Cheapest matching rate wins.
3. **Totals identity (C16).** `subtotal = Σ room lines`,
   `total = subtotal − discount + tax + fee + extras` (extras summed per
   extra line), `discount ≥ 0`, `tax ≥ 0`, `fee ≥ 0` — recomputed in code
   (extras-aware since V15; the legacy DB CHECKs `chk_reservations_totals`
   and `chk_reservation_extras_total` were dropped because they predated
   extras and pricing-model multipliers).
4. **Taxes** (`TaxFeeType`, active, per hotel):
   - `percentage` → `(subtotal − discount) × value%`
   - `fixed_per_night` → `value × nights × rooms`
   - `fixed_per_stay` → `value`
   - `fixed_per_guest` → `value × adults`
   Rounding: HALF_UP, 2 decimals, applied per charge line.
5. **Promotions** (`percentage`, `fixed_amount` only):
   - applied when `starts_at <= check_in <= ends_at`, status `active`, code
     matches (case-insensitive);
   - `percentage` on subtotal; `fixed_amount` capped at subtotal (never
     negative totals);
   - `stay_x_pay_y` → **VALIDATION** (unsupported type).

## Booking

6. **Reference format**: `RC-` + 6 chars from
   `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I/L/O/0/1); unique per reservation.
7. **Idempotency**: unique `idempotency_key`; a repeated create returns the
   existing reservation with `created: false`. Frontend retries are safe.
8. **Accountless booking**: reservation is bound to guest + email; lookup is
   by reference + email (case-insensitive email).
9. **No oversell**: availability rows for every night of the stay are locked
   (`PESSIMISTIC_WRITE`) and sold in one transaction; if any night lacks free
   rooms → `CONFLICT`. Capacity is conservative: each room line must fit the
   full party (adults + children). `room_types.total_inventory` can never be
   reduced below the highest (sold + out_of_order + blocked) across nights
   (V18 trigger + `setRoomTypeInventory` pre-check → `CONFLICT`).
10. **Status transitions** are recorded in `reservation_status_history`
    (from, to, actor, note). Cancelling a `checked_in`/`checked_out`
    reservation via self-service → `CONFLICT`.
11. **Cancellation math** (`CancellationPolicy`, mirrors frontend
    `computeRefundAmount`):
    - non-refundable plan → penalty = full subtotal;
    - refundable + cancel ≥ `cancellation_deadline_days` before check-in →
      penalty 0 (frontend "free-cancel" badge);
    - past deadline → `first_night` (one night's rate) or
      `percentage`/`fixed_amount` per plan;
    - `refund = total − penalty` (≥ 0); penalty/refund snapshot on the
      cancellation row; cancelled bookings release inventory.

## Payments

12. **Lifecycle**: `pending → authorized → captured` (also `failed`,
    `refunded`, `partially_refunded`). A payment may not be captured after
    cancellation → VALIDATION.
13. **Overpayment guard**: `paid + amount <= reservation.total`, else
    VALIDATION.
14. **Capture idempotency**: unique `(provider, provider_reference)`; replay
    returns the existing payment.
15. **Mock provider**: absent gateway reference → generated
    `mock-…` reference; real gateway plugs into the `PaymentProvider` port.

## Billing

16. **One invoice per reservation** (`reservation_id` UNIQUE); number
    `INV-<reference>`; `billing_name` required and sourced from the guest;
    items carry quantity, unit price (= total ÷ quantity), total, sort order.
17. Invoice lookup is via the reservation flow; `invoice(id)` in the schema
    is intentionally answered with VALIDATION guidance (no dedicated
    invoice-by-id endpoint).

## Reviews

18. Review requires an actual **checked-out** stay (reservation status
    `checked_out` for the same hotel/user) and a guest profile; public reads
    show only `approved` reviews. Rating aggregates are computed
    (`count`/`avg` over approved), never stored on `hotels`.

## Security

19. `/graphql` is reachable anonymously (accountless booking); protected
    queries/mutations fail with error code `UNAUTHORIZED` (no token) or
    `FORBIDDEN` (token but no permission).
20. **Multi-hotel isolation**: staff access is per hotel
    (`hotel_memberships`); cross-hotel access → `FORBIDDEN`. `super_admin`
    bypasses. No hotel-scoped query bypasses the check.

## Events

21. Booking facts are published through the transactional outbox
    (`event_outbox`), at-least-once, ordered by creation; consumers must be
    idempotent. Rows are claimed atomically (`UPDATE … RETURNING`), retried
    with backoff, and moved to `failed` after `maxAttempts` (manual DLQ
    replay path). A claim that crashes between claim and publish is
    recovered by `OutboxRelay.recoverStaleClaims()`: rows stuck in
    `publishing` for more than 5 minutes (`updated_at`, V17) are released
    back to `pending` (or `failed` when the attempt budget is exhausted).
