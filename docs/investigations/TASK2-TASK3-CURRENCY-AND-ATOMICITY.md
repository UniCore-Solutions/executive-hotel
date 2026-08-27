# Task 2 & Task 3 — deep re-investigation

**Date:** 2026-08-27 · **Status:** investigation + design only, nothing implemented.
Every claim below was verified against current source and/or reproduced live against the
running backend (`hotel-backend`) and database (`hotel-platform-postgres`), not inferred
from the earlier plan. Live test data created during verification (2 reservations, 3
payments, 1 test user) was cleaned up via the real `cancelReservation` mutation — see
§Verification log at the end.

---

# TASK 2 — Currency correctness

## What the code actually does (verified fresh, `PricingServiceImpl.java`)

`QuoteInput.currencyCode` is read **exactly once** in the entire pricing engine — at the
very last line of `quote()`, where it's echoed unchanged into the returned `Quote` record:

```java
return new Quote(in.currencyCode(), subtotal, discount, tax, fee, total, originalTotal,
        true, lines, extras, charges, promoMessage);
```

Every number that precedes it (`currentPrice()`, `RatePlanPrice.getPriceAmount()`, tax/fee
calculation, extras pricing) is computed with **zero reference to `currencyCode`** — no
repository query, no branch, no conversion touches it. This is not a bug in the
conversion math; **there is no conversion math**. Confirmed by checking what's actually
stored: every hotel's `default_currency`, every `room_type_rate_plans.currency_code`, and
every `rate_plan_prices` row is `MAD` — live query, zero exceptions across all three
hotels. The only currencies that were ever anything else were three `experiences` rows,
converted to MAD by the already-applied `V21__convert_eur_to_mad.sql` migration. **The
system is already, structurally, MAD-only at the data layer.** `currencyCode` on
`QuoteInput`/`CreateReservationInput`/`CreatePaymentInput` is a pass-through field with no
selection or conversion behavior anywhere behind it.

One second-order effect worth knowing: `extraLines()` **does** check
`in.currencyCode().equals(extra.getCurrencyCode())` and throws
`"extra currency does not match booking currency"` if they differ. Since extras are
seeded in MAD, **any quote that includes an extra and requests a non-MAD `currencyCode`
today fails outright** rather than silently mislabeling. Quotes without extras succeed
and silently mislabel (this is what the live test in the original investigation showed —
it had no extras selected).

## Database constraints (verified in `V6__booking.sql`, `V7__billing_stay.sql`)

- `reservations.currency_code CHAR(3) NOT NULL REFERENCES currencies(code)` — any of the
  6 seeded codes (MAD/USD/EUR/GBP/AED/SAR) is legal, so nothing at the DB layer rejects a
  non-MAD reservation.
- `payments.currency_code CHAR(3) NOT NULL` with **a composite FK**:
  `FOREIGN KEY (reservation_id, currency_code) REFERENCES reservations (id,
  currency_code)`. This means the database **already guarantees** a payment's currency
  exactly matches its own reservation's currency — cross-currency payment/reservation
  mismatches are structurally impossible. This is a real, useful existing guarantee; it
  just doesn't help because the reservation itself can be created with the wrong currency
  in the first place.
- `PaymentServiceImpl.createPayment()` also re-checks this at the app layer
  (`!in.currencyCode().equals(reservation.getCurrencyCode())` → `VALIDATION`), so the
  invariant is doubly enforced. No change needed here.

## Conclusion

The user's framing is exactly correct and requires no revision: **backend pricing is
already fully authoritative and already MAD-only everywhere in the data.** The only
defect is that the *frontend* forwards its *display* currency selection to three API
calls (`quote`, `createReservation`, `charge`) as if it were the transaction currency,
and the backend has no reason to reject it since MAD/EUR/USD/GBP are all "valid" currency
codes it just never uses for anything. **No FX service, no new tables, no backend
pricing change, no schema change is needed or proposed.**

## Smallest safe change

Stop sending the display currency to those three calls; always send `'MAD'`. Keep
`useCurrency().fmt()` exactly as-is for on-screen conversion — it already only affects
rendering, never a request payload, at every site except the three below.

