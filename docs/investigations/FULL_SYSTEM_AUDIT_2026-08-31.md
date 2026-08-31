# FULL SYSTEM AUDIT — Guest Booking Flow, Payment, Admin API & Admin Frontend

**Date:** 2026-08-31 · **Branch:** `feature/canonical-single-hotel` · **HEAD:** `601ca92`
**Method:** read-only. Four investigation threads (booking/payment flow, admin API +
authorization, admin frontend inventory, cross-frontend API contract), each independently
verified against source, with contradictions resolved against the running backend and
direct code reads — not against each other's claims. `docs/PROJECT_CONTEXT.md`,
`CURRENT_STATE.md`, `ARCHITECTURE.md`, `SERVICES.md`, `DATA_FLOW.md`, `KNOWN_ISSUES.md`
(dated 2026-08-27/28, last touched in this same HEAD commit) were used as a verified
starting map, not taken on faith — every claim reused from them below was re-confirmed
against source in this pass, and every contradiction found is called out explicitly.
No code was modified.

---

## A. Executive Summary

The backend (`backend-hotel`) is a genuinely well-built, mostly-complete layered Spring
Boot monolith. Server-side re-pricing, inventory locking, idempotency, and
authorization checks on every admin entry point are all real and correctly implemented
— this audit's biggest surprise is that the *backend* holds up better than the working
hypothesis assumed (see §L).

The **guest booking funnel is real and its money-handling is sound**: the server never
trusts a client-supplied total, currency is now hardcoded to MAD end-to-end (a
previously-documented bug, fixed since), and IDOR guards on reservation lookup/cancel/pay
are correct. Its main defect is architectural, not security: a reservation is created and
sells inventory *before* payment runs, and nothing ever compensates if payment fails or is
abandoned (§C step 6, §F).

**The back-office admin console is, as of this commit, non-functional for every write
operation.** Its BFF REST proxy never strips a redundant `v1/` path segment (the guest
frontend's identical proxy was fixed for exactly this bug; the back-office's was not), so
all ~20+ admin mutations resolve to `/api/v1/v1/...` on the backend and 404. This was
verified three independent ways in this audit (direct source trace, and two live curl
round-trips against the running backend distinguishing 404 vs. a real validation error)
and directly contradicts `docs/CURRENT_STATE.md`'s claim that "all 20 writes" are wired
and tested — the vitest suite mocks axios and never exercises the actual proxy route, so
nothing in the existing test/build gates catches it. **This is the single highest-impact
finding in this audit (§K, §Q — P0).**

Beyond that: RBAC is real (role-name checks, not a stub) but a dead fine-grained
`permissions`/`role_permissions` layer still exists in the schema; two admin write paths
(reservation cancel, review moderation) bypass the audit log; the guest "My bookings"
list silently renders a real backend failure as "you have no bookings"; and several
`docs/` files disagree with each other or with HEAD in small, previously-unnoticed ways
(§O item 4) — none of which affect money or security, all now corrected below.

---

## B. Repository Architecture

Three independently-deployed apps, one database, no workspace tooling:

```
backend-hotel/     Spring Boot 4.1.0, Java 21          — sole DB owner, port 8180
frontend-hotel/    Next.js 16, guest site               — port 3000
backoffice-hotel/  Next.js 16, staff console (BFF)      — port 3101, profile-gated off in Docker
database/          Oracle-dialect legacy, never executed
```

- **Layered monolith**, flat backend packages (`controller/service/service-impl/
  repository/entity/dto/mapper/security`); no hexagonal `api/application/domain/adapter`
  split — that layout is explicitly banned by an ArchUnit rule
  (`NO_LEGACY_HEXAGONAL_PACKAGES`).
- **API rule, enforced, not just documented:** GraphQL is 100% read-only (verified —
  `grep` across `src/main/resources/graphql/**/*.graphqls` finds zero `type Mutation`
  anywhere, and `ModuleArchitectureTest.java:66-72`'s `NO_GRAPHQL_MUTATIONS` rule bans
  adding one). All writes are REST under `/api/v1/**`.
- **6 ArchUnit rules exist**, not 5: `NO_LEGACY_HEXAGONAL_PACKAGES`,
  `IMPLEMENTATIONS_ARE_ONLY_ACCESSED_FROM_SERVICES`,
  `REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES`, `CONTROLLERS_DELEGATE_TO_SERVICES`,
  `SERVICES_ARE_NOT_GOD_CLASSES`, `NO_GRAPHQL_MUTATIONS` (confirmed by direct read of
  `ModuleArchitectureTest.java`). `docs/ARCHITECTURE.md`'s table still lists only 5 —
  a small doc/HEAD drift, noted for correction.
- Both frontends are genuine BFFs: the browser never sees the backend JWT. Guest site
  uses an httpOnly `guest_session` cookie (30d); back-office uses `bo_session` (7d).
  Both proxy GraphQL reads through `/api/graphql` (Apollo Client) and REST writes through
  `/api/rest/[...path]` (Axios) — the proxy-implementation defect described in §A/§K is
  specific to the back-office's `/api/rest` handler, not the pattern itself.
