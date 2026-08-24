# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# MODULAR MONOLITH REFACTOR — 15-ITEM AUDIT REPORT

Status: **implemented and verified** — `./mvnw test` green: **98 tests**
(91 pre-existing + 7 new ArchUnit rules), 0 failures, 0 errors. Platform:
Spring Boot 4.1.0 / Java 21 / PostgreSQL 16 / Flyway / GraphQL / Kafka +
Testcontainers. ADR: `docs/decisions/ADR-008-modular-monolith.md`.

---

## 1. Goal and scope

Refactor the flat monolith (`service/`, `repository/`, `domain/`, `graphql/`
at root, God-class `AdminService`, monolithic resolvers, single
`schema.graphqls`) into a modular monolith with explicit, enforced module
boundaries — **without changing behavior**: no schema/API changes, no DTO
moves, all 91 pre-existing tests kept green throughout.

## 2. Module map

14 modules + `shared` under `com.hotelcollection.hotel`:

| Module | Responsibility |
|---|---|
| `platform` | Platforms, hero/featured blocks, content blocks |
| `catalog` | Hotels, room types, rooms, amenities, experiences, restaurants, FAQs, extras |
| `rate` | Rate plans, promotions, room-type links, prices, pricing engine (quote), cancellation rules |
| `availability` | Room-type availability rows, inventory locking/selling |
| `reservation` | Bookings, guests, cancellations, status history |
| `billing` | Payments (+transactions), invoices |
| `review` | Reviews + moderation |
| `identity` | Users, roles, JWT, `CurrentUserAccessor`, security chain |
| `notification` | Notification templates/queries |
| `audit` | Audit log |
| `reference` | Reference data (tax/fee types) |
| `media` | Media storage + query |
| `eventing` | Transactional outbox → Kafka publisher |
| `admin` | Back-office facade (dashboard + workspace views) |
| `shared` | `exception`, `validation`, `util`, `pagination`, `graphql`, `web` — depends on nothing |

## 3. Module layout convention

Every module (except `admin` and `shared`) uses the same internal structure:
`api/` (use-case interfaces + input/view records), `application/service/`
(use cases), `domain/{model,rule,event,port/out}` (JPA entities, business
rules, outbox events, output ports), `adapter/{graphql,persistence,rest,
storage,security}` (adapters). Same-module REST controllers stay on concrete
services; cross-module callers always go through `api`.

## 4. The 22 module API interfaces

Each module exposes its contract via use-case interfaces in `api/`:

- identity: `AuthUseCase`, `IdentityAdminUseCase`
- catalog: `CatalogQueryUseCase`, `CatalogAdminUseCase`
- rate: `PricingUseCase`, `RateQueryUseCase`, `RateAdminUseCase`
- availability: `AvailabilityQueryUseCase`, `AvailabilityAdminUseCase`, `InventoryUseCase`
- reservation: `BookingUseCase`, `ReservationAdminUseCase`, `GuestProvisioningUseCase`
- billing: `PaymentUseCase`, `InvoiceUseCase`, `BillingAdminUseCase`
- review: `ReviewUseCase`
- notification: `NotificationQueryUseCase`
- audit: `AuditUseCase`
- platform: `PlatformQueryUseCase`
- media: `MediaQueryUseCase`, `MediaAdminUseCase`, `MediaStorageUseCase`
- reference: `ReferenceQueryUseCase`
- eventing: `EventPublisher` (in `eventing.api`)

Inputs/views travel as records inside `api`; entity types flow through as
return types (pragmatic ADR, see ADR-008).

## 5. Cross-module dependency routing (before → after)

Previously services imported other modules' repositories directly; the
ArchUnit gate now proves all cross-module access is via `api`/`domain.model`:

| Caller (module) | Before | After |
|---|---|---|
| rate `PricingService` | `catalog.domain.port.out.ExtraRepository.findAllById` | `CatalogQueryUseCase.extrasByIds` (new) |
| reservation `BookingService` | `rate.domain.port.out.RatePlanRepository.findById` | `RateQueryUseCase.ratePlanById` (new) |
| rate `PricingService` | `reference` repo via TaxFeeType | `ReferenceQueryUseCase.findActiveTaxFeeTypesByHotelId` |
| reservation `BookingService` | catalog/rate/inventory repos | `CatalogQueryUseCase`, `PricingUseCase`, `RateQueryUseCase`, `InventoryUseCase` |
| billing `PaymentService` | `ReservationRepository` | `BookingUseCase` (getByReferenceAndEmail, markFullyPaid) |
| billing `InvoiceService` | `ReservationRepository` | `BookingUseCase` |
| review `ReviewService` | catalog/reservation repos | `CatalogQueryUseCase`, `BookingUseCase`, `GuestProvisioningUseCase` |
| media `MediaStorageService` | catalog/platform repos | `CatalogQueryUseCase.hotelExists`, `PlatformQueryUseCase.platformExists` |
| platform `PlatformService` | catalog/media repos | `CatalogQueryUseCase`, `MediaQueryUseCase` |
| availability `AvailabilityService` | catalog repo | `CatalogQueryUseCase.activeRoomTypes` |
| admin services | `AdminService` repos | module APIs only |
| identity `AuthService.register` | guest repo | `GuestProvisioningUseCase.provision` |

## 6. New services (15) and helpers

`ReferenceQueryService`, `AuditService`, `NotificationQueryService`,
`MediaQueryService`, `MediaAdminService`, `GuestProvisioningService`,
`BillingAdminService`, `IdentityAdminService`, `CatalogAdminService`,
`RateQueryService`, `RateAdminService`, `AvailabilityAdminService`,
`InventoryService`, `ReservationAdminService`, `AdminDashboardService` —
plus `rate/application/service/AdminViews.java` (view mapping helpers).

## 7. Rewired legacy services

`AuthService`, `CatalogQueryService` (full rewrite: drops
offers/ratePlans/availability/cancellationReasonLabel/minPrice/avgRating;
`MAX_SORT_CANDIDATES = 500`), `PricingService` (implements `PricingUseCase`,
adds `evaluateCancellation`), `AvailabilityService` (implements
`AvailabilityQueryUseCase`, adds `range`), `BookingService` (full rewrite:
implements `BookingUseCase`, adds `getById`, `cancellationReasonLabel`,
`hasCompletedStayAt`, `markFullyPaid`, internal `requireStaffAccess`),
`PaymentService`, `InvoiceService`, `ReviewService` (implements
`ReviewUseCase`, moderation + admin reviews with internal staff scope),
`MediaStorageService`, `PlatformService`. All now `implements` their module
API and hold zero cross-module repositories.

## 8. Scope-guard placement

Hotel scoping and `super_admin`/staff checks moved INTO the use-case services
(via `CurrentUserAccessor.require()`), so every path — GraphQL, REST,
future adapters — is guarded identically. Resolvers and controllers contain
no authorization logic. New admin services take no actor parameter; audit +
authz are internal.

## 9. Circular bean dependencies (@Lazy breaks)

Cycles broken with `@Lazy` on the API constructor parameter:

- `RateQueryService` ← `CatalogQueryUseCase` (catalogQuery → rateQuery → catalogQuery)
- `PricingService` ← `CatalogQueryUseCase` (catalogQuery → pricing → catalogQuery; new in this refactor)
- `ReviewService` ← `CatalogQueryUseCase` (catalogQuery → review → booking → inventory → catalogQuery)
- `BookingService` ← `CatalogQueryUseCase` (same chain)
- `InventoryService` ← `CatalogQueryUseCase` (same chain)
- `AuditService` ← `IdentityAdminUseCase` (audit ↔ identity)

## 10. GraphQL resolver split

Six legacy files deleted; twelve thin per-module resolvers created under each
module's `adapter/graphql/` (field resolvers delegate to batch loaders):

- `catalog/adapter/graphql/QueryResolver` (hotels, hotel, hotelDetails,
  roomTypes, experiences, restaurants, extras, faqs + Hotel/RoomType field
  mappings incl. media/amenities/checkIn/checkOut)
- `rate/adapter/graphql/RateQueryResolver` (offers, rates, quote +
  `Hotel.fromPricePerNight`, `RoomType.pricePerNight` batch mappings)
- `availability/adapter/graphql/AvailabilityQueryResolver` (availability
  check + `AvailabilityRow.totalInventory`/`free` batch via
  `catalog.roomTypesByIds`)
- `review/adapter/graphql/ReviewQueryResolver` + `ReviewMutationResolver`
  (reviews, createReview, moderateReview)