| File | Current | Change |
|---|---|---|
| `services/quote.ts` | `currencyCode: params.currencyCode` (caller-supplied) | build the GraphQL variables with `currencyCode: 'MAD'`, ignore/drop the parameter's influence on the wire value (keep the param in the type only if some caller still needs it for something else — none currently do) |
| `components/booking/BookingFlow.tsx:194` (quote call) | `currencyCode: currency` | `currencyCode: 'MAD'` |
| `components/room/RoomDetails.tsx:284` (quote call) | `currencyCode: currency` | `currencyCode: 'MAD'` |
| `components/booking/BookingFlow.tsx:300` (`reservations.create`) | `currencyCode: currency` | `currencyCode: 'MAD'` |
| `components/booking/BookingFlow.tsx:321` (`charge`) | `currencyCode: currency` | `currencyCode: 'MAD'` |

Recommend making the change **inside `services/quote.ts` and `services/payment.ts`
themselves** (hardcode `'MAD'` at the point they build the mutation variables) rather
than only at each call site — that way it's structurally impossible for a future new
call site to reintroduce the bug by passing `currency` through again. This is the
"guarantee display currency cannot affect transaction currency" the user asked for: make
it true at the function that talks to the API, not at every caller.

## Tests to add (design only)

- **Frontend unit test** on `services/quote.ts`/`services/payment.ts`: call `getQuote`/
  `charge` with `currencyCode`-equivalent state set to `'EUR'`; assert the GraphQL
  variables actually sent (mock `gqlRequest`) contain `currencyCode: 'MAD'` regardless.
- **Frontend component test** on `BookingFlow`: render with `SearchContext.state.currency
  = 'EUR'`; assert the displayed total is the EUR-converted figure but the payload passed
  to `reservations.create`/`charge` mocks is `MAD` + the unconverted amount.
- **Backend integration test** (belt-and-suspenders, cheap to add): create a reservation
  with `currencyCode: 'EUR'` where the quote total is known; assert
  `reservations.currency_code = 'EUR'` and `total_amount` equals the **MAD** figure
  (documents today's actual behavior / would need updating once the frontend fix lands —
  useful as a regression guard either way, but the real fix is frontend-only).

No backend/DB change is proposed for Task 2. This section is otherwise unchanged from the
original plan except that it is now verified rather than assumed.

---

# TASK 3 — Booking / payment atomicity

## Headline finding (verified live, reproduced end-to-end)

**Before investigating duplication, a more fundamental bug was found: anonymous guests —
the primary, advertised checkout path of this site — cannot pay at all.**
`PaymentServiceImpl.ensurePaymentAccess()` calls `currentUser.require()` unconditionally,
which throws `AuthenticationCredentialsNotFoundException` for any caller with no JWT.
Verified live: an anonymous `createReservation` (exactly what `BookingFlow.tsx` does for
a guest who isn't signed in) succeeds; the immediately-following anonymous
`createPayment` for that same reservation returns:
```json
{"errors":[{"message":"authentication required","extensions":{"code":"UNAUTHORIZED"}}]}
```
Payment only succeeds when the caller is authenticated **and** is either staff or the
reservation's `bookedByUserId` (which is only ever set when the booker was signed in at
creation time). This is not a corner case — it is the default state of the public guest
site, since nothing in the UI requires sign-in to book.

**Then, using an authenticated owner (where payment *does* work), the suspected
double-charge was reproduced exactly as feared:** two sequential `createPayment` calls
against the same still-unpaid reservation both succeeded (each individually valid — each
requests an amount ≤ the reservation total, and the balance check only looks at
*captured* payments, of which there were still zero). Capturing both then produced:

```
reference   total_amount   payment_status   total_captured
RC-7A3JMY   6172.92        captured         12345.84
```

The guest was charged **exactly double**. Both captures returned `status: captured` with
distinct provider references; nothing in the response or the reservation's
`payment_status` field signals anything went wrong.

Both findings are described in full detail below, with root cause and fix. **These are
two independent bugs — fixing one does not fix the other** — and are presented in the
order they'd actually block a real user (anonymous-payment first, since it blocks
100% of unauthenticated checkouts; double-charge second, since it only reaches guests
who create an account or staff, but is more dangerous when it does).

## Current behavior, traced completely