- **No gRPC, no email/SMS provider, no payment gateway, no Kafka consumer** anywhere in
  the repo — confirmed by grep (`@KafkaListener`: 0 hits; `JavaMailSender`/SMTP config:
  0 hits) during this pass, matching the existing docs.
- One PostgreSQL 16 database, 54 tables, Flyway V1–V30, `ddl-auto: validate`.

---

## C. Complete Guest Booking Flow

Traced end to end against source in this session (not reused verbatim from docs).
Classification per step: **REAL**, **MOCK**, **PARTIAL**, **NOT IMPLEMENTED**.

| # | Step | Frontend | API | Backend | REAL/MOCK |
|---|---|---|---|---|---|
| 1 | Search | `SearchResults.tsx` → `services/catalog.ts:searchStay()` | GraphQL `staySearch` | `StaySearchGraphQLController` → `AvailabilityService` + `PricingService.rates()` + `CatalogQueryService` | **REAL** |
| 2 | Hotel/room detail | `HotelDetail`, `RoomDetails.tsx` | GraphQL `canonicalHotel`/`hotel`, `staySearch` | `CatalogQueryService`, `AvailabilityService` | **REAL** (single-hotel model; no hotel picker) |
| 3 | Availability | (folded into `staySearch`) | GraphQL | `AvailabilityService.check()` — physical-room-derived, sparse rows, pessimistic lock at booking time | **REAL** |
| 4 | Quote/pricing | `services/quote.ts:getQuote()` | GraphQL `quote` | `PricingServiceImpl.quote()` (`PricingServiceImpl.java:137-189`) — nightly rate × nights, promo (percentage/fixed_amount; **`stay_x_pay_y` still throws VALIDATION**, `:304-307`), tax/fee from `tax_fee_types`, itemized `charges[]` | **REAL**; `stay_x_pay_y` **NOT IMPLEMENTED** |
| 5 | Guest info + booking form | `BookingFlow.tsx` steps 1-2 | — (client-side only) | — | REAL form, client validation only |
| 6 | Reservation create | `BookingFlow.tsx:325-346` → `reservations.create()` | REST `POST /api/v1/reservations` (Idempotency-Key header, `permitAll` at filter, service-enforced) | `BookingServiceImpl.create()` (`:111-281`) — **re-prices server-side via `pricing.quote()` (verified: `CreateReservationInput` carries no total/amount field at all)**, `InventoryService.lockAndSell()` (pessimistic row lock), status set to `confirmed` **immediately, independent of payment** | **REAL persistence**; see §F for the payment-ordering issue this creates |
| 7 | Payment | `BookingFlow.tsx:352-358` → `services/payment.ts:charge()` | REST `POST /api/v1/payments` then `POST /api/v1/payments/{id}/capture` (both `permitAll` at filter, guest-email-as-proof enforced in service) | `PaymentServiceImpl.createPayment()`/`capture()` (`PaymentServiceImpl.java:80-217`) — balance/currency validated server-side, **mock capture: `"MOCK-" + random8`, no PSP** (`:177-179`) | **REAL persistence, MOCK gateway** |
| 8 | Confirmation | `/confirmation?ref=...` → `ConfirmationFlow.tsx` | GraphQL `reservation` (by reference+email) | `BookingServiceImpl.getByReferenceAndEmail()` | **REAL**, with one display-only P2 defect (§K) |

**On payment failure or abandonment**, the reservation created in step 6 is **not**
rolled back or cancelled by any code path found (`BookingFlow.tsx:366-372` only sets a UI
message and lets the guest retry — verified the retry now safely reuses the same
reservation via a stable idempotency key, so it no longer double-books, but nothing ever
cancels an abandoned one). This is the same root defect `docs/FRONTEND.md` calls **F-1**;
its "retry double-books" half is fixed, its "orphaned confirmed reservation holds
inventory forever" half is not. See §F, §M.

---

## D. Booking Flow Diagram

```
Guest ──► /search ──GraphQL staySearch──► AvailabilityService + PricingService.rates()
  │                                        + CatalogQueryService
  ▼
/hotel?hotelid=<canonical> ──GraphQL canonicalHotel/staySearch──► same services
  │
  ▼
/room/[id] ──GraphQL quote──► PricingServiceImpl.quote()
  │   (itemized lines/extras/charges; client performs NO price arithmetic)
  ▼
/booking  (guest details, step 1)
  │
  ▼
submit ──REST POST /api/v1/reservations (Idempotency-Key)──►
  │        BookingServiceImpl.create()
  │          ├─ re-price via PricingService.quote()      [server-authoritative]
  │          ├─ InventoryService.lockAndSell()            [pessimistic lock, no overbook]
  │          └─ status = confirmed  ◄── ⚠ set here, BEFORE payment exists at all
  │
  ▼
──REST POST /api/v1/payments──► PaymentServiceImpl.createPayment()  [balance/currency validated]
  │
  ▼
──REST POST /api/v1/payments/{id}/capture──► PaymentServiceImpl.capture()
  │        ⚠ MOCK gateway: always succeeds unless a genuine validation/HTTP error occurs
  │        reservation.paymentStatus → captured when fully paid
  │
  ├─ success ──► /confirmation?ref=...   (GraphQL reservation read)
  └─ failure/abandon ──► ⚠ NO compensating cancel/release anywhere
                          reservation stays `confirmed`, inventory stays sold,
                          payment stays `pending` — indefinitely
```

