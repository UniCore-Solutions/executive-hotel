# Reservation cancellation — audit

**Date:** 2026-09-01 · **Status:** audit only, nothing changed.

**Headline:** cancellation is a real, working, end-to-end feature on both the
guest and staff sides — status transition, penalty evaluation, inventory
release, audit history and an outbox event. **Refunds are not.** The penalty and
refund amounts are computed and stored, and then no money moves: no refund is
issued, no payment is reversed, and `paymentStatus` is never set to `refunded`
or `partially_refunded`. Two concrete defects are recorded in §7.

---

## 1. Backend

### 1.1 Endpoints

Cancellation is REST, not GraphQL (the codebase's stated split — GraphQL reads,
REST writes; `ReservationGraphQLController.java:33-36`).

| Endpoint | Caller | File |
|---|---|---|
| `POST /api/v1/reservations/{reference}/cancel` | guest, self-service | `controller/ReservationRestController.java:51-59` |
| `POST /api/v1/admin/reservations/{reservationId}/cancel` | staff | `controller/AdminReservationRestController.java:28-37` |

Both bodies accept `reasonCode` + `reasonNote`; the guest body also carries
`email`.

### 1.2 Services

Both endpoints converge on one private method.

- `BookingService.cancel(CancelReservationInput)` — guest path.
  Authorization: a reservation created by a signed-in account may only be
  cancelled by that account (`BookingServiceImpl.java:558-564`); anonymous
  bookings are identified by reference + email.
- `BookingService.adminCancel(UUID, reasonCode, reasonNote)` — staff path.
  Authorization: `requireStaffAccess(hotelId)` → `super_admin` or membership of
  the reservation's hotel (`BookingServiceImpl.java:573-579, 662-668`).
- **`BookingServiceImpl.doCancel()` — `:582-660`** — the single real
  implementation.

A third, automated caller: `ReservationHoldExpiryJob` releases pending
reservations whose payment hold lapsed, through this same path
(`V31__payment_hold_expiry_and_webhook.sql`).

### 1.3 What `doCancel()` does, in order

1. **Guards** (`:583-590`): already `cancelled` → `409 conflict`;
   `checked_in` / `checked_out` → `409 conflict`.
2. **Penalty evaluation per room line** (`:592-605`): for each
   `ReservationRoom`, load its `RatePlan` and call
   `PricingService.evaluateCancellation()`, which delegates to
   `util/CancellationPolicy.evaluate()`. Penalties are summed;
   `refundable` is the AND across lines. A rate plan deleted since booking is
   **skipped**, i.e. that line contributes no penalty (`:597-600`).
3. **Persist a `ReservationCancellation`** (`:607-625`) with `isRefundable`,
   `penaltyAmount`, `refundAmount`, `reasonNote`, `cancelledByUserId`,
   `cancelledAt`. `saveAndFlush` converts the unique-`reservation_id` race into
   a clean `409` rather than an opaque commit failure.
4. **Status transition + history** (`:629-641`): `status = cancelled`, plus a
   `ReservationStatusHistory` row recording `fromStatus`, `toStatus`, actor and
   note.
5. **Inventory release** (`:643-649`): `InventoryService.release()` returns the
   nights to availability.
6. **Outbox event** (`:650-658`): `booking.cancelled` v1 with `penaltyAmount`,
   `refundAmount`, `currencyCode`. There is no consumer for it in this
   repository.

### 1.4 Status transitions

`ReservationStatus` = `pending, confirmed, modified, cancelled, checked_in,
checked_out, no_show` (`entity/ReservationStatus.java`, mirroring
`chk_reservations_status`).

```
pending ─┐
confirmed├──► cancelled          (allowed)
modified │
no_show ─┘

checked_in  ──► cancelled        BLOCKED (409)
checked_out ──► cancelled        BLOCKED (409)
cancelled   ──► cancelled        BLOCKED (409)
```

Every transition is written to `reservation_status_history`.

### 1.5 Database