```
BookingFlow.tsx submit
  1. reservations.create()  → BookingServiceImpl.create()   [ONE @Transactional method]
       - idempotency check (findByIdempotencyKey) — early-return if key already used
       - re-price server-side (PricingService.quote — client totals never trusted)
       - inventory.lockAndSell()  ← inventory decremented HERE, inside this same tx
       - INSERT reservation (status = confirmed), rooms, extras, charges, status_history
       - INSERT event_outbox "booking.confirmed"                    ← all one commit
       - on unique-key race: catch DataIntegrityViolationException, return the winner
  2. charge({ reservationId, amount, currencyCode, card })
       a. createPayment()  → PaymentServiceImpl.createPayment()     [SEPARATE tx]
            - ensurePaymentAccess() → currentUser.require() → THROWS for anonymous callers
            - (if authenticated+authorized) lock reservation row (PESSIMISTIC_WRITE)
            - balance = total − paidAmount()      paidAmount() sums CAPTURED payments ONLY
            - if amount ≤ balance → INSERT payments (status=pending)
       b. capturePayment() → PaymentServiceImpl.capture()           [SEPARATE tx]
            - lock reservation row again (a NEW, separate lock acquisition)
            - if payment.status != pending → CONFLICT
            - generate/accept providerReference, dedupe by (provider, providerReference)
            - UPDATE payments SET status=captured
            - if paidAmount() ≥ total → reservation.payment_status = captured
```

Reservation creation is **one atomic transaction** that correctly pairs the reservation
row with its inventory decrement — if either half fails, both roll back. That part is
sound and needs no change. Everything downstream of it (payment) is **two further,
separate transactions**, invoked by the frontend as two sequential network calls, with no
atomicity between them and — critically — no atomicity *across multiple attempts* at
either step either.

## Failure scenarios, one by one (as requested)

1. **User clicks Pay twice (same tab, same mount).** `BookingFlow.tsx`'s `wait.current`
   ref is set synchronously (before the first `await`), so a true double-click is blocked
   client-side — the second `onClick` sees `wait.current === true` and returns
   immediately. **This works today**, for this specific narrow case only.