---

## E. Complete Guest API Map

| Flow | Type | Operation | Method | Auth | Controller → Service |
|---|---|---|---|---|---|
| Search | GraphQL | `staySearch` | query | none (filter permitAll) | `StaySearchGraphQLController` → `AvailabilityService`, `PricingService`, `CatalogQueryService` |
| Hotel identity | GraphQL | `canonicalHotel`, `hotel`, `hotelDetails` | query | none | `CatalogGraphQLController` → `CatalogQueryService` |
| Rooms/rates | GraphQL | `roomType`, `roomTypes`, `offers`, `rates` | query | none | `CatalogGraphQLController`/`RateGraphQLController` |
| Pricing | GraphQL | `quote` | query | none | `RateGraphQLController` → `PricingServiceImpl` |
| Reference data | GraphQL | `countries`, `extras`, `faqs`, `experiences`, `restaurants` | query | none | `CatalogGraphQLController`/`ReferenceQueryService` |
| Auth | REST | `/api/v1/auth/{login,register}` | POST | public, rate-limited | `AuthRestController` → `AuthServiceImpl` |
| Profile | REST | `/api/v1/auth/me/profile` | POST | authenticated | `AuthRestController` |
| My bookings | GraphQL | `myReservations` | query | authenticated (scoped to `currentUser` internally — verified `BookingServiceImpl.myReservations():391-398`, no IDOR) | `ReservationGraphQLController` |
| Reservation self-service | REST | `/api/v1/reservations`, `/{ref}/cancel`, `/{ref}/invoice` | POST | public (filter); reference+email or ownership enforced in service | `ReservationRestController` → `BookingServiceImpl` |
| Reservation read | GraphQL | `reservation` | query | reference+email match | `ReservationGraphQLController` |
| Payment | REST | `/api/v1/payments`, `/{id}/capture` | POST | public (filter); owner/staff/guest-email enforced in service (`PaymentServiceImpl.ensurePaymentAccess:231-253`) | `PaymentRestController` → `PaymentServiceImpl` |
| Review | REST | `/api/v1/hotels/{hotelId}/reviews` | POST | authenticated | `ReviewRestController` → `ReviewServiceImpl` (proof-of-stay unreachable, see §M) |
| Reviews read | GraphQL | `reviews` | query | none | `ReviewGraphQLController` |

**Two dead GraphQL operations found this pass**, defined in `frontend-hotel/src/graphql/hotel.graphql:91-113` (`StayAvailability`, `StayRates`) with generated client code but zero call sites — superseded by the `staySearch` consolidation. P3, safe to delete.

---

## F. Payment Flow

- **Trigger:** `BookingFlow.tsx:352` (`services/payment.ts:charge()`), immediately after
  reservation creation succeeds, in the same synchronous submit handler.
- **Provider:** none. `PaymentServiceImpl.capture()` invents `"MOCK-" + UUID.substring(0,8)`
  as the provider reference when no `gatewayReference` is supplied (always the case from
  the guest UI) and marks the payment `captured` unconditionally — there is no decline
  simulation, no card validation beyond client-side format checks, no 3-D-Secure, nothing.
  A "declined" UI state (`BookingFlow.tsx:366`) can only be reached by a thrown error
  (network failure, currency/balance validation failure), never a simulated card decline.
- **Amount source of truth:** `createPayment` accepts a client-supplied `amount`
  (`CreatePaymentInput.amount`), but the server caps it at
  `reservation.totalAmount − paidAmount` and rejects a currency mismatch
  (`PaymentServiceImpl.java:112-119`) — **the client cannot inflate or shortcut the total**,
  it can only choose to pay less than the full balance (a legitimate partial-payment
  primitive, not a vulnerability, since the reservation's `totalAmount` itself came from
  the server-side quote at creation, §C step 6).
- **Idempotency:** genuine, both request-level (`idempotencyKey` on both
  `createPayment` and the reservation) and provider-level (`(provider, provider_reference)`
  partial unique index, `:180-187`) — a retried capture resolves to the same payment row.
- **Reservation/payment relationship — the actual gap:** a reservation is `confirmed` and
  holds inventory *before* any payment attempt exists. `reservation.status` and
  `reservation.paymentStatus` are independent fields; nothing ever demotes `status` back to
  `cancelled` if payment never completes. There is no reservation-hold TTL, no scheduled
  job to release stale unpaid reservations, and the frontend performs no compensating
  cancel on a thrown payment error. **Practical impact:** any caller who can reach the
  public `POST /api/v1/reservations` endpoint (no auth required) can sell inventory
  indefinitely without ever paying, simply by never calling `/payments`. This is a
  real, currently-open gap — not merely a UI polish issue — and it is reachable by
  anyone, not just through the shipped UI (the REST endpoint itself is `permitAll`).
- **Refunds / webhooks:** neither exists. No refund endpoint, no webhook receiver (there
  is no PSP to receive a webhook from).
