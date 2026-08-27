# Backend Architecture

How the hotel platform backend is organized and why. Companion to
[`domain-requirements.md`](domain-requirements.md) (what),
[`persistence.md`](persistence.md) / [`invariants.md`](invariants.md) (data &
rules), [`../api/graphql.md`](../api/graphql.md) (API surface),
[`../security/security.md`](../security/security.md) (security),
[`../development/testing.md`](../development/testing.md) (tests), and the
decision log `decisions/` (ADR-008 = modular monolith). The refactor record
is archived: [`../archive/audits/2026-08-19-modular-monolith-refactor-report.md`](../archive/audits/2026-08-19-modular-monolith-refactor-report.md).

## One-screen view (current state, implemented)

```
src/main/java/com/hotelcollection/hotel/            (layered — ADR-009)
  controller/   GraphQL + REST controllers/resolvers (thin delegates)
  service/      use-case interfaces (Auth, Booking, Pricing, …)
  service/impl/ implementations — domain logic, orchestration, persistence access
  repository/   Spring Data JPA repositories (persistence only)
  entity/       JPA entities (the domain model, mirroring the Flyway schema)
  dto/          GraphQL/REST input & view records, split by domain (admin, audit,
                availability, billing, catalog, homepage, identity, media,
                notification, platform, rate, reservation, review)
  mapper/       entity ↔ dto mapping
  security/     JWT, filters (trace, auth rate-limit), CurrentUser access
  config/       GraphQL config (depth limit), scalar config, media web config
  exception/    shared exception taxonomy + GraphQL exception advice
  storage/ util/ media storage provider + helpers
src/main/resources/graphql/       schema.graphqls + one *.graphqls per domain
src/main/resources/db/migration/  V1..V22 Flyway-owned schema
```

Controllers delegate to service interfaces; services own the business rules and
persistence; repositories are reached from the service layer only. This is
enforced by `ModuleArchitectureTest` (ArchUnit), which also **prohibits** the
hexagonal `api/application/domain/adapter` package layout proposed earlier —
see [ADR-009](decisions/ADR-009-layered-architecture.md). The old modular-monolith
design (ADR-008) is superseded and must not be treated as the current
architecture.

Each layer is single-purpose: controllers are thin delegates, services own
domain + orchestration + persistence access, repositories are persistence-only,
and `dto/` is split by domain. Cross-layer access goes through service interfaces
— enforced by `ModuleArchitectureTest` (ArchUnit, 7 rules: no impl access outside
services, no repository access outside services, controllers never touch
repositories directly, ≤ 11 constructor deps per service, and the hexagonal
packages from superseded ADR-008 are prohibited).

- **Schema ownership**: Flyway migrations V1–V22 define all 53 tables;
  `spring.jpa.hibernate.ddl-auto: validate` is on in every environment so any
  entity/schema drift fails the build. **No new table** may appear outside a
  new Flyway migration.
- **API surface**: GraphQL (`POST /graphql`) is the primary API consumed by
  the frontend (GraphiQL in the `dev` profile only). REST exists only for
  the approved splits: `/api/v1/media/**` (multipart) and
  `/api/v1/auth/**` + `/api/v1/reservations/**` (self-service + reference
  flows), plus `/actuator/health` probes and `/actuator/prometheus`.
- **Resolvers are thin**: `QueryResolver` / `MutationResolver` only bind
  schema types to services. All business rules — totals identity,
  cancellation math, inventory locking, idempotency, promo validation,
  authorization checks — live in module application services.
- **Auth**: stateless JWT (jjwt, ADR-007), `JwtAuthFilter` populates a
  `CurrentUser`; services check via `CurrentUserAccessor` (require/optional)
  and hotel-scope helpers. `/graphql` stays reachable anonymously for the
  accountless booking flow; protected operations fail with GraphQL error
  codes. The auth endpoints (REST + GraphQL login/register) are rate-limited
  per client IP (`AuthRateLimitFilter`). `JWT_SECRET` is required — the app
  fails fast without a strong secret.
- **GraphQL depth limit**: `config/GraphqlConfig` installs
  `MaxQueryDepthInstrumentation(15)`; hostile deep queries are rejected with
  a validation error (proven by `GraphqlConfigTest`).

## Key decisions

### Single domain model, split by DTO boundary
The entities *are* the domain model — they mirror the frozen schema 1:1
(composite FKs kept as plain columns, no relation objects for `hotel_id`-style
FKs). Associations exist only where they carry lifecycle semantics:
`Reservation → roomLines/extras/charges/statusHistory`
(`CascadeType.ALL`), `Reservation → cancellation` (1:1), `Payment →
transactions`, `Reservation.guest` (read-only join for display). Services
(`service/impl`) are the single place that touches these entities and drives
persistence.

### Use-case records in `dto/` (split by domain)
Inputs (`LoginInput`, `CreateReservationInput`, `AvailabilityInput`, …) and
results (`Quote`, `AuthPayload`, `ReservationResult`, …) live once, in the
relevant `dto/<domain>` package, as records. Services return/accept these
records; resolvers pass them straight through as GraphQL `@Argument` types.
DTO records sharing mapping commands are handled by `mapper/`.