2. **Frontend retries the same request** (e.g. a browser-level fetch retry, or the user
   dismissing a decline and clicking Pay again). `generateIdempotencyKey()` is called
   fresh **inside** the submit handler on every invocation — so a retry mints a **new**
   key, meaning the reservation-level idempotency protection (which is otherwise robust —
   see below) is never actually engaged by a real "try again" click. Confirmed by reading
   `BookingFlow.tsx`'s submit function: the `const idempotencyKey =
   generateIdempotencyKey();` line sits inside the async handler, not in stable
   component state.
3. **Payment provider declines.** Verified: `PaymentServiceImpl.capture()` has **no
   decline branch at all** — it unconditionally sets `status = captured` once the pending
   check and dedupe pass. `PaymentStatus.failed` is declared in the enum (backed by a DB
   CHECK constraint) but **is never assigned by any Java code in the repository** —
   confirmed by grepping every `PaymentStatus.` usage. The only way `charge()` returns
   `ok:false` today is a thrown validation exception *before* capture (insufficient
   balance, currency mismatch, cancelled reservation) or a network/GraphQL error — not an
   actual gateway decline, because the mock gateway cannot decline.
4. **Payment succeeds but the frontend times out** (response lost after the backend
   committed). Verified this specific sub-case is **already safe**: a subsequent retry's
   `createPayment` recomputes `paidAmount()` fresh from the DB inside the (new) lock —
   since the first payment is now `captured`, `paidAmount()` correctly reflects it,
   balance drops to 0, and the retry's `createPayment` is rejected with "amount exceeds
   the remaining balance of 0." No double charge in this exact scenario.
5. **Payment succeeds but the *confirmation* request fails** (i.e. `capturePayment`'s
   response is lost, but the request server-side had already succeeded). Same as #4 if
   the retry re-enters through `createPayment` first. **But if the retry instead re-uses
   the existing pending payment id and calls `capturePayment` again** (not what today's
   frontend does, but a plausible retry design), that's already protected too — `capture`
   rejects a non-pending payment with `CONFLICT`. The genuinely unsafe path is neither of
   these — see #6.
6. **Can two reservations be created for the same booking attempt?** Yes, if the retry
   path regenerates the idempotency key (confirmed in #2) — a second, fully independent
   reservation is created, holding its own separate inventory. Reproducible; not yet
   reproduced live in this session (the double-charge reproduction below is the more
   severe of the two duplication risks and was prioritized).
7. **When is inventory decremented?** Inside `BookingServiceImpl.create()`'s single
   transaction, before the reservation row is even built — atomic with the reservation
   insert. Confirmed via source; unchanged from the original audit.
8. **Before or after payment?** **Before** — reservation + inventory both commit before
   the frontend has even attempted `charge()`. This is a deliberate design (many hotels
   allow book-now-pay-later), tracked via the separate `reservation.payment_status`
   field — not itself a bug, but it means nothing automatically undoes the hold if
   payment never completes.
9. **Payment fails after inventory already changed.** Confirmed: inventory stays sold,
   `reservation.status` stays `confirmed`, `payment_status` stays `pending`, indefinitely.
   **No scheduled job exists anywhere in the codebase to expire or release this** —
   grepped every `@Scheduled` annotation in the repository; the only two are
   `OutboxRelay`'s publish loop and stale-claim recovery, neither related to reservations.
   The only way this state resolves is an explicit cancel (self-service or staff).
10. **Idempotency key: generated once per attempt, or regenerated on retry?**
    Regenerated on every submit-handler invocation (confirmed, #2). It is **not**
    generated once per checkout session in any durable sense — no `sessionStorage`, no
    stable `useRef`, just a local `const` inside the async function.
11. **Is it persisted/enforced by the backend/DB?** **Yes, correctly, for reservations
    only.** `reservations.idempotency_key VARCHAR(100) UNIQUE`; `create()` checks
    `findByIdempotencyKey` first, and separately catches `DataIntegrityViolationException`
    on save to handle a true concurrent race (two requests with the identical key
    arriving at once) by returning the winner. This is robust — a DB unique constraint
    is enforced atomically by Postgres regardless of application-level timing, so this
    specific mechanism has **no exploitable race**, live-verifiable behavior aside. **No
    equivalent exists for `payments` at all** — `CreatePaymentInput` has no idempotency
    key field in the schema.
12. **Can concurrent requests bypass the current protection?** For reservations: no (see
    #11). For payments: **yes, and this was reproduced live** — see the headline finding.
    The mechanism that exists (`PESSIMISTIC_WRITE` lock on the reservation row, acquired
    by both `createPayment` and `capture`) genuinely does serialize concurrent calls
    against each other — it is not a missing lock. The bug is in *what is checked* while
    holding that lock: `paidAmount()` sums only `captured` payments, so a second
    `createPayment` call, run *after* the first has fully completed its transaction and
    released the lock (sequential, not even truly concurrent), still sees "$0 captured"
    and creates a second full-amount pending payment. Two sequential, individually
    "valid" calls compose into a double charge. This is a **logic gap in an otherwise
    correctly-implemented locking mechanism**, not an absent one — worth being precise
    about, since the fix is different for each (this needs a smarter check, not a bigger
    lock).
13. **What reservation statuses exist?** `ReservationStatus`: `pending, confirmed,
    modified, cancelled, checked_in, checked_out, no_show` (only `confirmed`/`cancelled`
    ever assigned — unchanged from the original audit). `PaymentStatus`: `pending,
    authorized, captured, failed, refunded, partially_refunded` declared and backed by a
    DB CHECK constraint, but **only `pending` and `captured` are ever assigned anywhere**
    — `authorized`, `failed`, `refunded`, `partially_refunded` are dead states today.
14. **Is `confirmed` assigned before payment is actually confirmed?** Yes, always — by
    design, tracked separately via `payment_status`, not a bug in itself (see #8).
15. **Is there an existing payment record that could make this safer?** Yes — `Payment` +
    `PaymentTransaction` already model exactly the right state (a payment row's own
    lifecycle, `pending → captured`, plus an audit trail of `authorization`/`capture`
    transactions). The fix should use these existing structures — check for *any other
    non-terminal payment on the same reservation* — rather than adding new concepts.
16. **Provider succeeds, backend crashes before saving?** Not reachable today — the mock
    provider *is* the database write; there is no external network call to a real PSP
    that could succeed independently of the local transaction. This becomes a genuine
    dual-write problem **only once a real payment provider is integrated** (out of scope
    here — flagged as a required design point for that future work, likely needing the
    existing outbox pattern or provider webhooks + reconciliation).
17. **Backend saves reservation, provider never receives the request?** Same caveat as
    #16 — not applicable to the current mock; becomes relevant with a real PSP.
18. **Can a retry create a second payment or second reservation?** **Second reservation:
    yes** (confirmed, #2/#6, if the idempotency key is regenerated). **Second payment:
    yes, and reproduced live** (confirmed, #12) — this is the more severe of the two,
    since it doesn't even require the reservation-level key to change; it happens purely
    within the payment step, and the reproduction above didn't need any retry-triggering
    error at all — it succeeded on two plain, back-to-back calls.

## Existing protections (confirmed correct, keep as-is)

- Reservation idempotency key + unique constraint + `DataIntegrityViolationException`
  catch — robust against true concurrency, not just sequential retries.
- Reservation + inventory atomicity within one transaction.
- `PESSIMISTIC_WRITE` lock on the reservation row for payment operations — correctly
  serializes concurrent payment-side calls (the *locking* is not the gap).
- Payment ↔ reservation currency consistency via a composite FK (Task 2's finding).
- Capture-level idempotency via the `(provider, provider_reference)` partial unique
  index — correctly dedupes a retried capture of the *same* payment row.
- `ensurePaymentAccess` correctly rejects cross-account access (IDOR) for the cases it
  does allow through.

## Missing protections (the actual gaps)

1. **Anonymous checkout cannot pay at all** — a hard `require()` in
   `ensurePaymentAccess`, no accountless-booking path considered.
2. **No idempotency key on payment creation** — nothing prevents two independent
   `createPayment` calls for the same reservation from both succeeding while neither is
   yet captured.
3. **Balance check only counts `captured` payments** — the true invariant needed is "at
   most one payment may be in flight (pending or captured) per reservation at a time,"
   not "captured total ≤ reservation total."
4. **Reservation idempotency key is regenerated per submit** — the one existing robust
   mechanism (item 1 under "existing protections") is effectively never engaged by a real
   retry, because the frontend never presents the same key twice.
5. **No compensating action for an abandoned hold** — confirmed doubly now (no scheduled
   reaper); not the cause of double-charging, but a correctness gap in its own right for
   inventory.

## Root causes (not "add more frontend guarding")

- The double-payment bug is a **backend business-invariant gap**: the check that exists
  (`paidAmount() ≤ total`) answers the wrong question for preventing concurrent
  duplicate payment *creation* — it should also account for payments that are already
  "claimed" (pending), not just settled (captured). The lock that exists is sufficient to
  make this safe *once the check is correct*; it does not need to be bigger or different.
- The anonymous-payment bug is a **security-rule gap**, not a booking-flow gap:
  `ensurePaymentAccess` was written assuming every payer has an account, which
  contradicts the product's own supported self-service/accountless booking model
  documented elsewhere in this codebase.
- The reservation-duplication risk is a **frontend key-lifecycle gap**: the *mechanism*
  is backend-correct; the *frontend* just never gives it a stable value to work with.

**None of these three requires a new booking/payment architecture.** All three are
targeted corrections to the existing model — confirmed deliberately, per the
instruction not to invent new architecture where the current one can be safely improved.

## Recommended architecture (no new states, no new services)

Reuse exactly what exists: `Payment.status` (`pending`/`captured`), `PaymentTransaction`
for the audit trail, the existing `PESSIMISTIC_WRITE` lock, the existing
`idempotency_key` pattern already proven on `reservations`. No new `ReservationStatus`,
no new `PaymentStatus` values, no new tables beyond one column + two indexes.

### Backend changes

1. **Fix anonymous payment access.** `ensurePaymentAccess` must allow the caller when
   the reservation is accountless (`bookedByUserId == null`) — the accountless-booking
   model already exists for reservation lookup/cancel (reference + email); payment needs
   the equivalent. Two reasonable designs, in order of preference:
   - **(a)** Allow payment on an accountless reservation without requiring
     authentication at all, mirroring how `createReservation`/`cancelReservation` already
     work for the public. This matches the product's existing accountless-checkout model
     most closely and requires the least new concept.
   - **(b)** Require *some* proof of possession even for accountless payment (e.g. the
     booking reference + guest email, matching the self-service lookup/cancel pattern)
     rather than fully open access, since payment is more sensitive than lookup/cancel.
   Given `createReservation` is already fully open and `cancelReservation` already
   accepts reference+email as sufficient proof for a money-adjacent action (it computes
   and applies cancellation penalties), **(a)** is the more consistent choice, but this is
   a product/security decision, not a purely technical one — flagging both for review
   rather than picking unilaterally.
2. **Add payment idempotency**, mirroring the proven `reservations` pattern exactly:
   - `CreatePaymentInput.idempotencyKey: String!` (schema addition, `billing.graphqls`).
   - `payments.idempotency_key VARCHAR(100)` + partial unique index (nullable-safe,
     matches how `reservations.idempotency_key` is modeled).
   - `PaymentServiceImpl.createPayment()`: check `findByIdempotencyKey` first; on save,
     catch `DataIntegrityViolationException` and return the existing row — identical
     shape to `BookingServiceImpl.create()`.
3. **Fix the balance/overpayment check** to consider *pending* payments, not just
   *captured* ones — this is the actual fix for the reproduced double-charge, independent
   of item 2 (item 2 stops an *identical* retry from creating a duplicate; this stops
   *any* second payment attempt, identical key or not, while one is still outstanding).
   Smallest correct change: a **partial unique index**,
   `CREATE UNIQUE INDEX uq_payments_reservation_pending ON payments(reservation_id)
   WHERE status = 'pending'` — makes "at most one in-flight payment per reservation" a
   database-enforced invariant, immune to any future application-level oversight the way
   a `SUM()`-based check is not. `createPayment()` catches the resulting
   `DataIntegrityViolationException` and returns a clear `CONFLICT`
   ("a payment is already being processed for this reservation") rather than silently
   creating a second one.
4. **No change to `capture()`'s logic** — once item 3 makes two simultaneous pending
   payments impossible, `capture()`'s existing checks are sufficient.
5. **Recommended, separate, lower-priority:** a scheduled reaper (same `@Scheduled`
   pattern already used by `OutboxRelay`) that releases inventory and cancels
   reservations left `confirmed` + `payment_status=pending` past a hold window — this
   directly matches the "rate held for 15:00" countdown the frontend already displays but
   currently does not enforce. This does not affect the double-charge fix and can be
   scheduled independently.

### Database changes

```sql
-- additive only; no existing column types change; payments table is currently
-- near-empty in every environment this was checked against
ALTER TABLE payments ADD COLUMN idempotency_key VARCHAR(100);
CREATE UNIQUE INDEX uq_payments_idempotency_key ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX uq_payments_reservation_pending ON payments (reservation_id)
  WHERE status = 'pending';
