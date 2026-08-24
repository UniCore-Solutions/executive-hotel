# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# API Split Recommendation — GraphQL vs REST

Status: DRAFT — NO CHANGES MADE. This is a recommendation only.

Current state: 62 GraphQL operations (30 queries + 32 mutations) over a single `POST /graphql`.

Recommended split (per owner direction): **all data reads stay in GraphQL; guest-facing write/action operations move to REST.**

---

## Stay in GraphQL (54 operations)

### All queries — reads (30)

**Index page data (guest):**
| Operation | Purpose |
|---|---|
| hotels | Hotel list with experiences, reviews, from-price |
| experiences | Hotel experiences |
| restaurants | Hotel restaurants |
| extras | Hotel extras |
| faqs | Hotel FAQs |
| offers | Promotions/offers |
| reviews | Guest reviews |

**Hotel & room details (guest):**
| Operation | Purpose |
|---|---|
| hotel | Hotel details |
| hotelDetails | Full hotel page composite |
| roomTypes | Room details with media, price, amenities |

**Stay & pricing reads (guest):**
| Operation | Purpose |
|---|---|
| availability | Room availability by date/guests |
| rates | Rates by room type/plan |
| quote | Quote calculation |

**Account & reservation reads (guest):**
| Operation | Purpose |
|---|---|
| me | User details |
| myReservations | Guest reservation list |
| reservation | Reservation details by reference |

**Admin reads (14):**
adminAmenities, adminHotels, adminHotel (workspace), adminReservations, adminGuests, adminPayments, adminInvoices, adminPromotions, adminReviews, adminUsers, adminRoles, adminNotifications, adminAuditLogs, adminDashboard

### Admin mutations (24, backoffice untouched)
createHotel, updateHotel, setHotelAmenities, setHotelMedia,
createRoomType, updateRoomType, setRoomTypeAmenities, setRoomTypeMedia,
createRoom, updateRoom,
createRatePlan, updateRatePlan, linkRoomTypeRatePlan, unlinkRoomTypeRatePlan, setRatePlanPrices,
updateAvailability,
createPromotion, updatePromotion, setPromotionStatus,
moderateReview, adminCancelReservation,
createUser, assignRole, revokeRole

---

## Move to REST (8 operations)

Guest-facing write/action operations. Consumer: frontend-hotel (guest site).

| Operation | Proposed REST |
|---|---|
| login | POST /auth/login |
| register | POST /auth/register |
| createReservation | POST /reservations (Idempotency-Key header) |
| cancelReservation | POST /reservations/{reference}/cancel |
| createPayment | POST /payments |
| capturePayment | POST /payments/{id}/capture |
| issueInvoice | POST /reservations/{reference}/invoice |
| createReview | POST /hotels/{id}/reviews |

Note on logout: **no logout operation exists in the backend today** (JWT is stateless). Guest logout = client discards the token (and clears the cookie if one is used). A `POST /auth/logout` would only be meaningful with a server-side token blocklist — not currently planned.

---

## Neither REST nor GraphQL (internal only)

