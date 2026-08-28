# Frontend ↔ Backend Contract Matrix

> **Status note (2026-08-26):** this matrix is a legacy map from the time the
> guest frontend ran on local mocks. Since then most guest services have been
> wired to the backend (search/catalog, quote/pricing, reservations, payment,
> auth via REST). Audit findings and current wiring live in
> `../../frontend-hotel/` source and `CURRENT_STATE_AUDIT.md`. Below is retained
> to document the field-for-field mapping and the still-unsupported cells
> (marked ❌/🟡).

The matrix maps each frontend service to its backend GraphQL counterpart, so a
mock→API swap is a pure find-and-replace per cell.

Legend: ✅ implemented & tested · ⚠️ implemented, semantic delta (documented) ·
❌ no backend counterpart (mock-only, needs a new mutation/query) · 🟡 partial

## Auth & account

| Frontend (`src/services/`) | Backend operation | Status | Delta |
|---|---|---|---|
| `auth.login(email, password)` | `login(input: LoginInput!): AuthPayload!` | ⚠️ | success/error message text differs ("Incorrect email or password." vs "invalid email or password"); backend returns `token`+`me`, frontend stores `{email,name,at}` |
| `auth.register(name,email,password)` | `register(input: RegisterInput!): AuthPayload!` | ⚠️ | frontend splits `name` into firstName/lastName (TBD); duplicate-email message differs (frontend says "already exists" — backend intentionally generic, no enumeration); backend also creates the `guests` profile |
| `auth.reset(email)` | — | ❌ | no reset/password-recovery endpoint (needs auth flow; ADR-007) |
| `auth.logout()` | — | ❌ | client-side only (stateless JWT — just drop the token) |
| `session()/isLoggedIn()` | `me: Me!` | ✅ | backend `Me` (email, roles, hotelIds) ↔ frontend session user |

## Catalog & search

| Frontend | Backend operation | Status | Delta |
|---|---|---|---|
| `availability.getProperty(id)` | `hotel(id: ID!): Hotel` | ✅ | frontend `Property` ↔ `Hotel` fields; `checkInTime`/`checkOutTime` now `String` `HH:mm` |
| `availability.searchRooms(...)` | `hotels(input: HotelSearchInput!)` + `availability(input)` | ⚠️ | backend search is free-text name/city/brand + sort (NAME_ASC/PRICE_ASC/RATING_DESC); frontend mock filters by its own deterministic demand — swap to backend inventory semantics (`available/few/soldout`, `rooms` honored) |
| `availability.getPlans(roomId)` | `rates(input: RatesInput!)` / `roomTypes(hotelId)` | ✅ | frontend `RatePlan` (id `"room::plan"`, price) ↔ backend RoomRateOption (roomTypeId, ratePlanId, pricePerNight) |
| `availability.getAvailability(roomId, ci)` | `availability(input: AvailabilityInput!)` | ⚠️ | frontend returns one Availability per room; backend returns `[RoomAvailability]` per room type incl. `capacityFits` |
| `availability.getOffers()` | `offers(hotelId)` | ✅ | frontend `Offer` (code/title/badge/minNights/windows/eligiblePlans/discount) ↔ `Promotion` (code, name, discountType `percentage`, value, validity) — **night-promo type has no backend field** 🟡 |
| `availability.getExtras()` | `extras(hotelId)` | ✅ | |
| `availability.getReviews()` | `reviews(hotelId, page)` / `hotelDetails(id)` | ✅ | backend returns approved reviews + aggregates |
| `siteSearch.query(q)` | `hotels(input: { query })` | ✅ | |

## Pricing & promos

| Frontend | Backend operation | Status | Delta |
|---|---|---|---|
| `pricing.compute(ctx)` | `quote(input: QuoteInput!)` | ✅ | math proven identical in `PricingServiceIntegrationTest` (12% tax on discounted base, totals identity, `originalTotal` pre-promo) |
| `pricing.validatePromo(code)` | `quote(input: { promoCode })` (invalid → `VALIDATION` "not a valid promo code") | ⚠️ | message texts differ; backend promo dataset must mirror `DATA.OFFERS` codes (TENOFF, …); frontend's booking-window/stay-window/min-nights/eligible-plans messages have no backend equivalents (backend promotes apply per `valid_from/to` + room/plan applicability) |
| `pricing.forRoomAndPlan` | `quote` with one `QuoteLineInput` | ✅ | |

## Reservations

| Frontend | Backend operation | Status | Delta |
|---|---|---|---|
| `reservations.create(data)` | `createReservation(input: CreateReservationInput!)` | ⚠️ | frontend `CreateReservation` fields (roomId `"room::plan"`, guest) must map to `rooms: [RoomInput]` (roomTypeId, ratePlanId) + `guest: ReservationGuestInput`; backend `created` flag ↔ frontend unshift + redirect |
| `reservations.find(ref, email)` | `reservation(input: ReservationLookupInput!)` | ✅ | reference format: backend `RC-` + 6 unambiguous chars; frontend `genRef()` differs — align on backend format on swap |
| `reservations.byEmail(email)` | `myReservations` (account) or `reservation` per ref | 🟡 | mock-only list by email — needs account-backed `myReservations` or guest email listing |
| `reservations.setCheckedIn(ref)` | — | ❌ | no check-in mutation in backend (check-ins table exists in schema; endpoint is future work) |
| `bookingKey.begin/finish` | `createReservation(idempotencyKey)` | ✅ | frontend idempotency key ↔ backend `idempotencyKey` UNIQUE; duplicate → `created: false` |

## Cancellation

| Frontend | Backend operation | Status | Delta |
|---|---|---|---|
| `cancellation.evaluate(...)` | `cancelReservation(input: CancelReservationInput!)` | ⚠️ | penalty math aligns (frontend policy per plan: free-cancel window / first-night / non-refundable ↔ `CancellationPolicy`), **but** account-backed bookings now require the owner's token (`FORBIDDEN` otherwise); frontend has no auth header → must add token handling on swap |
| — | `cancelReservation(reasonCode, reasonNote)` | ✅ | backend persists `ReservationCancellation` (reason code, note, penalty, refund) + status history + outbox `booking.cancelled` |

## Payments (simulated both sides)

| Frontend | Backend operation | Status | Delta |
|---|---|---|---|
| `payment.charge({card, amount})` | `createPayment` + `capturePayment` | 🟡 | backend requires **authenticated owner or staff** (`UNAUTHORIZED`/`FORBIDDEN` otherwise) — the mock has no concept of this; amounts are server-validated (must equal reservation total — no overpayment) |

## Content & marketing (deferred domains)

| Frontend | Backend | Status | Delta |
|---|---|---|---|
| `newsletter.subscribe(email, optedIn)` | — | ❌ | newsletter subscriptions table exists in schema; endpoint future work |
| `consent.get/save/reset` | — | ❌ | consent is a client concern (cookie/legal), no backend endpoint planned |
| `activity.recordSearch/recordRoomView` | — | ❌ | client-side personalization only |

## Swapping strategy

1. Replace each mock module with an HTTP client calling `POST /graphql`
   (Bearer token from `auth.login/register`), mapping `extensions.code` →
   frontend messages.
2. Align datasets: seed the backend with the frontend `DATA` fixtures
   (promos TENOFF…, rates, extras, reviews) so numbers match the demo.
3. Wire auth headers for `cancelReservation` (owner) and payments before
   flipping those modules; keep the "simulated" UI copy until then.
4. Implement the ❌ rows (reset, check-in, newsletter) as their own backend
   features before their mocks are removed.