- `identity/adapter/graphql/AuthQueryResolver` (`me` via
  `CurrentUserAccessor.require()` — `AuthUseCase.me(Long)` exists but is not
  used by the resolver, matching old behavior) + `AuthMutationResolver`
  (login, register)
- `reservation/adapter/graphql/ReservationQueryResolver` (myReservations,
  reservation, adminReservations + `Reservation.guest`,
  `ReservationCancellation.reason`) + `BookingMutationResolver`
  (createReservation, cancelReservation, adminCancelReservation)
- `billing/adapter/graphql/BillingMutationResolver` (createPayment,
  capturePayment, issueInvoice)
- `admin/adapter/graphql/AdminQueryResolver` + `AdminMutationResolver`
  (thin over module APIs; adminCancelReservation mapped only in
  BookingMutationResolver to avoid duplicate mappings)

No invented queries: `availabilityRange` and `hotelReviews` GraphQL queries
were NOT added (only internal `AvailabilityQueryUseCase.range` and
`ReviewUseCase.avgRatingByHotelIds` exist).

## 11. Schema split

Root `src/main/resources/graphql/schema.graphqls` now holds only the `schema`
block, `LocalDate`/`DateTime` scalars, and empty `type Query`/`type Mutation`.
Each module owns its types in `src/main/resources/graphql/<module>/*.graphqls`
using `extend type Query/Mutation`; `shared.graphqls` holds `PageInput` +
`ReviewPage`; `media.graphqls` holds `Media`/`MediaInput`. Boot log: "Loaded
14 resource(s) in the GraphQL schema" — identical contract, no unmapped
changes.

## 12. Deletions

`admin/application/service/AdminService.java` (God class),
`catalog/QueryResolver.java`, `identity/MutationResolver.java`,
`admin/AdminQueryResolver.java`, `admin/AdminMutationResolver.java`,
`availability/AvailabilityRowResolver.java` — plus the platform root-level
resolver package fix (moved into `platform/adapter/graphql/`).

## 13. ArchUnit enforcement

`src/test/java/com/hotelcollection/hotel/architecture/ModuleArchitectureTest.java`
— 7 rules, all enforced on `./mvnw test`:

1. Cross-module access goes through module APIs (per-module gate:
   `application`/`adapter`/`domain.port`/`domain.rule`/`domain.event` are
   hidden outside the owning module)
2. `domain` never depends on `api`/`application`/`adapter`
3. `api` never depends on `application`/`adapter`/`domain.port`
4. Module-API graph is acyclic
5. GraphQL adapters don't touch persistence/ports/other adapters
6. Resolvers live in `adapter.graphql`
7. Services are not god classes (≤ 11 constructor dependencies)

**Violations found and fixed during the gate**: `PricingService` →
catalog `ExtraRepository` and `BookingService` → rate `RatePlanRepository`
(now via APIs — see item 5), dead `SecurityConfig` import in
`MediaController`, stale package declaration on `PlatformQueryResolver`.

## 14. Test verification

`./mvnw test` — **98 tests, 0 failures, 0 errors**:
AdminGraphqlIntegrationTest (17), GraphqlApiIntegrationTest (15),
DatabaseIntegrityIntegrationTest (21), MediaUploadIntegrationTest (9),
PlatformGraphqlIntegrationTest (12), RestApiIntegrationTest (5),
CancellationPolicyTest (5), PricingServiceIntegrationTest (3),
BookingFlowIntegrationTest (2), HotelPlatformApplicationTests (1),
GraphqlConfigTest (1), ModuleArchitectureTest (7). Behavioral parity
confirmed: no schema/API contract changes.

## 15. Residual items / future work

- **Entity-as-contract pragmatism**: JPA entities cross module boundaries
  (`reservation` ↔ `billing` via `PaymentStatus`; `catalog` ↔ `rate` via
  `Hotel`/`RatePlan`) — documented in ADR-008; module-level cycles exist but
  the API graph is acyclic.
- `CatalogQueryService.hotelNamesByIds` still loads all hotels then filters
  (behavior parity; perf nit for large catalogues).
- `admin` is a facade module with no domain of its own.
- `AGENTS.md` still describes the pre-refactor flat layout — update when the
  repo conventions are next touched.
- `@Lazy` proxies on cross-module API params: keep cycles out of new code
  (ArchUnit rule 4 guards the API graph).