| Table | Role |
|---|---|
| `reservations.status` | current state, CHECK-constrained |
| `reservations.payment_status` | `pending, authorized, captured, failed, refunded, partially_refunded` |
| `reservation_cancellations` | one row per cancelled reservation (unique `reservation_id`): `cancellation_reason_id`, `reason_note`, `cancelled_by_user_id`, `is_refundable`, `penalty_amount`, `refund_amount`, `cancelled_at` (`V6__booking.sql:194`) |
| `reservation_status_history` | full transition audit trail |
| `cancellation_reasons` | reference codes (`V1__reference_data.sql:26`, seeded in `V10` and `V31`) |

---

## 2. Frontend

### 2.1 Guest UI — connected, real

`frontend-hotel/src/components/booking/ReservationFlow.tsx` (the *Manage
booking* view):

| Element | Location |
|---|---|
| "Cancel this reservation" button, disabled once cancelled | `:459-470` |
| Policy line — free / fee / non-refundable | `:435-448` |
| Confirmation modal `CancelContent` with per-case warning and a reason select | `:480-545` |
| Submit → `reservations.cancel(...)` → `POST .../cancel` | `:269-296`, `services/reservations.ts:169-171` |
| Success + error toasts, Apollo cache invalidation, re-fetch | `:279-295` |

`deriveCancellation()` (`:69-96`) deliberately **never invents a fee
client-side** — it shows "the exact amount is shown before you confirm" and only
displays real money once the backend has computed it. The schema comment at
`reservation.graphqls:70-80` states the same rule. This is correct and worth
preserving.

### 2.2 Admin UI — connected, real

`backoffice-hotel/src/app/(backoffice)/reservations/page.tsx`:
inline "Cancel reservation" action with a reason select and a confirm step
(`:318-361`), calling `adminCancelReservation` (`:184-193`), with pending state,
error surface and cache invalidation. Cancelled rows render the stored reason,
refund and penalty (`:304-315`).

### 2.3 Mocked / static

- `frontend-hotel/src/app/cancellation-policy/page.tsx` — a **static marketing
  page**. Its prose is not derived from any rate plan's
  `cancellationPolicy`/`isRefundable`. Guest-facing policy text and actual
  policy data can drift with nothing to detect it.
- `AccountFlow.tsx` renders a `Cancelled` badge (`:337-338, 377`) but offers
  **no cancel action** — the guest must open Manage booking.

### 2.4 Missing UI

- No **staff refund** action anywhere (nothing to call — see §3).
- No display of the cancellation **fee actually charged** after the fact on the
  guest side; the amount is stored but the guest view only shows "already
  cancelled".

---

## 3. Payment / refund

| Capability | State |
|---|---|
| Refund amount **computed** | **Implemented** — `BookingServiceImpl.java:619` |
| Refund amount **stored** | **Implemented** — `reservation_cancellations.refund_amount` |
| Refund **executed** | **Not implemented** — nothing calls a refund |
| Partial refund | **Not implemented** |
| Payment reversal / void | **Not implemented** |
| Cancellation fee **charged** | **Not implemented** — the penalty is recorded, never captured |
| `paymentStatus = refunded` / `partially_refunded` | **Not implemented** — the enum values exist and are never written |
| Refund status / tracking | **Not implemented** — no `refund_status`, no refund `PaymentTransaction` |
| Provider integration | **Not implemented** — the provider is simulated (`config/PaymentSafetyConfig`; `app.payments.auto-settle-enabled` defaults false and is refused under `prod`) |

Verification:

```bash
grep -rn -i "refund" backend-hotel/src/main/java | grep -vi refundable
# → only: the enum values, the DTO field, the computed/stored amount,
#   and the outbox payload. No execution path.
```

**Consequence today:** cancelling a captured, fully-paid reservation releases
the room and records "refund MAD X" — and the guest's money stays captured with
no operational trigger to return it beyond a human reading the back-office.

---

## 4. Cancellation rules

Contrary to what a quick look suggests, the rule engine **does exist** and is
honoured — it is per **rate plan**, which is the right level (see the Room Type
investigation).

`util/CancellationPolicy.evaluate()` (`:25-52`):

```java
if (!plan.isRefundable())                      penalty = lineSubtotal;      // full forfeit
else if (deadlineDays != null
     && now + deadlineDays < checkInDate)      penalty = 0;                 // inside free window
else                                           penalty = penaltyFor(plan);  // deadline passed
```

`penaltyFor()` switches on `cancellation_penalty_type`, defaulting to
`first_night`:

