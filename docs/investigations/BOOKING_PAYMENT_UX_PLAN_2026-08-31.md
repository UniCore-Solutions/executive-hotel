# Booking & Payment Flow + UI/UX Improvement Plan

**Date:** 2026-08-31 · **Branch:** `feature/canonical-single-hotel` · **HEAD:** `601ca92`
**Status:** PHASE 1 — read-only analysis + plan. No application code was modified to
produce this document. Awaiting approval before any implementation.
**Baseline:** [`docs/investigations/FULL_SYSTEM_AUDIT_2026-08-31.md`](FULL_SYSTEM_AUDIT_2026-08-31.md)
(§C, §F, §L-4, §O-2). This document does not repeat that audit — it extends it with a
payment/booking-specific deep trace and a concrete design, and calls out three places
where source-level re-verification sharpened or corrected the audit's framing (marked
**[correction]** below).

---

## 1. Current Booking Flow — traced against source

`frontend-hotel/src/components/booking/BookingFlow.tsx:302-388` (`submitPayment`), one
synchronous handler:

1. `reservations.create()` → `POST /api/v1/reservations` (`Idempotency-Key` header) →
   `BookingServiceImpl.create()` (`BookingServiceImpl.java:109-281`):
   - re-prices server-side via `pricing.quote()` (client total never trusted)
   - `inventory.lockAndSell()` — pessimistic per-night row lock, sells immediately
   - `reservation.setStatus(ReservationStatus.confirmed)` — **line 189, unconditional,
     before any payment exists**
   - `reservation.setPaymentStatus(PaymentStatus.pending)` — line 200
   - publishes `booking.confirmed` (outbox, no consumer)
2. `charge()` (`services/payment.ts:20-51`), immediately after, same handler:
   - `createPayment()` → `POST /api/v1/payments` → `PaymentServiceImpl.createPayment()`
     (`:78-165`) — validates balance/currency/one-pending-per-reservation, inserts
     `Payment{status: pending}`
   - `capturePayment()` → `POST /api/v1/payments/{id}/capture` →
     `PaymentServiceImpl.capture()` (`:167-217`) — **always succeeds** unless an
     exception was already thrown upstream; invents `"MOCK-" + uuid8`; sets
     `Payment.status = captured`; if fully paid, calls `booking.markFullyPaid()`
     (`BookingServiceImpl.java:417-425`), which sets `reservation.paymentStatus =
     captured` and **never touches `reservation.status`** (it was already `confirmed`).
3. On success: Apollo cache invalidated, toast, `router.push('/confirmation?ref=…&email=…')`.
4. On failure: `setDeclined(message)`, the reservation row is left exactly as created —
   `status: confirmed`, `paymentStatus: pending` — forever.

### State-machine reality check

```java
// ReservationStatus.java
pending, confirmed, modified, cancelled, checked_in, checked_out, no_show
// PaymentStatus.java
pending, authorized, captured, failed, refunded, partially_refunded
```

Grepped every assignment site in `backend-hotel/src/main/java`:

| Value | Ever assigned? |
|---|---|
| `ReservationStatus.pending` | **Never** — declared, dead. Booking creation writes `confirmed` directly. |
| `PaymentStatus.authorized`, `.failed`, `.refunded`, `.partially_refunded` | **Never** — only `pending` and `captured` are ever set anywhere in the codebase. |

This is a sharper, source-confirmed version of the audit's §F/§O-1 finding: it isn't just
that the *ordering* is wrong, it's that **the state machine has no representation of
"payment failed" or "awaiting payment" at all** — `capture()` has no code path that can
produce `failed`, so `BookingFlow.tsx:366`'s decline banner is reachable today only via a
thrown exception (network error, currency/balance validation), never a simulated
provider decline.

### Answering each question in the brief

