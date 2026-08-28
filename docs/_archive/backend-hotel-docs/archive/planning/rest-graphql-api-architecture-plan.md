# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# REST + GraphQL API Architecture Plan

## Status

**DRAFT — NOT APPROVED**

This document is a classification and planning proposal only. Nothing in it is an accepted architectural decision. No API changes may be made until the owner reviews and explicitly approves the classification and migration plan.

- Date: 2026-08-19
- Author: architecture discovery session
- Applies to: `backend-hotel` (hotel-platform API), `backoffice-hotel` (GraphQL consumer), `frontend-hotel` (future REST consumer, currently mock-only)

## Objective

Replace the current GraphQL-only API architecture with a **deliberate hybrid architecture** where each capability is exposed through the API style that fits its consumer and semantics best:

- REST for public, resource-oriented, cacheable, and machine-to-machine surfaces.
- GraphQL for the internal admin console (complex, relational, UI-driven screens).
- Shared application/domain services underneath both, so business logic is **never duplicated** per delivery layer.
- Explicit internal-only surfaces that are never exposed as APIs.

Current facts that motivate this work:

- The backend exposes **62 GraphQL operations** (30 queries, 32 mutations) through a single `POST /graphql` endpoint — the only API surface.
- The guest frontend (`frontend-hotel`) is **not yet wired** to the backend (mock services). This is the moment to choose its API style before integration.
- The admin console (`backoffice-hotel`) already consumes GraphQL via codegen + React Query.
- There is no REST layer, no OpenAPI, no webhooks, no rate limiting, no HTTP caching today.

## Current API Architecture

### Entry points (FACT)

| Entry point | Method | Purpose | Notes |
|---|---|---|---|
| `/graphql` | POST | All 62 operations | Only business API surface |
| `/graphiql` | GET | Dev playground | Must be disabled in prod |
| `/actuator/health` | GET | Liveness/readiness | Already REST — keep |
| `backoffice /api/auth/login, /logout, /me` | POST/GET | Cookie plumbing | Frontend infra, proxies GraphQL |
| `backoffice /api/graphql` | POST | Auth proxy to backend GraphQL | Internal plumbing |
| `frontend /api/{auth,chat,extras,newsletter,offers,reservations,rooms,search}` | — | Empty placeholder dirs | No implementation |

### How GraphQL is implemented (FACT)

- 4 `@Controller` classes: `QueryResolver` (30 query mappings + field resolvers), `MutationResolver` (8 mutations), `AdminQueryResolver` (14 admin queries), `AdminMutationResolver` (24 admin mutations).
- Resolvers are thin: they delegate to services (`CatalogQueryService`, `AvailabilityService`, `PricingService`, `BookingService`, `ReviewService`, `AuthService`, `PaymentService`, `InvoiceService`, `AdminService`).
- N+1 elimination via `@BatchMapping` DataLoaders: hotel media, hotel from-price, hotel amenities, room-type media, room-type price.
- Error handling: `GraphqlExceptionAdvice` maps `DomainException` codes (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `VALIDATION`) to GraphQL `ErrorType` + `extensions.code`; `UNAUTHORIZED` for auth failures; `INTERNAL_ERROR` otherwise.
- Auth: stateless JWT (`JwtAuthFilter`), per-resolver checks via `CurrentUserAccessor` + `ensureStaffAccess` / `ensureSuperAdmin`; hotel-scope IDOR → `FORBIDDEN`.
- Validation: `validation/Validation` guards + `dto/` records; server-side pricing is authoritative.
- Pagination: `PageInput` (page, size; size clamped 1..100 in services).
- Sorting: `hotels` supports `RATING_DESC / PRICE_ASC / NAME_ASC` (bounded in-memory, 500 candidates).
- Filtering: `adminGuests` text query; `adminReservations` status filter; no facet/full-text search.
- Rate limiting: **none**. Caching: **none**. Webhooks: **none**. Scheduled: `OutboxRelay` (1s poll). Observability: actuator health only.
- External integrations: none implemented (payment = mock; email/media providers are planned ports).

### Operation inventory summary

