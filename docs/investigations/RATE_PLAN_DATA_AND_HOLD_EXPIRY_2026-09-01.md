# Rate plan data + hold-expiry — pre-implementation investigation

**Date:** 2026-09-01 · **Status:** IMPLEMENTED — see §6 ·
**Follows:** `ROOM_TYPE_PAYMENT_CONFIG_2026-09-01.md`

> **Superseded in part.** The blocking risk this document identified (§2.2) has
> been fixed and `payment_timing` is now honoured end to end. §§1–5 are kept as
> the record of what was found and why; §6 states what actually shipped.

Queried against the **live database** (`hotel-platform-postgres`, stack up,
backend healthy), not inferred from migrations.

**Two headline findings:**

1. The rate-plan payment configuration is **deliberate, not defaulted** — this
   corrects the main risk stated in the previous report.
2. **Honouring `payment_timing` without first changing the hold-expiry job
   would auto-cancel every pay-at-property booking within 15 minutes.** That is
   the blocking prerequisite, and it hits the default plan of the only active
   hotel.

---

## 1. Every existing rate plan

```sql
SELECT h.name, rp.code, rp.payment_timing, rp.deposit_percentage,
       rp.is_refundable, rp.cancellation_deadline_days,
       rp.cancellation_penalty_type, rp.cancellation_penalty_value, rp.status
FROM rate_plans rp JOIN hotels h ON h.id = rp.hotel_id ORDER BY h.name, rp.code;
```

| Hotel | Code | Rate plan | payment_timing | Deposit | Refundable | Deadline | Penalty | Status |
|---|---|---|---|---|---|---|---|---|
| Dar Zellij | `COURTYARD` | Courtyard & Breakfast | `pay_at_property` | — | yes | 3 d | first_night | inactive |
| Dar Zellij | `HALF_BOARD` | Riad Half Board | `prepay_deposit` | **30 %** | yes | 5 d | percentage 30 % | inactive |
| **Executive Hotel** | **`BB_FLEX`** | Bed & Breakfast Flex | **`pay_at_property`** | — | yes | 2 d | first_night | **active** |
| **Executive Hotel** | **`SAVER`** | Non-Refundable Saver | **`prepay_full`** | — | **no** | — | full_stay | **active** |
| Villa Aurelia | `CLASSIC` | Palazzo Classic | `pay_at_property` | — | yes | 1 d | first_night | inactive |
| Villa Aurelia | `ROMA_SAVER` | Non-Refundable Roma | `prepay_full` | — | **no** | — | full_stay | inactive |

**Distribution:** `pay_at_property` ×3 · `prepay_full` ×2 · `prepay_deposit` ×1.
All 6 rows are valid against `chk_rate_plans_payment_timing`. **No invalid or
inconsistent values, and no NULLs.** All 18 `room_type_rate_plans` links are
`MAD`, consistent with the C8 composite FK.

### 1.1 These values are intentional — correcting the previous report

The previous investigation warned that plans may have "taken the column
default". **They did not.** `backend-hotel/scripts/seed.sql:145-150` writes
`payment_timing` explicitly, with matching guest-facing prose:

```sql
'Bed & Breakfast Flex','BB_FLEX', ... TRUE, 2,'first_night',NULL,'pay_at_property',NULL, ...
   payment_policy = 'Pay at the property'
'Non-Refundable Saver','SAVER',   ... FALSE,NULL,'full_stay', NULL,'prepay_full',    NULL, ...
   payment_policy = 'Full prepayment at booking'
```

Each hotel was given a coherent pair — a flexible pay-at-property rate with a
free-cancellation window, and a cheaper non-refundable prepaid rate — plus one
30 % deposit rate at Dar Zellij whose `cancellation_penalty_value` (30 %)
deliberately matches its deposit. `payment_policy` prose agrees with
`payment_timing` on every row.

**Consequence:** there is no data clean-up to do first. The data is right; the
code ignores it. This *removes* the "audit and correct the data before wiring"
risk and *raises* the behavioural risk in §2, because the intended behaviour is
already expressed and already wrong in production.

### 1.2 What guests are actually booking

```sql
SELECT rp.code, rp.payment_timing, count(*) FROM reservation_rooms rr
JOIN rate_plans rp ON rp.id = rr.rate_plan_id GROUP BY 1,2;
```

| Code | payment_timing | Reservation lines |
|---|---|---|
| `BB_FLEX` | `pay_at_property` | **63** |
| `SAVER` | `prepay_full` | 2 |

**97 % of all bookings are on a pay-at-property rate — and every one of them was
charged in full at booking**, because nothing reads the field. Every room type
of the active hotel is offered on `BB_FLEX`.