| Question | Answer (verified) |
|---|---|
| Current booking sequence | create reservation (sold + `confirmed`) → create payment → capture payment, all in one client-side `async` handler, no server-side orchestration between the two REST calls |
| Current reservation creation API | `POST /api/v1/reservations`, `permitAll` at the filter, `Idempotency-Key` header required (`ReservationRestController.java:35-48`) |
| Current payment API | `POST /api/v1/payments` + `POST /api/v1/payments/{id}/capture`, both `permitAll` at the filter, service-enforced owner/staff/guest-email access (`PaymentRestController.java`, `SecurityConfig.java:95-96`) |
| Current inventory behavior | Sold at reservation creation via `SELECT … FOR UPDATE` (`InventoryService.lockAndSell`), released only on explicit cancel (`InventoryService.release`, called from `doCancel`) |
| When inventory is reserved | At `POST /api/v1/reservations`, before any payment call exists |
| When payment is created | Immediately after reservation creation succeeds, same request cycle |
| What happens when payment fails | Cannot happen server-side today (`capture()` has no decline branch) except via a thrown exception (balance/currency mismatch, network) — reservation and inventory are untouched, guest sees the `declined` banner and can retry |
| What happens when payment is abandoned | Nothing — no compensation exists anywhere. Reservation stays `confirmed`/`pending`-payment indefinitely, inventory stays sold |
| What happens when the user closes the browser | Same as abandoned, **plus a sharper finding below** |
| What happens when payment remains pending | Forever — no TTL, no scheduled release job. The only `@Scheduled` job in the codebase is `OutboxRelay` (`service/impl/OutboxRelay.java:64,97`) for the Kafka outbox, unrelated to reservations |
| What happens when payment succeeds | `Payment.status → captured`, `reservation.paymentStatus → captured` via `markFullyPaid()`; `reservation.status` was already `confirmed` |
| What happens when the webhook arrives late | N/A — **no webhook receiver exists**. Capture is a synchronous browser-driven call, not a provider callback |
| What happens when the webhook arrives twice | N/A today, but the underlying primitive is already sound: a second `capture()` call on the same payment id 409s cleanly (`payment.getStatus() != pending` check, `:174-176`), and the `(provider, provider_reference)` partial unique index (`:180-187`) already makes a repeated *reference* idempotent. This is the exact mechanism the new webhook handler should reuse, not replace |

### **[correction]** Reload/close-and-reopen is worse than the audit's framing

`docs/CURRENT_STATE.md` and the audit (§C) describe the double-book issue as fixed via a
"stable idempotency key." Verified in `BookingFlow.tsx:279-282`:

```ts
const reservationIdempotencyKeyRef = useRef<string | null>(null);
if (reservationIdempotencyKeyRef.current === null) {
  reservationIdempotencyKeyRef.current = generateIdempotencyKey();
}
```

This key lives only in a React `useRef` — **component-mount-scoped, not persisted** to
`sessionStorage`/`localStorage`/the URL. The audit's own qualifier is exact: "a new key is
only ever produced by a fresh mount." A page reload, or closing and reopening the booking
tab, **is** a fresh mount. So: guest submits, reservation A is created and sold, the
payment call is still in flight or the tab is closed before it resolves, guest reopens
`/booking?…` with the same room/dates — a **second** idempotency key is generated, a
**second** reservation is created, **inventory is sold twice** for what the guest
experiences as "one" booking attempt. The audit's "retry double-books is fixed" claim is
correct only for retries *within the same mount* (double-click, step back to step 1 and
forward again); it does not hold across a reload. This is a materially worse version of
finding §L-4 and directly informs the polling design in §5 below (the frontend must
persist enough state to resume, not re-submit, after a reload).

---

## 2 & 8. Payment/Booking Problems and Recommended Architecture

**Root problems, in the order they compound:**

1. Reservation is `confirmed` and inventory is sold *before* payment exists, with no
   distinct "awaiting payment" state — `ReservationStatus.pending` is declared and unused.
2. Payment `capture()` is a synchronous, always-succeeding mock with no decline path —
   `PaymentStatus.failed`/`authorized`/`refunded` are declared and unused.
3. No compensation on failure/abandonment/timeout — nothing ever cancels a reservation or
   releases inventory except an explicit guest/staff cancel action.
4. No hold-expiry job — the one scheduled-job precedent in the codebase (`OutboxRelay`)
   is for the Kafka outbox, not reservations.
5. **[correction above]** the reservation idempotency key is mount-scoped, not persisted,
   so a reload after reservation-create but before payment-settle produces a second sold
   reservation, not a resumed one.
6. No webhook receiver of any kind exists — capture is caller-driven, not provider-driven.
7. No dedicated single-payment status query for the guest — **but no new one is actually
   needed**: `reservation(input: ReservationLookupInput!)` already returns both `status`
   and `paymentStatus` (`reservation.graphqls:3,12-13`), which is exactly what a polling
   client needs.