- 62 operations: 30 queries + 32 mutations.
- Guest-facing: 24 (discovery 10, stay/pricing 3, account 3, auth 2, booking 2, billing 3, reviews 1).
- Admin-facing: 38 (queries 14, mutations 24).
- Machine-to-machine: 0 today.

## API Inventory

Legend: **Q** = Query, **M** = Mutation. Current API = GraphQL for all rows (single `/graphql`). Proposed API values: REST / GraphQL / REST+GraphQL / Internal only / Investigate.

### Identity & Users (domain: User & Permission)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | `login` | M | REST | Staff + guests | anon | Standard auth; rate limiting needed; no GraphQL benefit | P1 | High |
| 2 | `register` | M | REST | Guests | anon | Standard auth | P1 | High |
| 3 | `me` | Q | REST | Staff + guests | JWT | Simple resource retrieval of own identity | P1 | High |
| 4 | `myReservations` | Q | REST | Guests | JWT | Own-resource listing, simple paging | P1 | High |
| 5 | `adminUsers` | Q | GraphQL | Backoffice | super_admin | Admin console surface stays GraphQL (see Architecture Principles) | P2 | High |
| 6 | `adminRoles` | Q | GraphQL | Backoffice | super_admin | Same | P2 | High |
| 7 | `createUser` | M | GraphQL | Backoffice | super_admin | Admin CRUD; keep console consistent | P2 | High |
| 8 | `assignRole` | M | GraphQL | Backoffice | super_admin | Admin action; role-scope validation in AdminService | P2 | High |
| 9 | `revokeRole` | M | GraphQL | Backoffice | super_admin | Same | P2 | High |

### Catalog & Discovery (domains: Hotel, Room)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 10 | `hotels` (search) | Q | REST | Guest site | anon | Resource listing + simple filter/sort/page; **CDN/browser cacheable** | P1 | High |
| 11 | `hotel` | Q | REST | Guest site | anon | Resource retrieval; cacheable; GET semantics | P1 | High |
| 12 | `hotelDetails` | Q | REST | Guest site | anon | Composite page read (hotel + experiences + restaurants + faqs + reviews); single composite GET is cacheable | P1 | Medium (shape: Investigate) |
| 13 | `roomTypes` | Q | REST | Guest site | anon | Hotel subresource; cacheable | P1 | High |
| 14 | `experiences` | Q | REST | Guest site | anon | Subresource; cacheable | P1 | High |
| 15 | `restaurants` | Q | REST | Guest site | anon | Subresource; cacheable | P1 | High |
| 16 | `extras` | Q | REST | Guest site | anon | Subresource; cacheable | P1 | High |
| 17 | `faqs` | Q | REST | Guest site | anon | Subresource; cacheable | P1 | High |
| 18 | `offers` | Q | REST | Guest site | anon | Promo listing; cacheable (short TTL) | P1 | High |
| 19 | `reviews` (guest) | Q | REST | Guest site | anon | Paged resource listing; cacheable with short TTL | P1 | High |
| 20 | `adminAmenities` | Q | GraphQL | Backoffice | staff | Admin catalog picker | P2 | High |
| 21 | `adminHotels` | Q | GraphQL | Backoffice | staff | Admin list w/ paging + counts | P2 | High |
| 22 | `adminHotel` (workspace) | Q | GraphQL | Backoffice | staff | **Complex relational workspace** (10 sub-resources in one query); GraphQL strength | P1 | High |
| 23 | `createHotel` | M | GraphQL | Backoffice | staff | Admin CRUD (console stays GraphQL) | P2 | High |
| 24 | `updateHotel` | M | GraphQL | Backoffice | staff | Same | P2 | High |
| 25 | `setHotelAmenities` | M | GraphQL | Backoffice | staff | Admin action | P2 | High |
| 26 | `setHotelMedia` | M | GraphQL | Backoffice | staff | Admin action | P2 | High |
| 27 | `createRoomType` | M | GraphQL | Backoffice | staff | Admin CRUD | P2 | High |
| 28 | `updateRoomType` | M | GraphQL | Backoffice | staff | Same | P2 | High |
| 29 | `setRoomTypeAmenities` | M | GraphQL | Backoffice | staff | Admin action | P2 | High |
| 30 | `setRoomTypeMedia` | M | GraphQL | Backoffice | staff | Admin action | P2 | High |
| 31 | `createRoom` | M | GraphQL | Backoffice | staff | Admin CRUD | P2 | High |
| 32 | `updateRoom` | M | GraphQL | Backoffice | staff | Same | P2 | High |

