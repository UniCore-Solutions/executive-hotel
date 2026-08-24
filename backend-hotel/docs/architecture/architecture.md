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
src/main/java/com/hotelcollection/hotel/
  admin/        back-office facade: dashboard aggregation, admin reports
  audit/        audit_logs write/read (staff actions)
  availability/ single inventory source (C9): availability rows + capacity
  billing/      payments (create/capture, balance checks), invoices
  catalog/      hotels, room types, rooms, extras, amenities, media owners
  eventing/     transactional outbox relay + Kafka publisher (ADR-002)
  identity/     users, roles, JWT (ADR-007), Spring Security chain,
                auth rate limiting
  media/        multipart upload/delete (REST — approved split), binary storage
  notification/ email/SMS templates + outbound notifications (outbox-driven)
  platform/     platform hero/featured content blocks
  rate/         rate plans, prices, promotions, quote/pricing engine
  reference/    countries, currencies, cancellation reasons
  reservation/  booking lifecycle: create (idempotent, server-priced), lookup,
                cancel, status history, inventory release
  review/       reviews + moderation + proof-of-stay
  shared/       exception taxonomy, validation, pagination, graphql config
                (depth limit), web utils — no domain, no business rules
src/main/resources/graphql/schema.graphqls   the API contract
src/main/resources/db/migration/V1..V18      Flyway-owned schema
```

Each module is hexagonal: `api/` (use-case interfaces + I/O records),
`application/` (services), `domain/` (entities + port interfaces),
`adapter/` (persistence, graphql, rest, security). Cross-module imports go
through `<module>/api` (or `domain.model` for read-only entity sharing) —
enforced by `ModuleArchitectureTest` (ArchUnit, 7 rules). Two documented
exceptions (ADR-008): `admin` is a facade with no domain; `shared` is a
plain utility package.

- **Schema ownership**: Flyway migrations V1–V18 define all 53 tables;
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
- **GraphQL depth limit**: `shared/graphql/GraphqlConfig` installs
  `MaxQueryDepthInstrumentation(15)`; hostile deep queries are rejected with
  a validation error (proven by `GraphqlConfigTest`).

## Key decisions

### Modular monolith with per-module domain
The entities *are* the domain model — they mirror the frozen schema 1:1
(composite FKs kept as plain columns, no relation objects for `hotel_id`-style
FKs). Associations exist only where they carry lifecycle semantics:
`Reservation → roomLines/extras/charges/statusHistory`
(`CascadeType.ALL`), `Reservation → cancellation` (1:1), `Payment →
transactions`, `Reservation.guest` (read-only join for display). The
refactor record (`../archive/audits/2026-08-19-modular-monolith-refactor-report.md`)
documents the journey from the flat layout and the per-module gate that
keeps it honest.

### Use-case records in each module's `api`
Inputs (`LoginInput`, `CreateReservationInput`, `AvailabilityInput`, …) and
results (`Quote`, `AuthPayload`, `ReservationResult`, …) live once per
module in its `api` package as records. Services return/accept these
records; resolvers pass them straight through as GraphQL `@Argument` types.

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