---

## 2. Hold-expiry / payment-status behaviour

### 2.1 Current behaviour (traced)

`BookingServiceImpl.create()` — `:252-257`:

```java
reservation.setStatus(ReservationStatus.pending);
reservation.setHoldExpiresAt(Instant.now().plus(holdMinutes, ChronoUnit.MINUTES));
```

**Unconditional.** No branch on rate plan, payment timing, or amount due. Every
reservation is born `pending` with a live 15-minute hold
(`application.yaml:68`, `RESERVATION_HOLD_MINUTES:15`).

The only exit is payment capture — `markFullyPaid()` `:501-508`:

```java
reservation.setPaymentStatus(PaymentStatus.captured);
if (reservation.getStatus() == ReservationStatus.pending) {
    reservation.setStatus(ReservationStatus.confirmed);
    reservation.setHoldExpiresAt(null);          // ← the only clear
}
```

The reaper — `ReservationHoldExpiryJob` (every 60 s) → `findExpiredHoldIds()`
(`ReservationRepository.java:109-114`):

```sql
select r.id from Reservation r
where r.status = pending and r.holdExpiresAt < :now
```

→ `BookingServiceImpl.expireHold()` `:535-548`, which re-checks under a row
lock and calls `doCancel(..., "payment_timeout", ...)`.

### 2.2 Would a `pay_at_property` reservation be treated as unpaid? **Yes.**

The trigger is `status = pending AND hold_expires_at < now` — **payment timing
is not consulted, and `hold_expires_at` is cleared only by a capture.** A
pay-at-property booking created without a payment attempt would therefore:

1. be created `pending` with a 15-minute hold,
2. never capture (correctly — nothing is due),
3. be picked up by the reaper within ~60 s of expiry,
4. be **auto-cancelled** with reason `payment_timeout`, inventory released,
   and a `booking.cancelled` event emitted.

The guest would receive a confirmed-looking booking that silently dies 15
minutes later. With `BB_FLEX` carrying 97 % of bookings, this would break
essentially all traffic.

### 2.3 The reaper is demonstrably live

```sql
SELECT r.status, r.payment_status, count(*), count(r.hold_expires_at) FROM reservations r GROUP BY 1,2;
```

| status | payment_status | count | with live hold |
|---|---|---|---|
| confirmed | captured | 34 | 0 |
| **cancelled** | **pending** | **26** | **24** |
| cancelled | captured | 3 | 0 |
| confirmed | pending | 2 | 0 |

26 reservations already cancelled at `payment_status = pending`; stored
cancellation reasons confirm the source:

| reason_code | count |
|---|---|
| `payment_timeout` | **23** |
| *(null — none stored)* | 4 |
| `guest_changed_plans` | 2 |

This is not a theoretical risk — the mechanism fires regularly today.

> **Correction to the cancellation audit (D1).** That audit stated the reason
> code is "always null in practice". The data shows otherwise: 25 of 29
> cancellations *do* carry a valid code, because the automated path
> (`expireHold`) passes `payment_timeout`, which **is** seeded (V31). D1 is
> real but narrower than stated — it affects only the two interactive clients
> (guest `guest_requested`, back-office `guest_request|payment_failed|no_show|
> staff_correction`), which account for the 4 null rows. The audit file is left
> unchanged as instructed; this note is the correction of record.

Also note `confirmed / pending` ×2 — reservations confirmed without a capture.
Worth a separate look; not investigated here.

---

## 3. Recommended implementation (still not implemented)

Confirmed: payment configuration belongs on the **Rate Plan**. Nothing in the
data contradicts it — the three timings are already modelled, populated and
internally consistent, and `RoomType` still carries no commercial terms.

**Ordering matters. The hold-expiry change must land first or simultaneously —
never after.**

1. **Make the hold conditional.** In `create()`, set `holdExpiresAt` only when
   money is actually due now. This is the prerequisite for everything else.
2. Introduce a `PaymentTiming` enum (matching how `CancellationPenaltyType`
   and `PaymentStatus` already mirror DB CHECKs) and replace the `String`.
3. Derive `amountDueNow` in `PricingService`:
   `pay_at_property → 0`, `prepay_full → total`,
   `prepay_deposit → percent(total, depositPercentage)`.
4. Decide the resting state for a pay-at-property booking (see §5).
5. `PaymentServiceImpl` charges `amountDueNow`, not `totalAmount`.
6. Expose `amountDueNow` / `amountDueAtProperty` (additive) and surface it in
   the guest tunnel: badge the rate, skip the card step when nothing is due,
   label the deposit case.