8. The frontend payment UX has no concept of "processing" separate from "form disabled" —
   `paying` only flips the submit button's label, there is no intermediate screen, no
   polling, no timeout.

**Recommended architecture** — minimal-diff, built from patterns the codebase already
has (pessimistic locking, outbox-style scheduled jobs, cancellation + inventory-release
machinery, idempotency-key + partial-unique-index patterns), not a redesign:

- Use the **already-declared-but-dead `ReservationStatus.pending`** as a genuine
  "awaiting payment" hold state. `BookingServiceImpl.create()` sets `status = pending`
  instead of `confirmed`. Inventory is still locked/sold at creation exactly as today
  (the pessimistic per-night lock is what actually prevents overselling; there is no
  cheaper "hold without selling" primitive in the current schema, and building one is out
  of scope for this fix) — the hold is bounded by a TTL instead.
- Add a `hold_expires_at` timestamp (new Flyway migration) set at creation
  (`now() + N minutes`, configurable).
- A new scheduled job, styled exactly like `OutboxRelay`'s `@Scheduled` methods, finds
  `status = 'pending' AND hold_expires_at < now()` and cancels them through the
  **existing** `doCancel` path (same penalty-evaluation/inventory-release/audit-trail code
  `BookingServiceImpl.java:459-537` already uses for guest-initiated cancellation), with a
  new cancellation reason (`payment_timeout`).
- `capture()` succeeding promotes `status: pending → confirmed` in the same call that
  already promotes `paymentStatus → captured` (`markFullyPaid`, `:417-425`) — one method,
  two field writes.
- A genuine decline path: `PaymentServiceImpl` gains a `markFailed(...)` that sets
  `Payment.status = failed` (finally exercising that enum value) and records a failure
  `PaymentTransaction`. The reservation stays `pending` (still holding inventory) so the
  guest can retry with a different card **against the same reservation** before the hold
  expires — this matches the requested UX ("FAILED → failure/retry") better than
  cancelling on first decline, and reuses the existing "at most one pending payment per
  reservation" DB constraint (`V23` partial unique index, already enforced in
  `createPayment`, `:107-111`) to prevent two simultaneous retry attempts.

Classification: **Needs modification** (`BookingServiceImpl.create`, `capture`,
`markFullyPaid`), **Needs creation** (`hold_expires_at` migration, hold-expiry job,
`markFailed`).

---

## 3. Webhook Simulation Design

