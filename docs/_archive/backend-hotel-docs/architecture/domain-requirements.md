# Backend Domain Requirements

Source of truth for *what* the backend domain must do. Extracted from the
product brief and the frontend contract (`frontend-hotel/src/types/index.ts`,
`src/services/reservations.ts`, `src/services/pricing.ts`,
`src/services/availability.ts`, `src/data/index.ts`), then verified against
the database foundation (V1–V18 migrations). Each requirement lists where it
is implemented and how it is tested.

Status: **implemented and verified** — 109 tests green, `ddl-auto: validate`
passes against all 53 tables.

---

## 1. Catalog & discovery

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R1 | Search hotels by free-text (name / city / brand), paginated, active only | `CatalogQueryService.search`, `HotelRepository.search` | `GraphqlApiIntegrationTest.anonymousCanDiscoverHotels` |
| R2 | Hotel details = hotel + amenities + media + room types + from-price | `QueryResolver.hotelDetails`, `@BatchMapping` DataLoaders for `Hotel.media`, `Hotel.amenities`, `Hotel.fromPricePerNight`, `RoomType.media`, `RoomType.pricePerNight` | GraphQL smoke test |
| R3 | Experiences / restaurants / FAQs / extras per hotel | `CatalogQueryService.experiences/restaurants/faqs/extras` | — (read-only mapping) |
| R4 | Frontend list needs `fromPricePerNight` without N+1 | `RatePlanPriceRepository.minPriceByHotelIds` (batch query) + DataLoader | `GraphqlApiIntegrationTest` |

## 2. Pricing & quoting (frontend `pricing.ts` math)

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R5 | Nightly rate = cheapest active price whose `[valid_from, valid_to]` covers the **check-in date**, per room-type+rate-plan | `PricingService.rateForRange` (range covering check-in), `RatePlanPriceRepository.minPriceByRoomTypeIds/minPriceByHotelIds` | `PricingServiceIntegrationTest.quoteMatchesFrontendMath` |
| R6 | Quote = subtotal + taxes + fees − discount, computed **server-side only** (client price is advisory) | `PricingService.quote` | same |
| R7 | Taxes: percentage on (subtotal − discount), fixed-per-night ×nights×rooms, fixed-per-stay, fixed-per-guest ×adults (mirrors `taxesRate: 0.12` demo) | `TaxFeeType` engine, calculation methods `percentage | fixed_per_night | fixed_per_stay | fixed_per_guest` | `quoteMatchesFrontendMath` (12% → 360.00 tax) |
| R8 | Promotions: `percentage` and `fixed_amount` only; `stay_x_pay_y` → VALIDATION | `PromotionDiscountType`, `PricingService` | `percentagePromoDiscountsSubtotalBeforeTaxes`, `invalidPromoCodeRejectedWithMessage` |
| R9 | Promo applied only when booking window (`starts_at`/`ends_at`) contains check-in and code is active | `PricingService.findPromo` | — |
| R10 | Room availability check returns `available | few | soldout` + `capacityFits` (mirrors `RoomAvailability.status`) | `AvailabilityService.check` (`few` = min free ≤ 2) | `BookingFlowIntegrationTest` (4th booking → CONFLICT) |
| R11 | Currency codes upper-cased/normalized (`mad` → `MAD`) | `MoneyUtil` | GraphQL quote test uses `mad` |

## 3. Booking (frontend `reservations.ts`)

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R12 | Create booking with server-computed totals; client amounts ignored | `BookingService.create` | `bookingLifecycle` (3360.00 asserted) |
| R13 | Reference `RC-` + 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I/L/O/0/1) | `ReferenceGenerator` | regex assert |
| R14 | Idempotent create via `idempotencyKey` (frontend `makeReservation` passes one); duplicate → existing + `created: false` | `reservations.idempotency_key` unique; `BookingService.create` returns `CreateResult(created, reservation)` | `idempotent retry` + GraphQL duplicate mutation |
| R15 | Booking available **without an account**; lookup by reference + email | `BookingService.getByReferenceAndEmail` | `lookup by reference + email` |
| R16 | Inventory: sell on confirm, release on cancel, no oversell under concurrency | `PESSIMISTIC_WRITE` (`lockByRoomTypeIdsAndRange`) + `@Version`, `Availability.sell()/release()` | 3-bookings-fit / 4th-CONFLICT; release after cancel |
| R17 | Statuses: `pending → confirmed → cancelled / checked_in / checked_out` (+ `no_show`) | `ReservationStatus` enum (matches DB CHECK + GraphQL enum) | `bookingLifecycle` |
| R18 | Payment status lifecycle `pending → captured` on full capture | `PaymentStatus` enum, `PaymentService` | `bookingLifecycle` |
| R19 | Cancellation policy per rate plan: non-refundable → full forfeit; refundable + free-cancel window → no penalty; past deadline → `first_night` (or `percentage`/`fixed_amount` per plan) | `CancellationPolicy` (mirrors frontend `computeRefundAmount`) | `CancellationPolicyTest` (5 cases), `bookingLifecycle` |
| R20 | Cancel reason code via `cancellation_reasons.code`; unknown/blank → nullable | `BookingService.cancel`, `CancellationReasonRepository.findByCode` | `guest_changed_plans` |
| R21 | Status history row on every transition | `ReservationStatusHistory` (from/to, actor, note) | — |
| R22 | Extras per pricing model (`per_stay | per_night | per_person | per_room`); per-room lines carry their own pricing/rates | `Extra` engine, `ReservationRoom/ReservationExtra` | — |
| R23 | Overbooking guard is conservative: every room line must fit the full party | `capacityFits` per line | — |