### Data migration / configuration requirements

- **None for the rate plans themselves** — the data is already correct (§1.1).
- **Existing reservations need no backfill**, but any pre-cutover row should be
  read as fully prepaid; there is no `amount_due_now` column to populate.
- If a new `payment_status` value is chosen (§5), that is a DB CHECK migration
  *and* a change to the reaper's predicate.

---

## 4. Risks

| Risk | Severity |
|---|---|
| **Pay-at-property bookings auto-cancelled by the hold reaper** | **Blocking** — breaks 97 % of current booking traffic |
| Refund maths `refundAmount = total − penalty` (`BookingServiceImpl.java:619`) over-states refunds once less than the total is collected | High — promises money never taken |
| `BB_FLEX` stops charging at booking the day the field is honoured; revenue arrives at the property instead | High, and *intended* — but a business cutover, not a silent deploy |
| No real gateway; a partial deposit cannot be validated end to end | Medium |
| Mixed timings within one reservation are unmodelled and unguarded | Medium |
| Guest-facing `cancellation-policy` page is static prose, unlinked to rate-plan data | Low |

---

## 5. Decisions requiring approval

1. **Resting state for a pay-at-property booking.** Reuse `pending` (and make
   the reaper's predicate payment-timing-aware), or add a new
   `payment_status` such as `due_at_property` (DB CHECK migration, plus the
   same reaper change)? **Either way the reaper must change.**
2. **Business cutover for `BB_FLEX`.** Honouring the data moves the collection
   point for the vast majority of bookings from checkout to the front desk.
   Is that the intent, or should `BB_FLEX` be re-configured to `prepay_full`
   first? This is a revenue decision.
3. **Mixed payment timings in one reservation** — forbid, or split the amount
   due? (Recommend: forbid initially.)
4. **Deposit forfeiture on cancellation** — is a deposit forfeited
   independently of the penalty rule? Currently unmodelled.
5. Whether to fix D1/D2 and investigate the 2 `confirmed / pending`
   reservations as separate work items.

Nothing above has been implemented.

---

## 6. What shipped

`payment_timing` is now read by the booking path, not just stored.

**The hold fix (the blocker in §2.2).** `BookingServiceImpl.buildReservation`
sets a payment hold only when money is actually due at booking:

```java
boolean dueAtProperty = quote.amountDueNow().compareTo(MoneyUtil.ZERO) == 0;
reservation.setStatus(dueAtProperty ? confirmed : pending);
reservation.setHoldExpiresAt(dueAtProperty ? null : now + holdMinutes);
```

The expiry job needed **no change**: its predicate is
`status = pending AND holdExpiresAt < now`, and a null hold can never match.
A pay-at-property booking is therefore confirmed outright and invisible to the
reaper — verified live, a booking survived ~10 minutes of 60-second job cycles,
and by `PaymentSimulationIntegrationTest#payAtPropertyBookingIsConfirmedWithout
AHoldAndSurvivesTheExpiryJob`.

**Amount due.** `util/PaymentTerms` derives it from the rate plan:
`pay_at_property → 0`, `prepay_full → total`,
`prepay_deposit → percent(total, depositPercentage)`. The quote carries
`paymentTiming` and `amountDueNow`, so the client displays what it is told
rather than recomputing money.

**Mixed carts are rejected** (§5 decision 1): `PaymentTerms.timingOf` throws
`VALIDATION` when one booking's room lines disagree about payment timing.

**Resting state** (§5 decision 4): `status = confirmed`,
`paymentStatus = pending`, no new enum value and no migration. The guest-facing
distinction comes from the rate plan instead — `ReservationRoomLine.paymentTiming`
is resolved from the rate catalog, so the confirmation says "Due at the hotel"
rather than reporting a payment that is pending by design.

**Guest flow.** With nothing due, the tunnel asks for no card, starts no payment
attempt, and lands on a settled confirmation (no `status=processing`, no
polling).

### Still open

- **The column default is `pay_at_property`** (`V4__pricing_promotions.sql:32`).
  Now that the value is honoured, a rate plan created without setting it
  confirms bookings that are never charged. This already bit the test fixtures,
  which had to be made explicit. Consider defaulting to `prepay_full` — the
  conservative reading — in a follow-up migration.
- **Refunds still assume the full total was collected**
  (`BookingServiceImpl:refundAmount = total − penalty`). Cancelling a
  pay-at-property booking therefore reports a refund of money never taken. This
  is now reachable and should be fixed next.
- `prepay_deposit` is implemented in the pricing path but no active rate plan
  uses it, so it is untested against a real booking.