| Item | Reason |
|---|---|
| Outbox relay → Kafka | Infrastructure, not a business API |
| event_consumption dedupe | Internal bookkeeping |
| backoffice /api/graphql + /api/auth/* proxies | Plumbing, unchanged |
| GraphiQL | Dev tool, disable in production |
| Seed tooling | Ops tool |
| /actuator/health | Already REST, keep |

---

## Trade-offs of this split (awareness only)

1. **Guest frontend consumes two transports**: GraphQL for all reads, REST for writes. More client plumbing than a single style, but reads are mostly at page load and writes are discrete user actions — the mix is manageable.
2. **Catalog caching**: GraphQL POSTs are not HTTP-cacheable, so the index page and hotel details lose CDN/browser caching that a REST GET would give. Mitigations if needed later: persisted queries + GET-based GraphQL, or a CDN-friendly REST cache layer in front of the same GraphQL queries.
3. **Auth is shared**: the same JWT works for both transports — no double login logic. One authorization model (JWT header for REST, same JWT for GraphQL).
4. **No logic duplication**: REST mutations and GraphQL reads all delegate to the same `service/` classes.

---

## Decisions so far (owner-confirmed)

- createReview → **REST** (confirmed).
- Logout → **no backend API needed**. The backend JWT is stateless (60 min TTL, no refresh tokens, no blocklist — ADR-007 not implemented). There is nothing server-side to invalidate. Guest logout = client discards the token.
  - Exception: if the guest frontend ever stores the JWT in an httpOnly cookie (like backoffice's `bo_session`), a `POST /auth/logout` that clears the cookie is then required — trivial to add at that point.
- **Sparse availability model — IMPLEMENTED (V12)** ✅: `total_inventory` moved to `room_types`; `availability` holds only nights with activity; booking materializes nights (`ON CONFLICT DO NOTHING` + row locks) and deletes rows on full release; admin uses the new `updateAvailabilityRange` mutation (old `updateAvailability` deprecated).
- **REST layer — IMPLEMENTED (Part B)** ✅: `web/` controllers for the 8 guest flows (auth, reservations+Idempotency-Key, payments, invoice, reviews); `RestExceptionAdvice` maps the DomainException taxonomy to HTTP with a `{code, message}` envelope; `SecurityConfig` permits anonymous auth/reservation/invoice paths and requires JWT elsewhere; `AuthRateLimitFilter` (20/min/IP, 429) on login+register; GraphiQL off under `prod`; 5 REST integration tests + full suite green (64 tests); live-verified against the running backend. Contract documented in `docs/api-guidelines.md` §10.

## Pending confirmation

1. **availability / rates / quote** — currently listed as stay-GraphQL (they are reads, per your direction). Availability is a read-only inventory check (see below). Confirm stay-GraphQL, or move to REST with the booking flow since they sit directly before "make reservation"?

### What `availability` does (for the decision)

Input: `hotelId`, `checkInDate`, `checkOutDate`, `rooms`, `adults`, `children` (from `AvailabilityInput`, validated in `AvailabilityService.check`).

For every **active room type** of the hotel it:
1. Loads the inventory rows (`availability` table) for every night of the stay (checkIn .. checkOut-1).
2. Checks the guest count fits the room type capacity (maxAdults/maxChildren).
3. Takes the minimum free units across all nights (`minFree`).
4. Classifies: **available** (minFree >= requested rooms), **few** (minFree <= 2), **soldout** (any night missing or minFree < requested rooms).

Returns per room type: `roomTypeId`, `available`, `status`, `capacityFits`.

It **reads only — modifies nothing**. It is the pre-reservation inventory check that the booking flow (createReservation → REST) relies on.

## Not yet covered (loose ends to decide before implementation)

| Topic | Open item |
|---|---|
| Rate limiting | ✅ DONE — `AuthRateLimitFilter`, 20 requests/min/IP on login+register (in-memory fixed window; distributed limiter remains a future decision) |
| REST error contract | ✅ DONE — DomainException taxonomy → HTTP via `RestExceptionAdvice`; envelope `{code, message}` (see `docs/api-guidelines.md` §10) |
| Idempotency-Key | ✅ DONE — header required on `POST /api/v1/reservations`, maps to `idempotency_key`; replay returns 200 + original reservation |
| CORS | Open — currently `*`; narrow to the guest frontend origin when known (decision pending) |
| GraphiQL | ✅ DONE — disabled under the `prod` profile |
| Postman collection | Open — add a REST folder; keep GraphQL folder during transition |
| Frontend plumbing | frontend-hotel will need a GraphQL client (reads) + REST client (writes); `src/services/*` mock seam is the swap point |
| Auth flow for guests | login/register return the JWT; same token is sent in both GraphQL and REST requests — no separate auth per transport |
| Testing | Authz parity tests: same operation via REST and GraphQL must enforce identical permission checks |
| Docs | `docs/api-guidelines.md` (draft REST conventions) and AGENTS.md rule 7 become true only after REST exists |