### Rates & Availability (domains: Rate, Availability)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 33 | `availability` | Q | REST | Guest site | anon | Parameterized read (hotel, dates, guests); URL semantics; no caching win (volatile) but fits REST consumer | P1 | Medium |
| 34 | `rates` | Q | REST | Guest site | anon | Same reasoning as availability | P1 | Medium |
| 35 | `quote` | Q | REST | Guest site | anon | **Calculation/command**, not a resource; `POST /quotes`; server-side pricing is the engine | P1 | Medium |
| 36 | `createRatePlan` | M | GraphQL | Backoffice | staff | Admin CRUD | P2 | High |
| 37 | `updateRatePlan` | M | GraphQL | Backoffice | staff | Same | P2 | High |
| 38 | `linkRoomTypeRatePlan` | M | GraphQL | Backoffice | staff | Admin action (junction) | P2 | High |
| 39 | `unlinkRoomTypeRatePlan` | M | GraphQL | Backoffice | staff | Same | P2 | High |
| 40 | `setRatePlanPrices` | M | GraphQL | Backoffice | staff | Admin bulk action (price ranges) | P2 | High |
| 41 | `updateAvailability` | M | GraphQL | Backoffice | staff | Admin bulk inventory action | P2 | High |
| 42 | `createPromotion` | M | GraphQL | Backoffice | staff | Admin CRUD | P2 | High |
| 43 | `updatePromotion` | M | GraphQL | Backoffice | staff | Same | P2 | High |
| 44 | `setPromotionStatus` | M | GraphQL | Backoffice | staff | Admin state transition | P2 | High |
| 45 | `adminPromotions` | Q | GraphQL | Backoffice | staff | Admin list | P2 | High |

### Reservations (domain: Reservation)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 46 | `createReservation` | M | REST | Guest site | anon/JWT | **Resource creation**; `POST /reservations` with `Idempotency-Key` header (already idempotent via `idempotency_key`); hotel platform API semantics | P1 | High |
| 47 | `reservation` (lookup) | Q | REST | Guest site | anon (ref+email) | Resource retrieval with access proof (ref+email) | P1 | High |
| 48 | `cancelReservation` | M | REST | Guest site | anon/JWT | **Action/command**: `POST /reservations/{reference}/cancel` (matches draft api-guidelines.md) | P1 | High |
| 49 | `adminReservations` | Q | GraphQL | Backoffice | staff | Admin list + filters + detail in one query | P2 | High |
| 50 | `adminCancelReservation` | M | GraphQL | Backoffice | staff | Admin action; shares `BookingService.doCancel` with REST cancel — no logic duplication | P2 | High |

### Finance (domain: Finance)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 51 | `createPayment` | M | REST | Guest site | owner/staff | Resource creation (payment); gateway integrations are REST-native | P1 | High |
| 52 | `capturePayment` | M | REST | Guest site | owner/staff | **Action**: `POST /payments/{id}/capture` | P1 | High |
| 53 | `issueInvoice` | M | REST | Guest site | owner/staff | Action; idempotent by reservation; `POST /reservations/{reference}/invoice` | P2 | Medium |
| 54 | `adminPayments` | Q | GraphQL | Backoffice | staff | Admin list | P2 | High |
| 55 | `adminInvoices` | Q | GraphQL | Backoffice | staff | Admin list | P2 | High |

### Reviews (domain: Reservation/Content)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 56 | `createReview` | M | REST | Guest site | JWT + checked-out stay | Resource creation under hotel; ownership proof in service | P1 | High |
| 57 | `adminReviews` | Q | GraphQL | Backoffice | staff | Admin list + moderation filters | P2 | High |
| 58 | `moderateReview` | M | GraphQL | Backoffice | staff | Admin moderation action | P2 | High |

