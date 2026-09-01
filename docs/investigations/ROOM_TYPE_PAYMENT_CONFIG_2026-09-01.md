# Room Type payment configuration — architecture investigation

**Date:** 2026-09-01 · **Status:** investigation only, nothing implemented ·
**Scope:** where "pay now vs. pay at the hotel" belongs in this system.

**Headline: the configuration already exists.** It lives on `rate_plans`, it is
already admin-editable and already exposed through GraphQL — and **no code path
reads it**. This is a wiring problem, not a modelling problem. Do not design a
new column.

---

## 1. Existing architecture

### 1.1 Entity graph (traced, not inferred)

```
Hotel  (hotels)
  ├── RoomType      (room_types)     — sellable product
  │     └── Room    (rooms)          — physical unit, room_type_id FK
  ├── RatePlan      (rate_plans)     — commercial terms  ← policy lives here
  ├── HotelPolicy   (hotel_policies) — display-only name/value pairs
  └── TaxFeeType    (tax_fee_types)
              │
   RoomTypeRatePlan (room_type_rate_plans)   — the offer: (room_type × rate_plan)
              │
        RatePlanPrice (rate_plan_prices)     — price per date
              │
        Reservation (reservations)
              ├── ReservationRoom  (reservation_rooms)  — carries room_type_id + rate_plan_id
              ├── ReservationExtra / ReservationCharge
              └── ReservationCancellation
              │
        Payment (payments) · PaymentTransaction (payment_transactions)
```

| Concept | Entity | File |
|---|---|---|
| Hotel | `Hotel` | `backend-hotel/src/main/java/com/hotelcollection/hotel/entity/Hotel.java` |
| Room type | `RoomType` | `.../entity/RoomType.java` |
| Physical room | `Room` | `.../entity/Room.java` |
| Rate plan | `RatePlan` | `.../entity/RatePlan.java` |
| Offer junction | `RoomTypeRatePlan` | `.../entity/RoomTypeRatePlan.java` |
| Price | `RatePlanPrice` | `.../entity/RatePlanPrice.java` |
| Reservation | `Reservation` | `.../entity/Reservation.java` |
| Booked line | `ReservationRoom` | `.../entity/ReservationRoom.java` |
| Payment | `Payment`, `PaymentTransaction` | `.../entity/Payment.java` |

**Key structural fact:** `RoomType` carries **no commercial terms at all** — no
price, no payment policy, no cancellation policy. Price and terms attach to the
`RatePlan`, and a room type becomes sellable only by being *linked* to a rate
plan through `room_type_rate_plans`. The junction is hotel-scoped and its
currency is pinned to the rate plan's by a composite FK
(`RoomTypeRatePlan.java:20-22` documents C3/C8;
`V4__pricing_promotions.sql:47-58`).

So the system's existing pattern is:

```
Hotel → RatePlan (terms) ──┐
                           ├── RoomTypeRatePlan (the offer) → RatePlanPrice
Hotel → RoomType  ─────────┘
```

Not `Hotel → RoomType → payment config`.

### 1.2 The payment configuration that already exists

`RatePlan.java:52-69`:

```java
private String paymentPolicy;            // guest-facing prose
private boolean isRefundable;
private Short cancellationDeadlineDays;
private CancellationPenaltyType cancellationPenaltyType;
private BigDecimal cancellationPenaltyValue;
private String paymentTiming;            // NOT NULL
private BigDecimal depositPercentage;
```

The database constrains them (`V4__pricing_promotions.sql:19-37`):

```sql
payment_timing VARCHAR(20) NOT NULL DEFAULT 'pay_at_property'
    CHECK (payment_timing IN ('pay_at_property','prepay_full','prepay_deposit')),
deposit_percentage NUMERIC(5,2) CHECK (... BETWEEN 0 AND 100),
cancellation_penalty_type VARCHAR(20)
    CHECK (... IN ('percentage','fixed_amount','first_night','full_stay')),
```

That enum is exactly the business requirement in the brief: **pay at hotel /
pay in full during booking / partial deposit**, plus deadline, penalty and
refundability.

### 1.3 How far it is already wired