- **Currency:** `PaymentServiceImpl` requires an exact string match between the payment's
  `currencyCode` and the reservation's; the backend performs no conversion anywhere. The
  guest frontend now hardcodes `TRANSACTION_CURRENCY = 'MAD'` for every money-affecting
  call (`graphqlClient.ts:28`, used by `quote.ts`, `endpoints.ts` for
  create-reservation/payment) — **confirmed fixed**, contradicting `docs/FRONTEND.md`'s
  still-open listing of this as F-2 (see §O item 4). The backend itself still accepts and
  echoes an arbitrary `currencyCode` with no validation against a canonical currency — a
  latent defect, not currently reachable through the shipped guest client, but reachable
  by any other direct API caller (P2, not P0 — no real money moves given the mock gateway).

---

## G. Booking & Pricing Consistency

- **Single source of truth confirmed:** `PricingServiceImpl.quote()` computes subtotal,
  discount, tax, fee, extras and total from DB-resident rates/promos/tax types
  (`PricingServiceImpl.java:137-189`); `BookingServiceImpl.create()` calls the *same*
  method again server-side and persists exactly its output (`:143-199`) — the client's
  earlier `quote` read and its eventual `createReservation` call can never diverge on
  price, because the second one is authoritative and the first is never trusted.
- Guest frontend performs **no room/extras/tax/fee arithmetic** anywhere in the core
  booking path (verified by broad regex sweep in this pass); the two P2 exceptions found
  are display-only edge cases, not booking-time price determination:
  - `ConfirmationFlow.tsx:455` recomputes an extra's line total as `x.price × x.qty` where
    `x.price` prefers the extra's **current live catalog price** over the price actually
    locked in at booking time (`x.unitPrice`) — `ConfirmationFlow.tsx:237-242`. If an admin
    later changes that extra's price, a past confirmation page can display a total that
    doesn't match what the guest was actually charged, even though the backend's own
    `totalPrice` field (the correct, charged value) is available and used correctly
    elsewhere on the same page (`:30`). **P2 — fix by using `x.unitPrice` everywhere.**
  - `originalTotal` on the confirmation page (`:41`) sums already-backend-computed
    components (no rate/tax recomputation) purely because the `Reservation` type has no
    such field itself — harmless.
- Back-office frontend was checked separately: **zero** money-arithmetic hits anywhere in
  `backoffice-hotel/src` — it only ever displays backend-supplied figures.
- **Inventory consistency is real**: `InventoryService.lockAndSell()` uses
  `SELECT … FOR UPDATE` over the requested night range before committing a reservation, so
  concurrent bookings of the last unit serialize into one winner and one `CONFLICT` — this
  was independently confirmed present, not just claimed, by direct source read.

---

## H. Admin API Inventory

*(Full endpoint-by-endpoint table, authorization check citations, and audit-log
verification performed by a dedicated sub-agent pass; summarized and spot-verified here.)*

**25 admin REST write endpoints** (`Admin{Catalog,Rate,Availability,Identity,
Reservation,Review}RestController`) and **14 admin GraphQL read queries**
(`AdminGraphQLController` + one, `adminReservations`, that lives in the non-`Admin`-prefixed
`ReservationGraphQLController` — functionally fine, a naming-convention miss only).

**Authorization: every single one of the 39 entry points carries an explicit
`hasRole("super_admin") || inHotel(hotelId)`-shaped check in the service layer**, traced
by hand into the implementation method for each. This is the opposite of what the "every
admin resolver must remember its own check" framing in `docs/ARCHITECTURE.md` would
predict as a likely failure mode — in the code as it stands today, none of them forgot it.

Two real, narrower gaps found (not IDORs):

1. **`adminHotels` (GraphQL) uses `currentUser.require()` instead of `requireStaff()`**
   (`AdminDashboardServiceImpl.java:62-67`) — any authenticated principal, including a
   plain guest account, can call it. Currently harmless (a non-staff caller's `hotelIds()`
   is empty, so the query returns nothing), but inconsistent with every sibling query and
   would silently become exploitable if that empty-list semantics ever changes.
   **P2 — add `requireStaff()` for defense in depth.**