### Reporting, Notifications, Audit (domain: Reporting)

| # | Operation | Type | Proposed API | Consumer | Auth | Reason | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|
| 59 | `adminDashboard` | Q | GraphQL | Backoffice | staff | **Aggregation of many stats in one query**; widget-driven UI; GraphQL strength | P1 | High |
| 60 | `adminNotifications` | Q | GraphQL | Backoffice | staff | Admin list | P2 | High |
| 61 | `adminAuditLogs` | Q | GraphQL | Backoffice | super_admin | Admin list | P2 | High |

### Non-API surfaces

| # | Item | Proposed API | Reason |
|---|---|---|---|
| 62 | `OutboxRelay` → Kafka publishing | Internal only | Infrastructure, not a business API |
| 63 | `event_consumption` dedupe | Internal only | Consumer idempotency bookkeeping |
| 64 | GraphiQL | Internal (dev) | Disable in production |
| 65 | `backoffice /api/graphql` proxy | Internal only | Plumbing; lives while backoffice is GraphQL |
| 66 | `backoffice /api/auth/*` | Internal only | Cookie plumbing |
| 67 | Frontend `/api/*` placeholders | Investigate | Empty dirs; decide shape with the guest-frontend integration |
| 68 | `/actuator/health` (+ future metrics) | REST (keep) | Standard ops surface |

## Proposed REST APIs

Public B2C surface (guest frontend, future mobile/B2B reuse):

```
POST   /auth/login                      # 1  login
POST   /auth/register                   # 2  register
GET    /auth/me                         # 3  me
GET    /auth/me/reservations            # 4  myReservations

GET    /hotels?q=&sort=&page=&size=     # 10 hotels (search/listing)
GET    /hotels/{hotelId}                # 11 hotel
GET    /hotels/{hotelId}/details        # 12 hotelDetails (composite; shape Investigate)
GET    /hotels/{hotelId}/room-types     # 13 roomTypes
GET    /hotels/{hotelId}/experiences    # 14 experiences
GET    /hotels/{hotelId}/restaurants    # 15 restaurants
GET    /hotels/{hotelId}/extras         # 16 extras
GET    /hotels/{hotelId}/faqs           # 17 faqs
GET    /offers?hotelId=                 # 18 offers
GET    /hotels/{hotelId}/reviews?page=  # 19 reviews

GET    /hotels/{hotelId}/availability?checkIn=&checkOut=&adults=&children=&rooms=   # 33
GET    /hotels/{hotelId}/rates?roomTypeId=&checkIn=&checkOut=&adults=&children=     # 34
POST   /hotels/{hotelId}/quotes         # 35 quote (calculation, body = QuoteInput)

POST   /reservations                    # 46 createReservation  (Idempotency-Key header)
GET    /reservations/{reference}?email= # 47 reservation lookup
POST   /reservations/{reference}/cancel # 48 cancelReservation

POST   /payments                        # 51 createPayment
POST   /payments/{paymentId}/capture    # 52 capturePayment
POST   /reservations/{reference}/invoice# 53 issueInvoice

POST   /hotels/{hotelId}/reviews        # 56 createReview
```

Notes:
- Naming follows the existing draft `docs/api-guidelines.md` (`/api/v1` base, kebab-case, verbs only for genuine actions) — that draft becomes the REST contract foundation.
- Caching: catalog reads (`10–19`) get `Cache-Control` + `ETag`; CDN-friendly. Availability/rates/quotes are uncacheable or short-TTL (volatile data).
- Idempotency: `POST /reservations` maps the existing `idempotency_key` to the standard `Idempotency-Key` header (and keeps the column as the source of truth).
- The existing `/actuator/health` stays; add `/actuator/metrics` exposure later (ops).

## Proposed GraphQL APIs

Admin console surface (backoffice-hotel stays the single GraphQL consumer):