| Layer | State | Evidence |
|---|---|---|
| Database | **Implemented**, CHECK-constrained | `V4__pricing_promotions.sql:19-37` |
| Entity | **Implemented** | `RatePlan.java:52-69` |
| Admin write | **Implemented**, validated | `RateAdminServiceImpl.java:93,101-102,137,149-152`; `validPaymentTiming()` at `:432-438` |
| Admin GraphQL | **Implemented** | `graphql/rate/rate.graphqls:136-185` (`AdminRatePlan`, `AdminRatePlanInput`) |
| Guest GraphQL | **Implemented** | `graphql/rate/rate.graphqls:114-129` — `RatePlan.paymentTiming: String!` |
| Back-office UI | **Implemented** (free-text) | `backoffice-hotel/src/components/hotels/rate-plans-tab.tsx:259` |
| **Booking logic** | **NOT implemented** | no reference to `paymentTiming` in `BookingServiceImpl` |
| **Payment logic** | **NOT implemented** | no reference in `PaymentServiceImpl` |
| **Pricing/quote** | **NOT implemented** | `PricingServiceImpl` reads only `getCancellationPolicy()` / `isRefundable()` (`:127`) |
| **Guest frontend** | **NOT implemented** | `paymentTiming` appears nowhere in `frontend-hotel/src` outside generated types |

Verification:

```bash
grep -rn "paymentTiming\|depositPercentage" backend-hotel/src/main/java \
  | grep -E "Booking|Payment|Pricing"     # → no hits
grep -rn "paymentTiming" frontend-hotel/src --include=*.tsx --include=*.graphql
                                          # → no hits outside graphql/generated
```

---

## 2. Current payment behaviour

**Every booking is treated as prepay-in-full, unconditionally.**

Traced through `BookingServiceImpl` → `PaymentServiceImpl`:

1. The guest completes the tunnel and `BookingFlow.tsx` calls
   `POST /api/v1/reservations`, then `startPaymentAttempt` — always, for every
   rate plan.
2. `PaymentServiceImpl` creates a `Payment` and moves the reservation's
   `paymentStatus` through `pending → authorized → captured`. There is no
   branch on rate plan.
3. `app.payments.auto-settle-enabled` (default **false**, and refused under the
   `prod` profile by `config/PaymentSafetyConfig`) simulates the settlement
   webhook. The provider is simulated end to end — there is no real gateway in
   this repository.
4. `ReservationHoldExpiryJob` cancels pending reservations whose payment hold
   lapses (`V31__payment_hold_expiry_and_webhook.sql`).

`depositPercentage` is never multiplied by anything. `pay_at_property` is
storable and unreachable.

The only rate-plan terms that *are* honoured are the cancellation ones, and only
at cancel time — `CancellationPolicy.evaluate()`
(`.../util/CancellationPolicy.java:25-52`), called from
`BookingServiceImpl.doCancel():593-605`.

---

## 3. Recommended design

> Everything in this section is **recommendation**, not existing behaviour.

### 3.1 Where the configuration belongs — Rate Plan

Confirmed by the existing architecture, not chosen a priori:

- **Not Hotel.** `hotel_policies` is a display-only `(name, value, icon,
  sort_order)` bag (`HotelPolicy.java`) with no typed semantics. It is
  brochure content and cannot drive logic.
- **Not Room Type.** `RoomType` holds no commercial terms today. Putting
  payment timing there would contradict the invariant that a room type is a
  product and a rate plan is its terms — and it would be unable to express the
  normal hotel case of *the same room* sold as a cheap non-refundable prepaid
  rate and a flexible pay-at-property rate.
- **Rate Plan.** Already the home of currency, meal plan, refundability,
  cancellation deadline and penalty. `payment_timing` is already there.

The `Hotel → RoomType → Rate → Payment Policy` shape in the brief is therefore
already the shape of the system, with the refinement that the rate plan attaches
to the room type through `room_type_rate_plans` rather than beneath it.

### 3.2 Required work (all *wiring*, no new concepts)

**Database:** none required for pay-now/pay-later/deposit. All columns and
constraints exist.

*Optional, only if per-offer overrides are actually wanted:* a nullable
`payment_timing` on `room_type_rate_plans` for "this room type is prepay-only
even on the flexible rate". **Recommend deferring** — no evidence of demand, and
it introduces an inheritance rule the codebase does not currently have anywhere.

**Backend:**
1. Promote `paymentTiming` from `String` to an enum (`PaymentTiming`), matching
   how `CancellationPenaltyType` / `ExtraPricingModel` / `PaymentStatus` are
   already modelled as enums against DB CHECKs.