```
One new Flyway migration. No backfill needed. No FK/type changes. No new tables.

### Frontend changes

- **Reservation key:** generate once per checkout attempt and hold it in a value that
  survives retries *within the same mounted session* — a `useRef` lazily initialized at
  mount is sufficient for the double-click and decline-then-retry cases (the component
  does not unmount between those). It will **not** survive a full page reload or a second
  tab — genuinely out of scope for a client-side fix; the backend-side unique constraint
  is what makes even those cases safe (worst case: a confusing "duplicate" error surfaces
  instead of a real duplicate reservation, which is the correct failure mode).
- **Payment key:** derive deterministically from the reservation key (e.g.
  `${reservationIdempotencyKey}:payment`) so it's equally stable without inventing a
  second piece of state to manage; pass it as `CreatePaymentInput.idempotencyKey`.
- **Handle the new `CONFLICT`** from item 3 above with an honest message ("a payment is
  already being processed for this reservation — please wait a moment and check your
  confirmation email / reservation status") rather than presenting it as a generic
  failure inviting another click.
- Keep the existing `wait.current` in-flight guard — cheap, effective first line of
  defense for the pure double-click case, now backed by real server-side guarantees
  instead of being the *only* defense.

### Payment-provider changes

None required now (mock only). **Flagged for whenever a real PSP is integrated:** the
provider call becomes an external side effect that cannot be safely wrapped in the same
DB transaction as the capture write (classic dual-write problem) — that future work will
need its own design, most likely a provider-supplied idempotency key on the outbound
request plus either synchronous confirmation or the existing outbox/webhook pattern for
reconciliation. Not designed here — out of scope, and explicitly not something to solve
speculatively per the instruction to avoid inventing architecture the product doesn't
need yet.

### Transaction boundaries

Unchanged. `createReservation` stays one transaction (already correct). `createPayment`
and `capture` stay separate transactions each (already correct — no reason to merge
them; the fix is in what each one checks/enforces, not in transaction scope). The new
partial unique index enforces the cross-request invariant that a single transaction's
lock cannot, by definition, cover.

### Required idempotency guarantees (summary)

| Guarantee | Today | After this design |
|---|---|---|
| Same reservation idempotency key twice → same reservation | ✅ | ✅ (unchanged) |
| Retry after decline/reload reuses a stable reservation key | ❌ | ✅ (frontend) |
| Same payment idempotency key twice → same payment | ❌ (no key exists) | ✅ |
| At most one in-flight (pending) payment per reservation, regardless of key | ❌ (reproduced) | ✅ (DB-enforced) |
| Anonymous/accountless guest can pay for their own booking | ❌ (reproduced) | ✅ |
| Capture retried with the same payment id is idempotent | ✅ | ✅ (unchanged) |

### Required reservation/payment states

**No new states.** `ReservationStatus` and `PaymentStatus` are left exactly as declared;
the fix closes gaps in *enforcement*, not in the state model. (A future decision to
introduce an explicit hold-expiry status, or to wire up the currently-dead
`failed`/`authorized`/`refunded` states once a real PSP exists, is a separate, later
piece of work — not required to fix the bugs found here.)

### Tests to add (design only)

- **Backend, concurrency:** two `createPayment` calls issued against the same
  reservation before either is captured (via two threads or two overlapping
  transactions in a Testcontainers integration test) — assert exactly one succeeds and
  the second returns `CONFLICT`.
- **Backend, idempotency:** retry `createPayment` with the identical `idempotencyKey` —
  assert the same `Payment.id` is returned, no second row created.
- **Backend, capture retried:** unchanged existing behavior — regression test that
  capturing the same payment id twice still returns the same captured payment (protect
  against the fix accidentally breaking this).
- **Backend, anonymous payment:** `createPayment`/`capturePayment` with no
  `Authorization` header against an accountless reservation now succeeds (currently:
  add as a new test; today it would fail on `UNAUTHORIZED`).
- **Backend, decline path (once a real PSP lands):** out of scope for now — flag as a
  test gap for that future work rather than writing a test against behavior that
  structurally cannot exist yet.
- **Frontend:** rapid double-click triggers exactly one `createReservation` and one
  `createPayment` call (mock the service layer, assert call counts and that both received
  identical idempotency keys across the two attempts if a retry occurs).
- **Frontend:** after a decline, retry reuses the same reservation idempotency key
  (assert the value passed to `reservations.create` is identical across two invocations
  within the same mounted component instance).

### Migration requirements

One additive Flyway migration (SQL above). No data backfill. No breaking changes to any
existing query, index, or foreign key. Exact version number must be confirmed against
`flyway_schema_history` at implementation time (the working tree already carries
uncommitted `V21`/`V22`).

---

## Verification log (for transparency — investigation side effects, now cleaned up)

1. Created reservation `RC-QAXUGA` anonymously (no auth header) — reproduced that
   anonymous `createPayment` against it returns `UNAUTHORIZED`.
2. Registered a real test user `task3-verify@example.com`, logged in, created reservation
   `RC-7A3JMY` **while authenticated** (so `bookedByUserId` was set) — confirmed
   `createPayment` succeeds for the actual owner.
3. Called `createPayment` **a second time** for `RC-7A3JMY` before capturing the first —
   confirmed both succeed, producing two `pending` payment rows for the full amount each.
4. Captured both — confirmed both reach `captured`, and the reservation shows
   `total_captured = 12345.84` against a `total_amount` of `6172.92` (exactly 2×).
5. Cleaned up: cancelled both `RC-QAXUGA` and `RC-7A3JMY` via the real
   `cancelReservation` mutation (not raw SQL), which correctly released the held
   inventory through the existing `InventoryService.release()` path. The cancelled
   reservation/payment/guest rows remain in the database as ordinary cancelled records —
   the same residue any real cancelled booking would leave; nothing was deleted outside
   the normal application flow.

No source file, schema, or dependency was modified. No `docs/` file other than this one
was changed for Task 2/3 (the standing `docs/IMPLEMENTATION_PLAN.md` Tasks 2 and 3 should
be treated as superseded by this document once reviewed — not edited in place until the
plan is approved, per the instruction to stop after investigation).