```
Query:    adminAmenities, adminHotels, adminHotel (workspace), adminReservations,
          adminGuests, adminPayments, adminInvoices, adminPromotions, adminReviews,
          adminUsers, adminRoles, adminNotifications, adminAuditLogs, adminDashboard
Mutation: createHotel, updateHotel, setHotelAmenities, setHotelMedia,
          createRoomType, updateRoomType, setRoomTypeAmenities, setRoomTypeMedia,
          createRoom, updateRoom, createRatePlan, updateRatePlan,
          linkRoomTypeRatePlan, unlinkRoomTypeRatePlan, setRatePlanPrices,
          updateAvailability, createPromotion, updatePromotion, setPromotionStatus,
          moderateReview, adminCancelReservation, createUser, assignRole, revokeRole
```

Rationale:
- `adminHotel` workspace and `adminDashboard` are exactly the "complex admin dashboards, highly relational data, UI-driven field selection" cases where GraphQL wins (one round trip, no over/under-fetching).
- The backoffice already has GraphQL codegen types + React Query wired — keeping GraphQL avoids a full frontend rewrite and preserves the investment.
- Admin traffic is low-volume, private, non-cacheable — GraphQL's known weaknesses (no HTTP caching, POST-only) don't matter here.
- 38 admin operations stay; 24 guest operations move to REST. Net: GraphQL shrinks from 62 → 38 operations.

## Proposed REST + GraphQL APIs

**None today.**

Conditions that would justify "both" in the future (not current requirements):
- A future B2B/partner portal that needs e.g. promotion or contract CRUD over REST while the backoffice keeps GraphQL — then both layers call the **same services**; no logic duplication.
- A future mobile app using REST for the same capabilities as the admin console.
- Rule for when this happens: both delivery layers must delegate to the same `service/` classes; the GraphQL schema and REST controllers remain thin adapters.

## Internal APIs

- Outbox relay / Kafka publishing (`event/OutboxRelay`): internal infrastructure — never exposed.
- `event_consumption` dedupe bookkeeping: internal.
- `backoffice /api/graphql` proxy + `/api/auth/*`: internal plumbing, unchanged while the backoffice consumes GraphQL.
- Audit-log writes: internal (audit reads stay admin GraphQL).
- Seed tooling (`scripts/seed-demo.mjs`): internal ops tool.
- GraphiQL: dev-only.

## Search APIs

| Search | Proposed | Reasoning |
|---|---|---|
| Hotel listing (q + sort + page) | REST `GET /hotels` | Simple resource filtering + sorting; cacheable; standard HTTP paging |
| Room availability (dates/guests per hotel) | REST `GET /hotels/{id}/availability` | Parameterized resource read; volatile (no cache win) but URL semantics fit the guest consumer |
| Rates per room type/plan | REST `GET /hotels/{id}/rates` | Same |
| Faceted/full-text/geo/cross-hotel search | **FUTURE** | Not implemented today; schema is per-hotel. If added, evaluate a dedicated search service (PostgreSQL FTS first, engine later) — do not bolt onto either API style prematurely |

## External Integration APIs

- **Payment provider (Stripe/other)** — REST (`POST /webhooks/payments` + signature verification), per ADR-002/007 direction. The `PaymentProvider` port is the seam; webhook handling stays in the provider adapter.
- **Email provider (Resend)** — REST webhook (`POST /webhooks/email`) for delivery status, per ADR-004; idempotent dedupe via `event_consumption`-style keys.
- **Media (Cloudinary)** — provider SDK behind `MediaStorageProvider`; no public API surface.
- **PMS / channel sync** — deferred (foundation plan); when it arrives, REST.
- **B2B / partner APIs** — future; REST (`/api/v1/...` per api-guidelines.md draft). **Never expose the internal GraphQL schema to partners.**

## Webhook APIs

None exist today. Planned (future phases, per ADRs):

```
POST /webhooks/payments   # payment status (provider → platform)   — REST, HMAC/signature
POST /webhooks/email      # delivery status (Resend → platform)    — REST, signature
```

Design rules: signature verification, idempotent dedupe, DLQ on repeated failure, never trusted for money movement without reconciliation.

