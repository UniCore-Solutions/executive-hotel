# DATA_FLOW

End-to-end traces, verified by reading the code on both sides of every hop.
`⚠` marks a step that is mocked, silently degraded, or dead-ends.

---

## 1. Stay search (guest) — REAL

```
/search  →  SearchResults.tsx (client)
  → services/catalog.ts  searchStay()
    → gqlRequest(StaySearchDocument)  ──POST /graphql (same-origin rewrite)──►
      StaySearchGraphQLController.staySearch()          ⚠ calls HotelRepository directly
        ├─ HotelRepository.findAllActive()                (ArchUnit violation)
        ├─ AvailabilityService.check()   → availability rows (sparse; missing = available)
        ├─ PricingService.rates()        → room_type_rate_plans ⋈ rate_plan_prices
        └─ CatalogQueryService           → room_types + amenities + media
  ← filters out soldout / capacity-mismatch / inactive, maps to SearchResultEntry
```

One round trip for all hotels. `catalog.ts` also keeps a `stayBatch()` path that builds
an aliased multi-hotel query (`a0/r0/t0, a1/r1/t1, …`) for the per-hotel seams.

**Currency:** the backend answers in MAD; `toBaseMad()` in `catalog.ts` divides by an
FX rate read from `NEXT_PUBLIC_FX_*` env vars. ⚠ FX rates are hardcoded build-time
constants, duplicated between `services/catalog.ts` and `lib/format.ts`.

---

## 2. Quote / pricing — REAL, single source of truth

```
RoomDetails.tsx / BookingFlow.tsx
  → services/quote.ts  getQuote()
    → gqlRequest(QuoteDocument) ──► RateGraphQLController.quote()
      → PricingServiceImpl.quote()
         ├─ resolve link (room_type_rate_plans) + nightly price covering check-in
         ├─ extras: per-stay / per-night / per-guest from `extras`
         ├─ promo: single code from `promotions`
         │     percentage → % of subtotal
         │     fixed_amount → min(value, subtotal)
         │     stay_x_pay_y → ⚠ throws VALIDATION "not supported yet"
         ├─ taxes/fees from `tax_fee_types`
         │     percentage · fixed_per_night · fixed_per_stay · fixed_per_guest
         └─ totals identity (invariant C16)
  ← Quote { lines[], extras[], charges[], subtotal, discount, tax, fee, total }
```

Since commit `82c4414` the guest frontend performs **no pricing arithmetic**.
`services/pricing.ts` was reduced to promo-code *validation hints only*, and its offer
catalog is hydrated from the backend by `pricingHydration.ensurePricingSources()`
(empty by default, so stale fixture offers can never leak in).

---

## 3. Booking → payment → confirmation — REAL persistence, ⚠ mock gateway

```
/booking  BookingFlow.tsx
  1. getQuote(...)                                     → live total shown to the guest
  2. reservations.create({ idempotencyKey, ... })
       → gqlRequest(CreateReservationDocument) ──► ReservationGraphQLController
         → BookingServiceImpl.create()   [ @Transactional — all of the following commit together ]
            ├─ findByIdempotencyKey → early return if replayed
            ├─ hotel must be status='active'
            ├─ room-type capacity check (maxAdults / maxChildren)
            ├─ PricingService.quote()   ← RE-PRICED SERVER-SIDE; client totals never trusted
            ├─ InventoryService.lockAndSell()
            │     ensureRow(roomTypeId, night) upsert  → SELECT … FOR UPDATE over the range
            │     → sell(units, totalInventory) or CONFLICT "no availability left"
            ├─ findOrCreateGuest(email)
            ├─ INSERT reservations (+ rooms, extras, charges, status_history)
            │     DataIntegrityViolation on idempotency_key → return the racing winner
            └─ EventPublisher.publish("booking.confirmed", …) → INSERT event_outbox
  3. payment.charge()
       → createPayment  → server validates amount ≤ remaining balance and currency match
       → capturePayment → ⚠ no PSP: provider reference becomes "MOCK-XXXXXXXX"
                          → reservation.payment_status = captured when fully paid
                          → outbox "payment.created" / "payment.captured"
  4. redirect /confirmation?ref=RC-XXXXXX
```

Idempotency, server-side re-pricing, and inventory locking are all genuine. The only
fictional part is the card capture.

---

## 4. Outbox → Kafka — REAL bus, ⚠ dead end

```
business tx ──INSERT event_outbox(status='pending')──┐   (@Transactional MANDATORY:
                                                     │    an event cannot exist
                                                     │    without its fact)
OutboxRelay @Scheduled(fixedDelay=1000ms)            │
  tx#1  claimBatch(50): pending → publishing, attempts+1   ← COMMITS BEFORE PUBLISHING
  (no tx) KafkaOutboxPublisher.publish(envelopes)          ← Kafka I/O outside any tx
  tx#2  markPublished(...)  |  releaseFailed(..., maxAttempts=5)

OutboxRelay.recoverStaleClaims @Scheduled(30s)
  releases rows stuck in 'publishing' older than 5 min

  ──► topic  hotelcollection.<eventType>.v<version>
        ⚠ zero @KafkaListener in the repository — nothing ever reads these.
        ⚠ `event_consumption` (the idempotent-consumer table) has never been written.
        ⚠ yet the backend container will not start unless Kafka is healthy.
```