| Type | Penalty |
|---|---|
| `first_night` (default) | `ratePerNight` |
| `full_stay` | `lineSubtotal` |
| `percentage` | `percent(lineSubtotal, cancellationPenaltyValue)` |
| `fixed_amount` | `min(cancellationPenaltyValue, lineSubtotal)` |

| Rule | State | Where stored |
|---|---|---|
| Free cancellation | **Implemented** | `rate_plans.is_refundable` + `cancellation_deadline_days` |
| Cancellation deadline | **Implemented** | `rate_plans.cancellation_deadline_days` |
| Cancellation fees | **Implemented (computed only, never charged)** | `cancellation_penalty_type` / `_value` |
| Non-refundable rates | **Implemented** | `rate_plans.is_refundable = false` |
| **Rate-specific** policies | **Implemented** | `rate_plans` |
| **Room-type-specific** policies | **Do not exist** | — (`RoomType` holds no terms) |
| **Hotel-specific** policies | **Do not exist as logic** | `hotel_policies` is a display-only `(name, value, icon, sort_order)` bag |
| No-show policy | **Does not exist** | a `no_show` status exists; no rule attaches to it |
| Refund policy (beyond the penalty) | **Does not exist** | — |

---

## 5. Missing functionality (summary)

1. Refund execution, tracking and status — the largest gap.
2. Charging the computed cancellation penalty.
3. No-show handling: `no_show` is a settable status with no policy behind it,
   and a `no_show` reservation can still be cancelled (`doCancel` blocks only
   `checked_in`/`checked_out`/`cancelled`), zeroing out a no-show charge.
4. Hotel-level policy defaults / inheritance.
5. Guest-visible record of the fee actually charged.
6. No consumer for the `booking.cancelled` outbox event (no email, no
   notification — consistent with there being no email/SMS anywhere).

---

## 6. Risks

- **Refund gap is a money-handling risk**, not just a feature gap: the system
  tells the guest and staff a refund figure it has no mechanism to pay.
- **`refundAmount = totalAmount − penalty`** (`:619`) assumes the full total was
  collected. The moment `rate_plans.payment_timing` is honoured (deposits or
  pay-at-property — see the Room Type investigation), this over-states the
  refund for money never taken. These two work items are coupled.
- **A rate plan deleted after booking silently voids its penalty**
  (`:597-600`). Cancelling then refunds in full regardless of a
  non-refundable rate. Deleting a rate plan is a back-office action, so this is
  reachable.
- Static `cancellation-policy` page can contradict actual rate-plan terms.

---

## 7. Defects found (evidenced, not fixed)

### D1 — every cancellation reason is silently discarded

`doCancel()` resolves the reason code against `cancellation_reasons` and falls
back to `null` when it does not match (`BookingServiceImpl.java:610-614`):

```java
cancellation.setCancellationReasonId(
    cancellationReasonRepository.findByCode(reasonCode.trim())
        .map(CancellationReason::getId).orElse(null));
```

The seeded codes (`V10__seed_reference_data.sql:35-40`, `V31`) are:

```
guest_changed_plans · guest_found_cheaper · guest_duplicate_booking
property_issue · guest_no_show_policy · payment_timeout
```

Neither client sends any of them:

- Guest: `ReservationFlow.tsx:277` sends the hardcoded `'guest_requested'`.
- Back-office: `reservations/page.tsx:49` offers
  `guest_request | payment_failed | no_show | staff_correction`.

Every one falls through to `null`. `reservation_cancellations.
cancellation_reason_id` is therefore **always null in practice**, the
back-office renders "no reason" (`:309`), and the guest's selected reason
survives only as free text in `reason_note`. No error is raised, so nothing
surfaces the mismatch.

### D2 — the back-office cannot create a rate plan with its own default

`backoffice-hotel/src/components/hotels/rate-plans-tab.tsx:42` defaults
`paymentTiming` to `'full_at_booking'`, which is not one of
`pay_at_property | prepay_full | prepay_deposit`. Rejected by
`RateAdminServiceImpl.validPaymentTiming()` (`:432-438`) and by the DB CHECK.
Detailed in `ROOM_TYPE_PAYMENT_CONFIG_2026-09-01.md` §6.

Neither defect was fixed — this phase is audit-only.