## Hotel Domain

| Capability | Proposed | Notes |
|---|---|---|
| Hotel listing/details/content | REST | Cacheable public catalog |
| Hotel workspace (admin) | GraphQL | Complex relational screen |
| Hotel CRUD, amenities, media (admin) | GraphQL | Console consistency |
| Hotel status transitions | GraphQL | Admin action |

## Room Domain

| Capability | Proposed | Notes |
|---|---|---|
| Room types + public content | REST | Subresource of hotel |
| Room CRUD + status/housekeeping (admin) | GraphQL | Console |
| Physical room assignment | GraphQL (admin) | Not exposed to guests |

## Rate Domain

| Capability | Proposed | Notes |
|---|---|---|
| Rates by room type/plan (public) | REST | Guest flow |
| Quote engine | REST `POST /quotes` | Server-side pricing stays the single engine (`PricingService`) |
| Rate plan CRUD, links, price ranges, restrictions (admin) | GraphQL | Console; sparse `rate_restrictions` engine is future work either way |

## Availability Domain

| Capability | Proposed | Notes |
|---|---|---|
| Availability check (public) | REST | Volatile; no cache |
| Inventory editor (admin) | GraphQL | `updateAvailability` stays |
| Allotments / stop-sell / restrictions | FUTURE | Schema supports (`rate_restrictions`); engine not built — revisit API style then |

## Contract Domain

Not implemented (no contracts/contracts tables in schema — `promotions` cover rate deals). **FUTURE**: when contracts arrive, REST for partner-facing CRUD + GraphQL for console, sharing the same services. Do not design now.

## Reservation Domain

| Capability | Proposed | Notes |
|---|---|---|
| Create / lookup / cancel (guest) | REST | Idempotency-Key; action endpoint for cancel |
| List + detail + staff cancel (admin) | GraphQL | Console |
| Status history, holds, no-show | FUTURE | Hold release job referenced in schema; decide style when built |

## Client Domain

B2B clients / agencies / wholesalers: **not implemented**. **FUTURE**: REST for partners. No classification now.

## User & Permission Domain

| Capability | Proposed | Notes |
|---|---|---|
| Login/register/me/my-reservations | REST | Standard auth; rate limiting added at REST layer |
| User/role management (admin) | GraphQL | Console; `validateRoleScope` stays in `AdminService` |

## Finance Domain

| Capability | Proposed | Notes |
|---|---|---|
| Payment create/capture, invoice issue | REST | Owner/staff authz in `PaymentService`; gateway webhooks REST |
| Payment/invoice lists (admin) | GraphQL | Console |

## Reporting Domain

| Capability | Proposed | Notes |
|---|---|---|
| Dashboard (admin) | GraphQL | Aggregated stats — GraphQL strength |
| Exports (CSV/PDF) | FUTURE | REST with `Accept` headers when built |

## API Classification Matrix

See "API Inventory" (rows 1–68). Summary:

| Proposed API | Count | Operations |
|---|---|---|
| REST | 24 | 1–4, 10–19, 33–35, 46–48, 51–53, 56 |
| GraphQL (keep) | 38 | 5–9, 20–32, 36–45, 49–50, 54–55, 57–61 |
| REST + GraphQL | 0 | — |
| Internal only | 5 | 62–66 |
| Investigate | 1 | 67 (frontend /api placeholders) |
| REST (keep) | 1 | 68 (health) |

## Architecture Principles