---

## 5. Guest auth — REAL, ⚠ non-persistent

```
LoginForm → SessionContext.login()
  → services/auth.ts  fetch POST :8180/api/v1/auth/login   (bypasses the /graphql proxy)
    → AuthRestController → AuthServiceImpl → bcrypt verify → JwtService.issue()
  ← { token, me{ userId, email, roles, hotelIds } }
  → stored in `let _token` / `let _session`  ⚠ module memory only
  → graphqlClient.ts attaches `Authorization: Bearer <token>` to every GraphQL request

⚠ Page reload wipes the session. `restoreSession()` exists but is never called.
⚠ `reset(email)` returns a success message without contacting the backend — there is no
   password-reset flow anywhere in the system.
```

## 6. Back-office auth — REAL, correct

```
/login → POST /api/auth/login (BFF route handler)
  → serverRequest(LoginDocument) ──► backend GraphQL `login`
  → setSessionCookie(token): httpOnly, sameSite=lax, secure in prod, 7 days
Every later call → POST /api/graphql
  → getSessionToken() from the cookie → injects `Authorization: Bearer`
  → forwards to HOTEL_API_URL, streams the response body back
⇒ the token never reaches the browser and the backend URL is never exposed.
```

---

## 7. Cancellation — REAL

```
/reservation → reservations.cancel({ reference, email, reasonCode, reasonNote })
  → BookingServiceImpl.cancel()
     ├─ lookup by reference + guest email
     ├─ account-backed reservations refuse anonymous cancellation (403)
     ├─ reject if already cancelled / checked_in / checked_out
     ├─ per room line: PricingService.evaluateCancellation(ratePlan, …) → penalty, refundable
     ├─ INSERT reservation_cancellations (saveAndFlush → unique violation ⇒ clean CONFLICT
     │   on a concurrent double-cancel)
     ├─ status → cancelled, + status_history row
     ├─ InventoryService.release() → decrement sold; delete rows that become empty
     └─ outbox "booking.cancelled"
```

---

## 8. Media upload — REAL

```
Back-office → REST POST /api/v1/media/upload (multipart, authenticated)
  → MediaRestController → MediaStorageService → MediaStorageProvider
      └─ LocalFilesystemMediaStorageProvider → MEDIA_STORAGE_PATH (media_data volume)
  → INSERT media, associated via setHotelMedia / setRoomTypeMedia
  → served at GET /media/** ; public URLs built from MEDIA_BASE_URL
    ⚠ MEDIA_BASE_URL must be browser-resolvable (hence localhost:8180, not `backend`)
```

---

## 9. Flows that stop before reaching the backend

| Flow | Where it ends |
|---|---|
| **Online check-in** (`/checkin`) | Looks the reservation up for real, validates the form, then `setTimeout(900ms)` and flips local state. Source comment: *"Backend has no check-in mutation — mark as checked in client-side."* Nothing is persisted; `check_ins` stays empty; the reservation never leaves `confirmed`. |
| **Newsletter** | `services/newsletter.ts` → `localStorage['rc_newsletter_v1']`. No endpoint exists. |
| **Site search** | `services/siteSearch.ts` scans the static `DATA` fixture, not the backend. |
| **Cookie consent / recent activity** | `localStorage` by design (`rc_consent_v1`, `rc_recent_searches_v1`, `rc_recent_rooms_v1`). |
| **Password reset** | Returns a canned success string; no backend call. |
| **Notifications** | Back-office reads `notifications`; nothing ever writes it. |
| **Reviews after stay** | `createReview` demands a `checked_out` reservation; no code path can produce one. |
| **Homepage sections** | `getHomepage()` catches every error and returns `EMPTY_HOMEPAGE`; the page silently falls back to fixture sections, so a backend outage looks like normal content. |

---

## 10. Content sourcing on the guest site (the fixture/backend split)

Several routes have **two modes** selected by the presence of a `hotelid` UUID query param:

```
/hotel                    → LEGACY: static PROPERTY fixture ("Executive Hotel", Rabat)
/hotel?hotelid=<uuid>     → BACKEND: getHotelById() + live availability + rates
```

Still fixture-sourced (`import … from '@/data'`): `app/page.tsx` (home),
`app/hotel/page.tsx` (legacy branch), `app/index-2/page.tsx`, `app/faq/faq-client.tsx`,
`components/layout/{Header,Footer,SearchSheet}.tsx`,
`components/home/{RoomsGrid,DiscoverSection,RecentActivity}.tsx`,
`components/offers/OffersGrid.tsx`, `components/room/RoomDetails.tsx` (EXTRAS),
`services/{siteSearch,availability}.ts`.

> **This matters more than it looks.** The fixture describes *Executive Hotel* in Rabat.
> The seeded database contains *Azure Bay Resort* (Lisbon), *Dar Zellij* (Marrakech) and
> *Villa Aurelia* (Rome). A visitor moving from the home page into search crosses from
> one fictional hotel into three entirely different real ones.