2. `PricingService` / `QuoteResult`: add an `amountDueNow` alongside `total`,
   derived as `pay_at_property → 0`, `prepay_full → total`,
   `prepay_deposit → percent(total, depositPercentage)`. The room line already
   knows its rate plan, so this needs no new lookup.
3. `BookingServiceImpl`: when every line is `pay_at_property`, confirm the
   reservation **without** a payment attempt and set `paymentStatus = pending`
   with a "due at property" meaning.
4. `PaymentServiceImpl`: charge `amountDueNow`, not `totalAmount`.
5. **Mixed-cart rule needed** — a reservation can hold several
   `ReservationRoom` lines on different rate plans. Today nothing forbids
   mixing `prepay_full` and `pay_at_property` in one reservation. This must be
   decided, not defaulted (see §5).

**API:** additive only — `amountDueNow` / `amountDueAtProperty` on the quote and
the reservation. No breaking change; `paymentTiming` is already in the guest
`RatePlan` type.

**Admin UI:** replace the free-text `paymentTiming` input
(`rate-plans-tab.tsx:259`) with a select over the three legal values, and show
`depositPercentage` only for `prepay_deposit`.

**Booking flow (guest):** `RoomDetails` should badge the rate ("Pay at the
hotel" / "Pay now"); `BookingFlow` should skip the card step entirely when
nothing is due now, and label the payment step "Deposit due today" for
`prepay_deposit`. The two-step stepper already supports a variable step set.

---

## 4. Risks

| Area | Risk |
|---|---|
| Existing reservations | None from the wiring itself — no schema change, and `payment_timing` is `NOT NULL DEFAULT 'pay_at_property'`. **But**: see next row. |
| Existing rate plans | **This is the sharp edge.** Any seeded plan that took the column default is `pay_at_property`. The moment booking starts honouring the field, those rates stop charging at booking. Audit and correct the data *before* wiring: `SELECT code, payment_timing FROM rate_plans;` |
| Existing bookings | Historical rows have no `amountDueNow`; any report must derive it or treat pre-cutover rows as fully prepaid. |
| Payment processing | The provider is simulated. A partial-deposit charge cannot be validated against a real gateway here. |
| Cancellation | Refund maths currently assumes the full total was taken. With deposits or pay-at-property, `refundAmount = total − penalty` (`BookingServiceImpl.java:619`) is **wrong** — it would promise a refund of money never collected. Must be fixed in the same change. See the cancellation audit. |
| Admin UI | The current free-text field already lets staff save an invalid value and get an opaque `invalid payment timing` error — see §6. |
| API compatibility | Additive only; low. |
| Migrations | None needed. |

---

## 5. Decisions requiring human approval

1. **Mixed payment timings in one reservation** — forbid at validation, or
   split the amount due? Recommendation: forbid initially (simplest, matches
   how single-hotel/single-stay this product is).
2. **Data correction for existing rate plans** — which seeded plans should be
   `prepay_full`? A business call, not a code call.
3. **Per-(room type × rate plan) override** — build the
   `room_type_rate_plans.payment_timing` override now, or defer?
   Recommendation: defer.
4. **What `paymentStatus` means for a pay-at-property booking** — reuse
   `pending`, or introduce `due_at_property`? The latter is a DB CHECK change
   and affects the hold-expiry job, which cancels *pending* reservations and
   would otherwise cancel every pay-at-property booking.
5. **Deposit refundability** — is a deposit forfeited on cancellation
   independently of the penalty rule? Currently unmodelled.

Nothing above has been implemented.

---

## 6. Defect found during the investigation (not fixed)

**The back-office cannot create a rate plan with its own default value.**

`backoffice-hotel/src/components/hotels/rate-plans-tab.tsx:42` seeds the create
form with:

```ts
paymentTiming: 'full_at_booking',
```

`'full_at_booking'` is not one of the three legal values. `validPaymentTiming()`
(`RateAdminServiceImpl.java:432-438`) rejects it with `invalid payment timing`,
and the DB CHECK would reject it too. The same string is used as the input's
placeholder at `:259`. Any staff member who creates a rate plan without
overwriting the prefilled field gets an opaque validation error.

Fix (out of scope for this audit): make the field a select over
`pay_at_property | prepay_full | prepay_deposit`, defaulting to
`pay_at_property` to match the column default.