1. **Shared domain services are the single source of truth.** REST controllers and GraphQL resolvers are thin adapters over `service/` classes. No business logic in either delivery layer. (Already true for GraphQL; REST must follow the same rule.)
2. **Consumer determines style.** Public B2C + integrations → REST. Internal admin console → GraphQL. No operation is classified by what it is today.
3. **No dual implementations.** If a capability ever needs both styles, both call the same service method.
4. **HTTP semantics where they mean something.** GET for safe reads (with caching), POST for creation/actions, `Idempotency-Key` for creates, actions as `POST /resource/{id}/action` (not forced CRUD).
5. **Cache at the right layer.** Public catalog reads → CDN/browser cache (Cache-Control/ETag). Admin and transactional data → never cached.
6. **Security stays at the same depth.** The resolver-level authz patterns (`ensureStaffAccess`, `ensureSuperAdmin`, owner checks in `PaymentService`/`BookingService`) are the model for REST adapters; hotel-scope IDOR protection is a hard requirement in both layers.
7. **Errors share one taxonomy.** `DomainException` codes (NOT_FOUND/FORBIDDEN/CONFLICT/VALIDATION/UNAUTHORIZED) map to HTTP status codes in REST and `extensions.code` in GraphQL — one taxonomy, two transports.
8. **Versioning.** REST: `/api/v1` (breaking changes → `/api/v2`). GraphQL: additive evolution + deprecations, no version prefix.
9. **Backoffice stays GraphQL until there is a concrete reason to change it** (e.g., partner portal needs). Do not churn a working consumer.
10. **Internal surfaces stay internal.** Kafka/outbox, dedupe bookkeeping, proxies, and tooling are never public APIs.

## Migration Strategy

Adapted phases (do NOT execute until approved):

### Phase 1 — Discovery & classification (THIS document)
- Inventory, consumers, classification. → review by owner.

### Phase 2 — API architecture approval
- Owner approves/rejects classification; resolves Open Questions; locks Decisions Pending Approval.

### Phase 3 — REST contract design
- Detailed OpenAPI for the 24 REST operations (paths, params, status codes, error envelope, pagination, `Idempotency-Key`, cache headers, auth).
- Align with the existing `docs/api-guidelines.md` draft (update it to become the REST contract spec).
- Decide `hotelDetails` composite shape (Investigate row 12).

### Phase 4 — Shared application/domain service preparation
- Verify every REST operation maps 1:1 to an existing service method (expected: yes, all already exist in `AuthService`, `CatalogQueryService`, `AvailabilityService`, `PricingService`, `BookingService`, `PaymentService`, `InvoiceService`, `ReviewService`).
- Introduce DTO projections only where REST responses differ from GraphQL types (e.g., `HotelDetails` composite). No service refactor unless a gap is found.

### Phase 5 — REST endpoint implementation
- New `web/` or `controller/` package with REST controllers (thin adapters).
- Exception → HTTP mapping (DomainException → 400/401/403/404/409/422).
- Rate limiting on `/auth/*` and anonymous reservation lookup (ADR-007 debt).
- Security headers, CORS narrowing, GraphiQL disabled in prod.
- OpenAPI generation (`springdoc` or Boot-native), versioned `/api/v1`.

### Phase 6 — GraphQL restructuring where necessary
- Remove guest-facing guest operations from the schema? **Decision required** (deprecate vs keep while migrating consumers).
- Preferred: keep schema intact during consumer migration; deprecate guest operations after frontend-hotel is live on REST; remove in a later breaking release.

### Phase 7 — Consumer migration
- `frontend-hotel`: replace mock services with REST client (`src/services/*` are the seam — swap the promise-based implementations, no UI changes).
- `backoffice-hotel`: unchanged (stays GraphQL).
- Postman collection: add REST folder; keep GraphQL folder during transition.

### Phase 8 — Testing
- REST: integration tests per endpoint (Testcontainers), mirroring `GraphqlApiIntegrationTest` coverage (authz matrix, IDOR, validation, pagination, idempotency).
- Contract tests: OpenAPI ↔ implementation (springdoc + `spring-cloud-contract` or lightweight schema assertions).
- E2E: guest journey via REST (frontend-hotel e2e suite already covers the flows; point it at REST).
- Re-run full backend gates (`/verify`, `/domain-review`).

### Phase 9 — Deprecation of unnecessary endpoints
- Mark guest GraphQL operations `@deprecated` in schema; monitor; remove in a major release after frontend-hotel has been on REST for ≥1 release cycle.
- Remove GraphiQL from prod config.

### Phase 10 — Final API architecture audit
- Verify: no duplicated business logic, both layers call services only; cache headers correct; authz parity (REST vs GraphQL matrix); docs updated; ADRs for REST decisions.