2. **No audit-log entry for admin reservation cancel or review moderation.**
   `BookingServiceImpl.doCancel()` (used by `POST /api/v1/admin/reservations/{id}/cancel`)
   and `ReviewServiceImpl.moderate()` never call `AuditService.record(...)`, unlike every
   other admin write. These are two of the most consequential staff actions (cancelling a
   stranger's paid booking; approving/rejecting a public review) and they leave zero trace
   in `adminAuditLogs`. **P2 — traceability gap, not a security hole.**

**RBAC dead-layer confirmed independently**: `grep` for `@PreAuthorize|@Secured|@RolesAllowed`
across the entire backend returns zero hits; `Permission` entity has no repository and no
call sites anywhere; `permissions`/`role_permissions` tables are migrated but never
written or read by any Java code. Authorization is 100% role-name string comparison via
`CurrentUser.hasRole(String)`.

**Domain coverage gaps** (candidates, not confirmed missing needs): no single-payment or
single-invoice detail query (list-only); no refund/void action anywhere in
`BillingAdminService`; rooms are only queryable nested under a room-type workspace, not
independently paginated; notifications remain read-only with zero writer anywhere in the
codebase (0 rows in the live `notifications` table, confirmed by direct query in this
pass).

**SecurityConfig verified correct**: `/api/v1/admin/**` has no dedicated matcher and falls
through to the generic `.requestMatchers("/api/v1/**").authenticated()` — every admin
write requires a valid JWT at the filter level, with role/hotel-scope enforcement left
(correctly, as verified above) to the service layer. `anyRequest().denyAll()` closes
everything else. No accidental open surface found.

---

## I. Hotel Admin Frontend Inventory

15 routes: `(auth)/login` + 14 pages under `(backoffice)/*`
(`dashboard, hotels, hotels/new, hotels/[id]` with 5 workspace tabs —
overview/room-types/rooms/rate-plans/availability —
`reservations, guests, payments, invoices, promotions, reviews, notifications, users,
audit`). Every page reads real GraphQL data — **no hardcoded/fixture data, no mock
payloads, and no unused GraphQL operation was found anywhere in the 15-operation
`.graphql` set.**

Client-side role gating is thin: only the `hotels` list page (hides "New hotel") and the
sidebar (hides Users/Audit links) check `me.roles.includes('super_admin')`. The
**`users` and `audit` pages themselves have no client-side role check** — their
"(super admin only)" copy is cosmetic; protection for a direct URL visit relies entirely
on the (verified-correct, §H) backend resolver checks.

`HotelScopeContext` fetches **all** hotels via `AdminHotelsDocument` with no filter and
lets any staff user manually switch to any hotel in the dropdown; the only restriction is
that the *default* selection prefers the user's own `hotelIds[0]`. This is consistent with
`adminHotels` being intentionally platform-wide-listable (§H finding 1) while per-hotel
*write* resolvers do the real enforcement — but it means the frontend imposes no
cross-hotel boundary of its own, so a compromised or careless staff session that bypasses
the (correct) backend write-checks would have no frontend-side speed bump.

**Confirmed live**, not part of the original background: the deprecated `updateAvailability`
GraphQL mutation is genuinely gone from the admin frontend — it now exclusively calls the
REST range endpoint, closing a previously-tracked issue (`KNOWN_ISSUES.md` B4).

Minor findings: a dead `proxyRequest` import in `promotions/page.tsx:7`; two REST
endpoints defined in `endpoints.ts` with no current UI caller (`setHotelPolicies`,
`setRoomTypeMedia`); five `debug{2..6,-e2e}.mjs` scripts at the project root using the
documented seed admin credential (`admin123` — not a live secret), not wired into any
build script.

---

## J. Admin Frontend → API Mapping

| Admin Page | Component | API | Backend Op | DB |
|---|---|---|---|---|
| Dashboard | `dashboard/page.tsx` | GraphQL `AdminDashboard` | `AdminDashboardServiceImpl.dashboard` | aggregated reads across reservations/payments/availability |
| Hotels list | `hotels/page.tsx` | GraphQL `AdminHotels` | `CatalogQueryServiceImpl.hotelsPaged` | `hotels` |
| Hotel: new | `hotels/new/page.tsx` | REST `POST /v1/admin/hotels` **(broken, §K)** | `CatalogAdminServiceImpl.createHotel` | `hotels` |
| Hotel workspace: overview | `overview-tab.tsx` | GraphQL read + REST `updateHotel`/`setHotelAmenities`/`setHotelMedia`/media upload **(writes broken, §K)** | `CatalogAdminServiceImpl` | `hotels`, `hotel_amenities`, `media` |
| …: room types | `room-types-tab.tsx` | REST create/update/set-amenities **(broken)** | `CatalogAdminServiceImpl` | `room_types`, `room_type_amenities` |
| …: rooms | `rooms-tab.tsx` | REST create/update **(broken)** | `CatalogAdminServiceImpl` | `rooms` |
| …: rate plans | `rate-plans-tab.tsx` | REST create/update/link/unlink/set-prices **(broken)** | `RateAdminServiceImpl` | `rate_plans`, `room_type_rate_plans`, `rate_plan_prices` |
| …: availability | `availability-tab.tsx` | REST `updateAvailabilityRange` **(broken)** | `AvailabilityAdminServiceImpl` | `availability` |
| Reservations | `reservations/page.tsx` | GraphQL `AdminReservations` + REST cancel **(cancel broken; no audit log even when working, §H)** | `BookingServiceImpl.adminReservations`/`adminCancel` | `reservations`, `availability` |
| Guests | `guests/page.tsx` | GraphQL `AdminGuests` | `ReservationAdminServiceImpl.guests` | `guests` |
| Payments | `payments/page.tsx` | GraphQL `AdminPayments` (read-only) | `BillingAdminServiceImpl.payments` | `payments` |
| Invoices | `invoices/page.tsx` | GraphQL `AdminInvoices` (read-only) | `BillingAdminServiceImpl.invoices` | `invoices` (table empty — never exercised, §M) |
| Promotions | `promotions/page.tsx` | GraphQL read + REST create/update/status **(broken)** | `RateAdminServiceImpl` | `promotions` |
| Reviews | `reviews/page.tsx` | GraphQL read + REST moderation **(broken; no audit log even when working)** | `ReviewServiceImpl` | `reviews` |
| Notifications | `notifications/page.tsx` | GraphQL `AdminNotifications` (read-only, always empty) | `NotificationQueryServiceImpl` | `notifications` (0 rows, no writer anywhere) |
| Users | `users/page.tsx` | GraphQL read + REST create/assign/revoke **(broken)** | `IdentityAdminServiceImpl` | `users`, `user_roles` |
| Audit | `audit/page.tsx` | GraphQL `AdminAuditLogs` (read-only) | `AuditServiceImpl.auditLogs` | `audit_logs` |

"**(broken, §K)**" = confirmed via the double-`v1` proxy bug; every marked write 404s
against the real backend as currently proxied.

---

## K. API Contract Problems

**P0 — Back-office REST proxy never strips the redundant `v1/` path segment.**
`backoffice-hotel/src/api/rest/endpoints.ts` calls e.g. `restClient.post('/v1/admin/hotels', …)`
against `restClient` (`client.ts:19`, `baseURL: '/api/rest'`), which the browser resolves to
`/api/rest/v1/admin/hotels`. The catch-all proxy
(`backoffice-hotel/src/app/api/rest/[...path]/route.ts:23-27`) builds
`target = BACKEND_REST_URL + '/' + path.join('/')`, and `BACKEND_REST_URL` already ends in
`/api/v1` — no stripping logic exists. Net target: `.../api/v1/v1/admin/hotels`.

Contrast with `frontend-hotel/src/app/api/rest/[...path]/route.ts:29`, which explicitly
does `path.join('/').replace(/^v1\//, '')` with a code comment describing exactly this bug
class — that fix (part of the "anonymous booking fixed end to end" work referenced in
`CURRENT_STATE.md`) was never ported to the back-office's copy of the same proxy pattern.

**Verified live, twice, independently, against the real backend on :8180** with a
`super_admin` JWT: `POST /api/v1/v1/admin/hotels` → `404 {"message":"resource not found"}`;
`POST /api/v1/admin/hotels` (correct path) → reaches the controller (a real `400`
validation response). Every one of the ~27 REST operations `endpoints.ts` defines is
affected, i.e. the entire admin write surface (§J). `codegen.ts`'s schema glob is fixed
and correct (unrelated, previously-tracked issue, confirmed resolved); this is a distinct,
new defect.

**P1 — Guest "My bookings" list swallows fetch failures as an empty list.**
`frontend-hotel/src/components/account/AccountFlow.tsx:55-58`:
```ts
reservations.list().then(list => alive && setBookings(list))
  .catch(() => alive && setBookings([]));
```
A real backend outage, network error, or auth glitch is indistinguishable from "you have
no bookings" — no error state, no retry affordance. Contrast with the correct pattern
already used elsewhere in the same codebase (`RoomDetails.tsx:256-269`, `SearchResults.tsx:130-135`,
both of which surface a distinct error state).

**P2 — Extras total on the confirmation page can display a stale price** (§G, `ConfirmationFlow.tsx:455`).

**P2 — `canonicalHotel` is cached at Node **process** lifetime, not per-request.**
`frontend-hotel/src/services/canonicalHotel.ts:13-20`: `let cache` is module-scope state in
server-executed code; `force=true` (the only way to invalidate) is defined but never
called from any of its 7 call sites (`layout.tsx` ×2, `page.tsx` ×2, `SearchResults.tsx`,
`SearchBar.tsx`, `SearchSheet.tsx`, `catalog.ts`). Once any request populates the cache,
the canonical hotel's name/brand/description/media/policies are served from that stale
in-memory snapshot for the life of the server process — even after a staff member edits
the hotel via the (once the P0 above is fixed) back-office overview tab.

**P2 — Duplicate `AdminHotelWorkspace` query fetches** across `hotels/[id]/page.tsx` and
each of the 4 non-overview workspace tabs (each tab has a "gate" sub-component and a
"content" sub-component that independently re-run the identical query instead of sharing
one fetch) — mitigated but not eliminated by Apollo's default query deduplication;
architecturally fragile rather than a proven double network cost today.

**P3 — Two dead GraphQL operations** (`StayAvailability`, `StayRates`, §E) and secondary,
non-booking-path error-swallowing (`OffersGrid.tsx:40-43`, `BookingFlow.tsx:145-147`'s
extras-list fetch) that degrade a decorative feature silently rather than masking a
financial or availability failure.

No field-name, type, or request/response shape mismatches were found anywhere in either
frontend against the current backend schema/DTOs — every `.graphql` selection set and
every REST body was checked field-by-field against the live `.graphqls` files and Java
DTO records and all matched exactly. The contract-shape hygiene is good; the defects
found are all in call-routing, error-handling, or caching, not in the contracts
themselves.

---

## L. Security Findings

| # | Finding | Severity | Where |
|---|---|---|---|
| 1 | Back-office admin write surface is completely broken (proxy bug) — **not** itself a security hole (it fails closed, as a 404), but it means the admin console currently cannot exercise any of its authorization checks in practice, which blocked this audit from confirming end-to-end behavior through the UI for every write path. | P0 (availability, not confidentiality/integrity) | §K |
| 2 | `adminHotels` GraphQL query uses a weaker check (`require()`) than every sibling admin query (`requireStaff()`) | P2 | §H |
| 3 | Admin reservation-cancel and review-moderation writes bypass the audit log | P2 | §H |
| 4 | Reservation created (and inventory sold) before payment exists, with no expiry/compensation, reachable via a public unauthenticated REST endpoint | P1 (inventory/availability integrity) | §F |
| 5 | Backend accepts and echoes an arbitrary `currencyCode` on `quote`/`createReservation`/payments with no validation against a canonical currency — not reachable via the shipped guest client (which hardcodes MAD) but reachable by any other direct API caller; no real financial exploit since the payment gateway is mock (no real money moves) | P2 | §F |
| 6 | Guest "My bookings" masks backend outages as "no bookings" (information/availability, not access control) | P1 | §K |
| 7 | RBAC is entirely role-name string comparison; the `Permission`/`role_permissions` schema exists but is fully dead — works today, but any future feature built against the unused fine-grained tables would silently do nothing | P3 | §H |
| 8 | No client-controlled pricing anywhere in the booking path — **explicitly verified, not assumed**: `CreateReservationInput` carries no amount field; `PaymentServiceImpl` caps client-supplied `amount` at the server-computed remaining balance | — (verified negative finding, not a defect) | §C, §F |
| 9 | No reservation-data or payment IDOR found anywhere traced (guest reference+email lookup, owner/staff-or-guest-email payment access, `myReservations` scoped to `currentUser`) — all explicitly checked against source, all correct | — (verified negative finding) | §E, §F |
| 10 | CORS default `allowed-origins=*` combined with header-based bearer auth and no browser-held token (BFF pattern in both frontends) — low risk as configured, but relies on `CORS_ALLOWED_ORIGINS` being tightened in real deployment since the backend itself is technically reachable directly, bypassing both BFFs, by anyone with a valid JWT | P3 | `SecurityConfig.java:110-126` |

No rate limiting exists beyond auth endpoints (`AuthRateLimitFilter`); no rate limiting on
`/api/v1/reservations` or `/api/v1/payments`, both `permitAll` — a scripted client could
create unlimited unpaid reservations (compounding finding #4). No idempotency gap was
found on any financial operation — idempotency is consistently and correctly applied.

---

## M. Missing Functionality

Carried forward from the existing docs, independently re-confirmed where practical in
this pass:

- **Check-in/check-out mutations** — do not exist; blocks the reservation lifecycle
  (`ReservationStatus` only ever reaches `confirmed`/`cancelled`, confirmed by grep:
  `setStatus(ReservationStatus...)` appears in exactly the two expected places) and
  reviews (proof-of-stay requires `checked_out`, unreachable).
- **Notifications** — read-only API and a full admin UI page exist; zero writer anywhere
  in the codebase; 0 rows in the live table (confirmed by direct query this pass).
- **Invoicing** — `issueInvoice` + admin listing exist; `invoices`/`invoice_items` are
  empty in the live DB; never exercised by any flow.
- **`stay_x_pay_y` promotions** — declared in the schema/enum, throws `VALIDATION` when
  selected; never implemented.
- **Refunds** — no endpoint anywhere in `BillingAdminService` or its implementation.
- **Payment-decline compensation** — no cancel-on-failure, no hold-expiry job (§F).
- **Email/SMS** — no provider anywhere; password reset, newsletter, contact are honest
  "unavailable" states, not mocked.
- **Kafka consumers** — zero `@KafkaListener`s; outbox→Kafka pipeline is real but
  terminates at the broker; the backend still hard-depends on Kafka being healthy to boot.

---

## N. Duplicate / Unnecessary APIs and Requests

- Back-office `AdminHotelWorkspace` query fetched redundantly (page + tab-gate +
  tab-content) on 4 of 5 hotel-workspace tabs (§K).
- Two dead GraphQL operations in the guest frontend (`StayAvailability`, `StayRates`, §E).
- Two admin REST endpoints defined with no current UI caller (`setHotelPolicies`,
  `setRoomTypeMedia`).
- `adminReservations` query exists but lives outside the `Admin*` controller-naming
  convention (§H) — not wasteful, just inconsistent and easy to miss in a naming-based
  sweep.

No genuinely duplicate *backend* endpoints (two routes doing the same thing) were found.

---

## O. Architecture Problems

1. **Payment-after-confirmation ordering** (§F) is the one place the "REST = ACTION"
   design choice creates a real gap: two independent REST calls (`createReservation`,
   `createPayment`) with no saga/compensation between them, and a state machine
   (`ReservationStatus`) that has no `pending`/`awaiting-payment` state to model the gap.
2. **Kafka is a hard startup dependency with zero consumers** — pure operational cost,
   confirmed still true.
3. **Dead RBAC granularity layer** (`Permission`/`role_permissions`) — schema implies
   capability the code doesn't have.
4. **Documentation/HEAD drift found this pass** (all now corrected in this report, listed
   for whoever next edits `docs/`):
   - `docs/DATA_FLOW.md` §10 still describes `/hotel` (no `hotelid`) as serving a static
     legacy fixture; `frontend-hotel/src/app/hotel/page.tsx:28-46` actually redirects to
     the canonical hotel — `docs/PROJECT_CONTEXT.md` has the correct, current behavior.
     Both files were touched in the same HEAD commit (`601ca92`), so this is a partial
     update, not a wholesale one.
   - `docs/ARCHITECTURE.md`'s ArchUnit rule table lists 5 rules; the source
     (`ModuleArchitectureTest.java`) has 6 — `NO_GRAPHQL_MUTATIONS` is missing from the
     table (though mentioned in prose elsewhere in the same file).
   - `docs/FRONTEND.md`'s findings table still lists **F-2 (currency mis-denomination)**
     as open; it is fixed at HEAD (`graphqlClient.ts:28`, `TRANSACTION_CURRENCY = 'MAD'`,
     used consistently by every money-affecting call). **F-1 (orphaned reservation on
     decline)** is correctly still listed as open, but its "retry double-books" sub-claim
     is now fixed (idempotency key is stable per mount, verified) — only the
     orphaned-inventory half remains true.
   - `docs/KNOWN_ISSUES.md`'s claim that "orphaned bookings on decline" was "fixed and
     live-verified" refers to an earlier, differently-lettered finding set (F-A…F-G) that
     predates the current F-1…F-28 numbering in `FRONTEND.md`; it does not mean today's
     F-1 is resolved. The file says as much in its own text ("F1–F6 below were superseded
     by that pass") but it's easy to misread as a direct contradiction — flagging so it
     isn't mistaken for one.

---

## P. Recommended Target Architecture

No redesign is warranted — the layered structure, GraphQL-read/REST-write split, and BFF
pattern are all sound and should be kept. Targeted fixes, in order of what actually
changes system behavior:

1. Port the guest frontend's `v1/`-stripping fix to the back-office's `/api/rest` proxy
   (one-line change, `route.ts`), or better, extract the shared proxy logic into one
   piece of code both frontends import, so this class of drift can't recur a third time.
2. Introduce a real `pending`/`awaiting_payment` reservation state (the enum already
   declares `pending`, it's just never assigned) so a reservation genuinely doesn't hold
   inventory as `confirmed` until payment captures — or, if "confirmed-before-paid" is an
   intentional pay-later product decision, add an explicit hold-expiry job that cancels
   and releases inventory for reservations left unpaid past a TTL.
3. Add `AuditService.record(...)` calls to `BookingServiceImpl.doCancel` (admin path) and
   `ReviewServiceImpl.moderate`.
4. Either wire a real `Permission`/`role_permissions` check into `CurrentUser`, or drop the
   dead tables/entity — current state (schema implies granularity the code doesn't use) is
   worse than either alternative.
5. Fix the two P2 UI defects (extras stale-price display, `canonicalHotel` process-cache
   staleness) and the P1 error-swallowing in `AccountFlow.tsx`.

## Q. Prioritized Action Plan

**P0**
- Fix the back-office `/api/rest/[...path]/route.ts` missing `v1/` strip — every admin
  write is currently non-functional. (§K)

**P1**
- Add a compensating cancel/release path (or an expiry job) for reservations that never
  reach a captured payment. (§F, §L-4)
- Fix `AccountFlow.tsx`'s swallowed "My bookings" fetch error. (§K)

**P2**
- `adminHotels` — tighten to `requireStaff()`. (§H)
- Add audit logging to admin reservation-cancel and review-moderation. (§H)
- Fix `ConfirmationFlow.tsx`'s extras line total to use the charged `unitPrice`, not the
  live catalog price. (§G, §K)
- Fix or remove `canonicalHotel.ts`'s permanent process-lifetime cache. (§K)
- Validate/reject non-canonical `currencyCode` server-side instead of echoing it. (§F, §L-5)
- Collapse the duplicate `AdminHotelWorkspace` query fetches per hotel-workspace tab. (§K)

**P3**
- Delete the two dead GraphQL operations (`StayAvailability`, `StayRates`) and the two
  unused REST endpoint definitions (`setHotelPolicies`, `setRoomTypeMedia`), or wire up
  their UI if they're actually wanted.
- Normalize `adminReservations` into the `Admin*` controller family for consistency.
- Remove the committed `debug{2..6,-e2e}.mjs` scripts from the back-office project root.
- Correct the small doc/HEAD drifts listed in §O item 4.

---

### Note on method

This report treats `docs/PROJECT_CONTEXT.md`, `CURRENT_STATE.md`, `ARCHITECTURE.md`,
`SERVICES.md`, `DATA_FLOW.md`, `KNOWN_ISSUES.md` as a high-quality, mostly-accurate
starting map (as CLAUDE.md instructs), not as ground truth — every claim carried forward
from them into this report was re-verified against source or the running system in this
pass, and every place they disagreed with HEAD or with each other is called out in §O
rather than silently resolved. The one finding that most needed independent verification
— the back-office proxy bug — was confirmed three separate ways (direct source diff
against the already-fixed guest-frontend proxy, and two independent live curl round-trips
against the real backend) before being reported as a P0.
