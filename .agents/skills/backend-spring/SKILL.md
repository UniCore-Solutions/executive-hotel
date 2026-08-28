---
name: backend-spring
description: Conventions for working in backend-hotel (Spring Boot 4 / Java 21). Use when adding or changing a service, controller, entity, repository, DTO, security rule, or event in the backend. Covers the layered package rules enforced by ArchUnit, the authorization pattern, transaction and outbox discipline, and the error taxonomy.
---

# backend-spring

`backend-hotel/` — Spring Boot 4.1.0, Java 21, Maven wrapper. **`mvn` is not installed:
always `./mvnw`.** Package root `com.hotelcollection.hotel`.

## The layout is flat and layered — not hexagonal

```
controller/     11 GraphQL @Controller + 6 REST @RestController — thin
service/        28 use-case interfaces  ← the only legal cross-domain seam
service/impl/   29 implementations — domain logic, orchestration, authz, transactions
repository/     36 Spring Data JPA repositories
entity/         55 JPA entities + enums, mirroring Flyway 1:1
dto/<domain>/   input & view records (13 domain packages)
mapper/ security/ config/ exception/ util/ storage/
```

Ignore `docs/architecture/architecture.md`, `ADR-008` and `AGENTS.md` on this topic —
they describe an `api/application/domain/adapter` layout that **does not exist and is
banned by an ArchUnit rule**. `ADR-009-layered-architecture.md` is accurate.

### Rules `ModuleArchitectureTest` enforces (they will fail your build)

1. No class may live in `..api..`, `..application..`, `..domain..`, `..adapter..`.
2. Only `service/impl/..` may reference `service/impl/..` — everyone else uses the interface.
3. Only `service/..` and `repository/..` may reference `repository/..`.
4. `controller/..` may reference neither `repository/..` nor `service/impl/..`.
5. A `service/impl` class may have at most **11** constructor parameters.

> Rules 3 and 4 are **currently red** because `StaySearchGraphQLController:48` calls
> `HotelRepository.findAllActive()` directly. That failure predates you. Do not add a
> second one — and if you touch that controller, fix it by adding the accessor to
> `CatalogQueryService`.

## Adding a feature — the standard shape

1. **Migration first** if the schema changes (see the `database-flyway` skill), then the
   entity. `ddl-auto: validate` means a mismatch stops the application at boot.
2. **Interface** in `service/`, named for the use case (`BookingService`,
   `RateAdminService`). Cross-domain collaborators are injected as these interfaces.
3. **Implementation** in `service/impl/`. Put the business logic here — controllers stay thin.
4. **DTO records** in `dto/<domain>/`.
5. **Schema** in `src/main/resources/graphql/<domain>/<domain>.graphqls` using
   `extend type Query` / `extend type Mutation` (see the `graphql-contract` skill).
6. **Controller** method with `@QueryMapping` / `@MutationMapping` / `@SchemaMapping`,
   delegating in one or two lines.
7. **Integration test** in `src/test/.../integration/` (Testcontainers, real Postgres).

Circular dependencies between services are resolved with `@Lazy` on the constructor
parameter — see `BookingServiceImpl(@Lazy CatalogQueryService catalog, …)`.

## Authorization — you must write it yourself

`/graphql` is `permitAll` at the filter chain. Authorization lives **inside services**:

```java
CurrentUser actor = currentUser.require();          // 401 if anonymous
if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
    throw DomainException.forbidden("no access to this hotel");
}
```

Every hotel-scoped read *and* write needs this. Cross-hotel IDOR must return **403, not
200**. For guest-owned resources, allow owner-or-staff — see
`PaymentServiceImpl.ensurePaymentAccess`.

RBAC is **role-name based**. The `permissions` / `role_permissions` tables and the
`Permission` entity are dead — do not build on them without a decision.

## Transactions, locking, idempotency

- `@Transactional` on the service method; `readOnly = true` for queries.
- **Idempotent mutations** take an `idempotencyKey`, check for an existing row first, and
  catch `DataIntegrityViolationException` to return the racing winner
  (`BookingServiceImpl.create`).
- **Inventory** uses `ensureRow(...)` upsert then `lockByRoomTypeIdsAndRange(...)`
  (`SELECT … FOR UPDATE`) inside the booking transaction — never optimistic.
- Use `saveAndFlush` when you need a unique-constraint violation to surface *now* as a
  clean `CONFLICT` rather than an opaque failure at commit (`doCancel`).
- Money is `BigDecimal` via `util/MoneyUtil`. Never `double`.

## Events — outbox only, never direct Kafka

```java
// inside the same @Transactional method as the business change
eventPublisher.publish("booking.confirmed", 1, hotelId,
        "reservation:" + reservation.getReference(), Map.of(...), traceId);
```

`OutboxEventPublisher` is `@Transactional(propagation = MANDATORY)` — it *cannot* be
called outside a transaction, which is the point: an event can never exist without its
fact. `OutboxRelay` handles claiming, publishing, retry and stale-claim recovery. Never
inject `KafkaTemplate` into a service.

Existing types: `booking.confirmed`, `booking.cancelled`, `payment.created`,
`payment.captured`. Topic = `hotelcollection.<eventType>.v<version>`.

**There are no consumers.** If your feature needs to react to an event, you are writing
the first `@KafkaListener` in this codebase — say so explicitly and design the idempotency
(the unused `event_consumption` table was meant for this).

## Errors

Throw `DomainException.{notFound,forbidden,conflict,validation}` — never raw
`RuntimeException`. `GlobalExceptionHandler` (REST) and `GraphqlExceptionHandler`
(GraphQL) map them to the shared `ApiError` envelope with codes
`NOT_FOUND · FORBIDDEN · CONFLICT · VALIDATION · UNAUTHORIZED`. Input guards go through
`util/Validation`.

## Configuration

`application.yaml`, env-driven. Default profile `dev`; deployments set
`SPRING_PROFILES_ACTIVE=prod` (GraphiQL off, introspection off, CSP header on).
`JWT_SECRET` is required with no default — the app fails to start if it is missing,
under 32 bytes, or equal to the historic in-repo default.

## Before you finish

```bash
cd backend-hotel && ./mvnw test    # needs Docker (Testcontainers)
```

Expect exactly the two pre-existing `ModuleArchitectureTest` failures. Anything else is
yours to fix.