## Migration Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Breaking change for backoffice (38 ops) | High if touched | **Backoffice is untouched** — GraphQL schema unchanged during phases 3–5 |
| Guest frontend regression | High | Mock services are the seam; swap implementations under the same signatures; existing e2e suite is the regression net |
| Duplicated logic between layers | High | Rule 1 enforced in review gates (architect/code-reviewer agents check thin adapters) |
| Authz drift between REST and GraphQL | High | Same service methods = same checks; add parity integration tests (authz matrix per layer) |
| Database impact | None | No schema changes in any phase |
| Caching mistakes (stale catalog) | Medium | Explicit Cache-Control per endpoint; review gate on headers; short TTLs initially |
| Idempotency regression | Medium | `Idempotency-Key` → existing `idempotency_key` column; tested |
| API versioning confusion | Medium | `/api/v1` prefix from day one; GraphQL additive-only |
| Documentation drift (AGENTS.md rule 7 already claims REST) | Medium | Update AGENTS.md + docs/api-guidelines.md in Phase 3; the REST claims become true |
| Deployment risk | Low | Both layers ship in the same app; no infra change; rollback = revert commit |
| Rollback strategy | — | Feature-flag REST under `/api/v1` path only; GraphQL untouched; revert frontend REST client switch independently |

## Open Questions

Critical:
1. **Backoffice strategy**: Option A (recommended) — backoffice stays 100% GraphQL; Option B — admin CRUD also moves to REST, backoffice consumes both. A is much cheaper; B only if a partner/B2B console is planned soon.
2. **Guest-frontend integration timing**: REST endpoints first, then swap mock services — or build both in one phase? (Recommendation: REST first, swap second, e2e between.)
3. **Schema deprecation policy**: keep deprecated guest operations in GraphQL schema after migration (recommended) or remove immediately?

Important:
4. `hotelDetails` REST shape: one composite GET vs page-level client aggregation from subresources (affects CDN caching granularity).
5. Availability/rates URL design: nested under `/hotels/{id}` vs a dedicated `/search` namespace.
6. Rate limiting requirements (per-IP? per-account? per-endpoint?) before REST Phase 5.
7. `Idempotency-Key` semantics: same value → same reservation (reuse existing behavior) — confirm header name/expiry policy.
8. Should `/api/v1` base apply to admin ops if they ever go REST? (Future-proofing.)

Optional:
9. Exports (CSV/PDF) — REST with Accept headers or files service?
10. OpenAPI tooling choice (springdoc vs Spring Boot native) — matters for Phase 5.

## Decisions Pending Approval

- D1: Adopt the hybrid split — **public B2C = REST (24 ops), admin console = GraphQL (38 ops)**.
- D2: No operation is exposed as both REST and GraphQL today.
- D3: Migration phases 3–5 (REST contract, service prep, REST implementation) proceed only after D1 approval.
- D4: Backoffice-hotel codebase is not touched by this migration.
- D5: Internal surfaces (outbox, proxies, seed tooling, GraphiQL) remain internal; GraphiQL disabled in production.
- D6: Future integrations (payment/email webhooks, B2B, PMS) are REST by default.
- D7: `docs/api-guidelines.md` is the REST contract base and gets updated, not deleted.

## Future Considerations

- Mobile app (REST consumer; could share the public API).
- B2B/partner portal (REST; may justify REST+GraphQL for shared capabilities via same services).
- Contracts/wholesale domain (REST partner-facing + GraphQL console when modeled).
- Dedicated search (cross-hotel availability, faceted) — evaluate PostgreSQL FTS / search engine then; not now.
- Real payment provider + webhooks (REST).
- PMS/channel sync (REST).
- Observability: actuator metrics + structured logging; API analytics per style.
- Reporting exports (REST, Accept-header driven).
- Possible GraphQL federation/BFF if a second GraphQL consumer appears — not needed for one console.

## Approval Status

**DRAFT — NOT APPROVED.**

Pending: owner review of the classification matrix, Open Questions, and Decisions Pending Approval. No implementation work may start from this document.