### Pricing — one engine, one quote
`PricingService.quote(QuoteInput)` is the single source of truth for a stay:
per-line nights + nightly rates, extras (per_stay/per_night/per_person/
per_room), taxes/fees, promo discount, subtotal/discount/tax/fee/total
identity, `valid` + `promoMessage`. `BookingService.create` persists
exactly the quote lines/extras/charges — the client can never underpay by
quoting different math. `taxCharges`/`extraLines` are shared with invoice
generation so bills match quotes.

### Concurrency for inventory
`Availability` rows are locked with `PESSIMISTIC_WRITE` across the stay range
inside the booking transaction, then mutated with `sell()/release()`. A
`@Version` column backstops optimistic conflicts. Selling the last room
concurrently → the second transaction fails and surfaces as `CONFLICT`.
`room_types.total_inventory` cannot be reduced below current sales (V18
trigger + `setRoomTypeInventory` pre-check → `CONFLICT`).

### Concurrency for money
`PaymentService.createPayment`/`capture` read the reservation with
`PESSIMISTIC_WRITE` (`BookingUseCase.getByIdForUpdate`), serializing
concurrent payments on the same reservation so the remaining-balance check
cannot race (TOCTOU).

### Idempotency
- Booking: `reservations.idempotency_key` UNIQUE; duplicate create returns
  the existing reservation with `created: false` (frontend retry-safe).
- Payment capture: unique `(provider, provider_reference)` (C17); capture is
  replayed as a no-op.
- Invoice: `findByReservationId` → existing invoice (one per reservation);
  `issueInvoice` is idempotent.

### Events: transactional outbox → Kafka
Booking/payment facts are written to `event_outbox` **in the same
transaction** as the state change. `OutboxRelay` runs on a scheduler and
performs **claim, publish, and outcome in separate `REQUIRES_NEW`
transactions** so a crash between claim and publish cannot silently swallow
events; `recoverStaleClaims()` releases rows stuck in `publishing` (5-minute
window, `updated_at` — V17) back to pending, bounded by the attempt budget.

### GraphQL specifics
- `@BatchMapping` + one SQL query per N+1-prone field (`Hotel.media`,
  `Hotel.amenities`, `Hotel.fromPricePerNight`, `Hotel` review aggregates,
  `RoomType.media`, `RoomType.pricePerNight`).
- Entity collections exposed by the API are loaded eagerly (SUBSELECT joins)
  so resolvers work outside the transaction boundary (`open-in-view: false`).
- `Hotel.checkInTime` / `checkOutTime` map to `String` (`HH:mm`) via
  `@SchemaMapping`; scalars are `LocalDate` (ISO) and `DateTime` (ISO-8601).
- Error contract: every failure maps to `extensions.code` ∈
  `NOT_FOUND | FORBIDDEN | CONFLICT | VALIDATION | UNAUTHORIZED` with a stable
  `classification`. See [`../api/graphql.md`](../api/graphql.md).

## Testing

- Unit: `CancellationPolicyTest` (pure rules), `GraphqlConfigTest` (depth
  instrumentation).
- Architecture: `ModuleArchitectureTest` (7 ArchUnit rules — the module
  gate).
- Integration (Testcontainers — real PostgreSQL 16.4 + Kafka, no H2):
  `DatabaseIntegrityIntegrationTest` (Flyway V1–V18, entities validate,
  constraint + trigger coverage), `PricingServiceIntegrationTest` (quote math
  vs frontend, promos, extras models), `BookingFlowIntegrationTest` (full
  lifecycle incl. outbox row, idempotent retry, penalty, staff payment +
  invoice), `GraphqlApiIntegrationTest` (real HTTP + security matrix),
  `RestApiIntegrationTest`, `MediaUploadIntegrationTest` (multipart +
  owner-scoped authz), `AdminGraphqlIntegrationTest`, 
  `PlatformGraphqlIntegrationTest`, `AuthRateLimitIntegrationTest`.
  Full inventory + counts in [`../development/testing.md`](../development/testing.md).
- `TestFixtures` seeds a bookable hotel (rate plan, nightly price 1000.00,
  inventory of 3, 12% tax) mirroring the frontend demo fixture.

## Costs & known trade-offs

- Eager subselect loading of Reservation children: +4 queries per reservation
  load, always — acceptable at booking-aggregate scale.
- `availability` in `AdminHotel` is a 30-day window; a calendar range input
  is future work.
- Mock payment provider only (port exists for a real gateway).
- In-memory sorting for `PRICE_ASC`/`RATING_DESC` is bounded to the first
  500 search candidates (`MAX_SORT_CANDIDATES`) — correct for a boutique
  catalog; revisit with real search (e.g. pgvector/full-text) if the catalog
  grows.
- `spring-boot-graphql-test` / `spring-graphql-test` are not usable in this
  Boot 4.1 module layout (the `AutoConfigureWebTestClient` class is absent
  from the published test jars); HTTP tests use `java.net.http.HttpClient`.
- No check-in/check-out mutations yet (review proof-of-stay requires a
  checked-out reservation); no refunds — see
  [`../audits/BACKEND_FINAL_AUDIT.md`](../audits/BACKEND_FINAL_AUDIT.md).