No real provider exists and none should be introduced (per the brief's constraints). The
simulation must still behave like an out-of-band async callback, be idempotent, and keep
the backend authoritative — the frontend must never be able to mark a payment paid.

**New endpoint:** `POST /api/v1/payments/{id}/webhook` — internal/simulator-only, distinct
from the guest-facing `create`/`capture` pair so it's never confused with a real PSP path.

```
Body: { event: "payment.succeeded" | "payment.failed", providerReference?: string }
```

**Trigger mechanism:** immediately after `createPayment` succeeds, the backend schedules a
delayed self-call (Spring `TaskScheduler`, one-shot, 1.5–4s randomized delay — configurable
via `app.payments.simulated-settlement-delay-ms`) that invokes this same webhook handler
with a deterministic-by-default outcome (`payment.succeeded`), overridable per-request for
QA via an optional `simulateOutcome` field on `CreatePaymentInput` (`succeed | fail |
timeout` — `timeout` simply never schedules a callback, exercising the frontend's timeout
path on demand). This removes the *browser's* direct call to `/capture` from the guest
flow entirely — the browser only ever sees `pending`, then polls.

**Idempotency, reusing existing primitives, not new ones:**
- Handler loads `Payment` + `Reservation` via `booking.getByIdForUpdate()` — the same row
  lock `capture()` already takes (`PaymentServiceImpl.java:172`), so concurrent/duplicate
  deliveries serialize for free.
- **Already-paid payment** (`status == captured`) receiving another `payment.succeeded` →
  200, no-op, return the existing payment (mirrors the existing duplicate-reference check
  at `:182-187`).
- **Duplicate webhook** (same `providerReference` seen twice) → resolved by the existing
  `(provider, provider_reference)` partial unique index — same code path as today's
  duplicate-capture handling.
- **Late webhook** — no special handling needed beyond the above: if the hold already
  expired and the reservation was auto-cancelled, a late `payment.succeeded` must **not**
  resurrect it — the handler checks `reservation.status == cancelled` first and, if so,
  records the payment outcome but does **not** call `markFullyPaid`/promote status; it
  should instead flag the payment as `captured`-but-orphaned for staff review (surfaced via
  the existing `adminPayments` GraphQL query, no new UI needed) rather than silently
  reactivating a released room.
- **Invalid payment reference / unknown payment** → `paymentRepository.findById` miss →
  404, same `DomainException.notFound` idiom used everywhere else in this service.
- **Invalid event** (not one of the two known enum values) → 400 `DomainException.validation`.
- **Already-cancelled reservation** receiving `payment.failed` → no-op 200 (nothing left
  to fail).

**Manual QA triggers** (satisfies "design a test webhook mechanism that allows us to
manually simulate…"): a guarded admin endpoint,
`POST /api/v1/admin/payments/{id}/simulate-webhook`, gated the same way every other admin
write is (`hasRole("super_admin") || inHotel(hotelId)`, following the pattern already
proven correct for all 39 existing admin entry points per the audit's §H), accepting the
same body shape, so staff/QA can fire success, decline, duplicate, late, invalid-reference,
unknown-payment, invalid-event, and already-paid scenarios by hand against a real
reservation without needing a fake PSP sandbox. This is additive to, not a replacement for,
the automatic scheduled trigger.

Classification: **Needs creation** in full — no webhook infrastructure exists today.

---

## 4. Payment Status API

**Already exists — no new query is required for the guest-facing case.**
`reservation(input: ReservationLookupInput!): Reservation` (`reservation.graphqls:3`)
already returns `status: ReservationStatus!` and `paymentStatus: PaymentStatus!`
(`:12-13`), resolved by `BookingServiceImpl.getByReferenceAndEmail()` — exactly the
reference+email proof-of-possession pattern already used for the confirmation and
manage-booking pages. The frontend's `reservations.find(ref, email)`
(`services/reservations.ts:121-135`) already calls this. Polling it is the correct,
minimal-diff status-check mechanism.

**Optional enhancement (needs creation, not required for the guest flow):** a narrower
`GET /api/v1/payments/{id}?guestEmail=` REST read, for the rarer case of a reservation with
multiple payment attempts (decline → retry) where the caller wants the status of one
specific attempt rather than the reservation's aggregate `paymentStatus`. Not needed for
Phase 2's guest polling UX, since the reservation-level status already answers "is my
booking confirmed yet."

Classification: **Already exists** (`reservation` query) — **Needs verification** only that
the frontend's cache-first Apollo fetch policy (`services/reservations.ts:129`,
`fetchPolicy: 'cache-first'`) is bypassed during polling (must be `network-only` or the
poll will keep returning a stale cached `pending` after the backend has already flipped to
`confirmed`).

---

## 5. Frontend Payment UX — Polling & Timeout Design

**Processing:** replace the current disabled-button-only state with a dedicated screen
(reuse the existing `/confirmation` route with a `status=processing` query param, or a new
lightweight `/booking/processing` step) shown immediately after `createPayment` succeeds —
do not wait for capture, since capture is no longer synchronous.

**Polling parameters:**

| Parameter | Value | Rationale |
|---|---|---|
| Interval | 2s | Matches the simulated settlement delay (1.5–4s) closely enough to feel responsive without hammering the backend |
| Max duration | 30s | Comfortably covers the simulated delay plus jitter/retries; short enough that a genuinely stuck payment doesn't leave the guest staring at a spinner |
| Max requests | 15 (30s / 2s) | Derived from the above, not an independent cap |
| Query | `reservation(input: {reference, email})`, `fetchPolicy: 'network-only'` | Must bypass the Apollo cache (see §4) |
| Backoff | none needed at this scale — 15 requests over 30s is not enough volume to warrant exponential backoff, and a fixed interval is easier to reason about for a bounded wait |

**Timeout behavior:** if `status` is still `pending` after 30s, show a **distinct
"still verifying" state** — not an error — with copy like "Your payment is still being
confirmed — this can take a minute. We'll have your confirmation ready shortly," a link to
`/reservation?ref=…` (the existing self-service lookup page, already capable of showing a
`confirmed` reservation once the async settlement eventually lands), and no further
auto-polling (avoid an infinite loop; let the guest manually refresh via that link).

**On refresh mid-poll:** the processing screen's URL already carries `ref` + `email`
(`BookingFlow.tsx:379-381` already builds this exact URL for the *success* case — reuse it
immediately after `createPayment` instead of waiting for the old capture step). A reload
just re-mounts the processing screen, which re-reads `ref`/`email` from the URL and resumes
polling — it does **not** re-submit a booking, because by this point in the flow the
reservation already exists and the processing screen never calls `reservations.create()`
again. This directly closes the reload gap identified in §1's correction, but only for
reloads *after* the redirect to the processing screen — the narrower window between
"reservation created" and "payment created" (a few hundred ms, still inside the original
`submitPayment` handler) is not fully closed by this change alone; recommend also
persisting the reservation idempotency key to `sessionStorage` (keyed by
`roomId+planId+checkin+checkout`) so even a reload in that narrow window reuses the same
key rather than minting a new one. **Needs creation.**

**States:**

| State | Trigger | UI |
|---|---|---|
| Processing | `paymentStatus === 'pending'`, `status === 'pending'`, within 30s | spinner + reassurance copy, no dismiss action |
| Success | `paymentStatus === 'captured'` | existing `ConfirmationFlow` — already correct, no change needed |
| Failed | `paymentStatus === 'failed'` (new, reachable once §2/§3 land) | reuse the existing `declined` banner pattern (`bg-clay/10 border-clay/25 text-clay`, `BookingFlow.tsx:764-772`) with a "Try another card" CTA that re-opens the payment form **against the same reservation id** (new payment attempt, not a new reservation) |
| Timeout | still `pending` after 30s | new state, **do not reuse the clay/error styling** — this is not a failure (see §7) |

Classification: **Needs creation** — none of processing/timeout screens or the polling
hook exist today; the failed-state banner styling can be reused as-is.

---

## 6 & 11. Existing UI Analysis and Problems

**Method note:** no live browser/screenshot tool was available in this session (checked —
none of the deferred tools cover it), so this is a static read of the actual rendered
JSX/Tailwind source for `BookingFlow.tsx`, `ConfirmationFlow.tsx`, `ReservationFlow.tsx`,
`components/ui/button.tsx`, `components/ui/input.tsx`, and the design tokens in
`app/globals.css` — not a screenshot-driven review. The stack is up
(`hotel-frontend` healthy on `:3000`) if a visual pass is wanted before sign-off; flagging
this gap explicitly rather than presenting source-level inference as visual confirmation.

**Design tokens** (`globals.css:4-15`) — a real, coherent palette, not generic-AI defaults:
`navy` (#142639, primary), `gold` (#b98b3e, accent), `clay` (#a2543a, error/destructive),
`paper` (#f7f4ee, warm off-white background), `ink` (#20242c), `Fraunces` display serif +
`Inter` sans. Buttons (`button.tsx:6-34`) are a well-structured `cva` variant system
(default/outline/ghost/gold/onDark/destructive/navyLink) consistently reused everywhere
read. Inputs share one component with a `sm` size variant and a consistent
`aria-invalid` → clay-tinted error state. This is above-average design-system hygiene for
this stage of a project — the improvement plan below is a targeted trim, not a rebuild.

**Concrete problems found:**

1. **Success/checked-in states break the token discipline.** `ConfirmationFlow.tsx:306-335`
   and `ReservationFlow.tsx:213-217` hardcode raw Tailwind `emerald-700`/`emerald-800`
   classes for the success checkmark and "checked in" banner — every other semantic color
   in the app (error = `clay`, accent = `gold`, primary = `navy`) is a named design token,
   success is not. **Needs creation:** a `--color-success` token in the `@theme` block,
   consistent with the warm/editorial palette (a muted sage/forest green reads better next
   to `gold`/`paper` than Tailwind's default emerald), then a find-replace of the ad hoc
   `emerald-*` classes.
2. **No token exists for the new "processing/timeout" state** required by §5 — it is
   neither success (`emerald`/new `success`) nor error (`clay`) nor decorative (`gold`).
   Recommend a neutral informational tone (e.g. a muted slate/gold-adjacent tint) added
   alongside the success token in the same pass, so the payment UX work in §5 has a home
   for it instead of improvising inline classes.
3. **Card density.** Every content block is independently wrapped in
   `rounded-3xl border border-navy/10 bg-white p-6` (or `p-8`) —
   `BookingFlow.tsx:441,583,756`, `ConfirmationFlow.tsx:306,344,400,477`,
   `ReservationFlow.tsx:252,278,358,372,383` all repeat this exact pattern. On
   `/confirmation` alone that's 6 stacked white cards (header, timeline, actions row,
   stay-details, price-summary, mobile-key) each paying the full `p-6`–`p-8` padding tax —
   on mobile this is a lot of scrolling for what is fundamentally one document. This is
   exactly the "excessive cards" anti-pattern the brief calls out to avoid, and it's the
   single highest-leverage visual change available without touching the palette or
   typography: merge timeline + stay-details into one card with internal dividers instead
   of a border between them, and consider the same for the sidebar sections in
   `BookingFlow.tsx` (stay summary / quote / promo / extras are four `border-t` sub-sections
   inside one card already — good pattern — but the outer page still stacks two more full
   cards below it).
4. **Minimal trust signalling on the payment form.** `BookingFlow.tsx:801-825`'s card-number
   field has one caption line ("Your payment is processed securely via the backend.") and
   no card-brand recognition or lock iconography. Purely cosmetic (no real PSP to validate
   against) but cheap to add and expected in a "production-quality" checkout: a small
   lock glyph + Visa/Mastercard marks inline in the field, consistent with the existing
   inline-SVG icon style already used throughout `BookingFlow.tsx` (`STAY_ICONS`).
5. **Quote loading state is plain text.** `BookingFlow.tsx:527-528`:
   `quoteLoading ? <p className="text-navy/40 text-xs">Calculating price…</p>` — the price
   summary is the single most commercially important number on the page and it currently
   has no skeleton/shimmer, just a text line. Recommend a skeleton matching `QuoteTable`'s
   row layout.

**What's already good and should be preserved, not "fixed":** the two-step
`Steps`/breadcrumb pattern, the sticky summary sidebar restructuring stay info as
`dl`/`dt`/`dd` pairs, the consistent uppercase-tracked micro-labels
(`text-navy/45 text-xs font-semibold tracking-widest uppercase`) used as section headers
everywhere, and the button variant system. None of these need touching.

---

## 7. Design Direction — how the above maps to the brief's priorities

- **Clear hierarchy / strong typography** — already present (Fraunces display + Inter
  body, consistent micro-label pattern); no change needed.
- **Consistent components** — buttons/inputs are already a shared system; the one gap is
  the missing success/processing tokens (item 1–2 above).
- **Clear actions / excellent payment UX** — the real work is in §5 (processing/timeout
  states), not visual polish.
- **Avoid excessive cards** — item 3 above is the one place today's UI leans toward the
  anti-pattern explicitly called out to avoid; it's a targeted merge, not a redesign.
- **No random gradients / no generic AI UI** — none found; the existing palette is
  distinctive and warm, not a default shadcn/Tailwind look. Nothing to remove here.

---

## 9. Final Plan — classification and file-level detail

### Backend

| Item | Classification | Where |
|---|---|---|
| Server never trusts client totals | **Already exists** | `BookingServiceImpl.create():142-149` |
| Pessimistic inventory lock, no overbooking | **Already exists** | `InventoryService.lockAndSell` |
| Idempotent reservation creation | **Already exists** | `BookingServiceImpl.create():112-118,210-219` |
| Idempotent payment creation + capture-reference dedup | **Already exists** | `PaymentServiceImpl.java:90-93,182-187` |
| `reservation` GraphQL query exposing `status`+`paymentStatus` | **Already exists** | `reservation.graphqls:3,12-13` |
| `ReservationStatus.pending` actually used at creation | **Needs modification** | `BookingServiceImpl.create():189` |
| `hold_expires_at` column | **Needs creation** | new Flyway migration |
| Hold-expiry scheduled job (compensating cancel) | **Needs creation** | new class, styled on `OutboxRelay.java:64,97` |
| `capture()`/`markFullyPaid()` promote `status: pending→confirmed` | **Needs modification** | `BookingServiceImpl.java:417-425`, `PaymentServiceImpl.java:203-206` |
| `PaymentServiceImpl.markFailed(...)` | **Needs creation** | new method, `PaymentServiceImpl.java` |
| Simulated async settlement scheduler | **Needs creation** | new component, delayed one-shot task per `createPayment` |
| `POST /api/v1/payments/{id}/webhook` | **Needs creation** | new controller method |
| `POST /api/v1/admin/payments/{id}/simulate-webhook` | **Needs creation** | new admin controller method, same authz pattern as existing 39 admin entry points |
| Optional single-payment status REST read | **Needs creation (optional)** | not required for guest polling |

### Frontend

| Item | Classification | Where |
|---|---|---|
| `declined` banner styling (clay tokens) | **Already exists, reusable** | `BookingFlow.tsx:764-772` |
| Confirmation page's pending/failed copy | **Already exists, reusable** | `ConfirmationFlow.tsx:497-504` |
| Stop client-driven `/capture` call | **Needs modification** | `services/payment.ts:20-51`, `BookingFlow.tsx:352-358` |
| Processing screen + polling hook | **Needs creation** | new component/hook |
| Timeout screen | **Needs creation** | new component |
| Retry-same-reservation payment attempt | **Needs creation** | modify payment step to accept an existing `reservationId` |
| Persist idempotency key across reload | **Needs creation** | `sessionStorage`, `BookingFlow.tsx:279-282` |
| `success` / `processing` design tokens | **Needs creation** | `globals.css` `@theme` block |
| Replace ad hoc `emerald-*` classes | **Needs modification** | `ConfirmationFlow.tsx:306-335`, `ReservationFlow.tsx:213-217` |
| Card-density merge on confirmation/manage pages | **Needs modification** | `ConfirmationFlow.tsx`, `ReservationFlow.tsx` |
| Payment-form trust signals (lock/card-brand icons) | **Needs modification** | `BookingFlow.tsx:801-825` |
| Quote skeleton loading state | **Needs modification** | `BookingFlow.tsx:527-528` |
| Apollo `fetchPolicy` for polling reads | **Needs verification / modification** | `services/reservations.ts:126-131` (use `network-only` for the poll, keep `cache-first` elsewhere) |

### 16. Testing strategy

- **Backend:** Testcontainers tests for the hold-expiry job (invoke the job method
  directly with a manipulated `hold_expires_at` rather than sleeping); webhook idempotency
  matrix — success, failure, duplicate reference, late-after-cancel, unknown payment id,
  invalid event, already-captured — one test per scenario, mirroring the existing style in
  the admin-GraphQL/booking test suites; decline-then-retry-same-reservation end to end.
- **Frontend:** `vitest` with fake timers for the polling hook (verify interval, max
  duration, cleanup on unmount); component tests for processing/failed/timeout render
  states. Extend the already-flagged-stale Playwright suite (`docs/CURRENT_STATE.md`
  "Where development stopped" §3) to cover the full search→book→processing→confirm path
  against the canonical single-hotel flow, since it needs a rewrite regardless.
- Re-run `./mvnw test` and the frontend `tsc && eslint && vitest` gates per
  `CLAUDE.md` before calling any phase done; note the two pre-existing ArchUnit failures
  are not this work's responsibility if still present.

### 17. Implementation order

1. Flyway migration: `hold_expires_at` on `reservations`.
2. Backend: `create()` writes `status = pending` + `hold_expires_at`; hold-expiry
   scheduled job (compensating cancel, reason `payment_timeout`).
3. Backend: `markFailed`, `markFullyPaid`'s `pending → confirmed` promotion, the webhook
   handler (idempotent, all eight scenarios), the simulated-settlement scheduler, the admin
   manual-trigger endpoint.
4. Frontend: stop the direct `/capture` call; redirect to the processing screen right
   after `createPayment`; implement the polling hook (`network-only`, 2s/30s/15 tries).
5. Frontend: processing/failed/timeout screens; retry-same-reservation payment attempt;
   persist the idempotency key to `sessionStorage`.
6. Design-system pass: `success`/`processing` tokens, replace `emerald-*`, card-density
   merge on confirmation/manage pages, payment-form trust signals, quote skeleton.
7. Tests (backend Testcontainers matrix, frontend vitest + Playwright rewrite) and the
   standard verification gate (§16).

Steps 1–3 (backend) and 6 (pure design-system) have no ordering dependency on each other
and could run in parallel; step 4–5 (frontend behavior) depends on step 3 existing first
since it polls fields step 3 introduces (`status` reaching `confirmed`, `paymentStatus`
reaching `failed`).

---

**End of Phase 1. No code was changed to produce this document. Waiting for approval
before implementing any part of §9/§17.**