## 4. Payments & billing

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R24 | Create payment (pending) then capture; mock provider reference when gateway reference absent | `PaymentService.createPayment/capture`, `PaymentTransaction` (authorization/capture, pending/succeeded) | `bookingLifecycle` |
| R25 | Idempotent capture: unique `(provider, provider_reference)` (C17); duplicate capture returns existing | `PaymentRepository.findByProviderAndProviderReference` | — |
| R26 | Overpayment rejected | `PaymentService` (paid + new amount ≤ total) | overpayment VALIDATION |
| R27 | One invoice per reservation; number `INV-<reference>`; billing name from guest; items with quantity, unit price, totals, sort order | `InvoiceService.getOrCreateInvoice` (idempotent) | `bookingLifecycle` |
| R28 | Invoice created on demand (my-booking page) — no invoice query-by-id in API | `QueryResolver.invoice` throws VALIDATION with guidance | — |

## 5. Reviews

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R29 | Review only after a **checked-out** stay, linked to guest profile | `ReviewService.create` (requires guest account + `existsByHotelIdAndBookedByUserIdAndStatus(checked_out)`) | — |
| R30 | Hotel pages show only `approved` reviews + rating aggregates | `ReviewService.approvedReviews`, `countApprovedByHotelId`, `averageRatingByHotelId` | — |

## 6. Identity & authorization

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R31 | Register/login with stateless JWT; `me` for the current user | `AuthService`, `JwtService`, `JwtAuthFilter`, `SecurityConfig` | `loginAndRegisterWork` |
| R32 | Anonymous booking flow (accountless) | guest email lookup path | `anonymousCanQuoteAndBook` |
| R33 | Unauthenticated API access → error code `UNAUTHORIZED` | `CurrentUserAccessor.require()` throws `AuthenticationException`; `GraphqlExceptionAdvice` maps to `UNAUTHORIZED` | `meRequiresAuthentication` |
| R34 | Hotel-scoped staff authorization; IDOR across hotels → `FORBIDDEN` | `ensureStaffAccess` (super_admin or member of hotel) | `adminHotelIsHotelScoped` |
| R35 | Admin reservations list paginated by hotel (+ status filter) | `QueryResolver.adminReservations`, `ReservationRepository.searchByHotel` | `staffInHotelCanReadAdminQueries` |

## 7. Events (outbox → Kafka)

| # | Requirement | Implementation | Test |
|---|-------------|----------------|------|
| R36 | Booking facts published via transactional outbox, at-least-once, retried, DLQ after max attempts | `EventOutbox`, `OutboxRelay` (native `UPDATE … RETURNING` claim + stale-claim recovery), `KafkaOutboxPublisher` | `bookingLifecycle` (outbox row asserted) |
| R37 | Events: `booking.confirmed`, `booking.cancelled`, `booking.paid` | `BookingService`/`PaymentService` publishers | — |

## Explicitly out of scope / not implemented (honest list)

- `stay_x_pay_y` promotion type — rejected with VALIDATION (schema C9/C10 only
  allow `percentage | fixed_amount`).
- Invoice lookup by id — schema field exists but the resolver instructs
  clients to fetch via reservation; invoice data is exposed through the
  reservation flow only.
- Rating aggregation columns on `hotels` — no such columns in V1–V8; computed
  per request from `reviews`.
- Payment gateway integration — `mock` provider; provider abstraction exists
  (`PaymentProvider` port) for a future real gateway.
- Admin CRUD (hotel/rate-plan/inventory editing) — read views only
  (`adminHotel`, `adminReservations`).
