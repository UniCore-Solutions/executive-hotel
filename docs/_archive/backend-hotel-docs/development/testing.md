# Testing

How the backend is verified. Command: `./mvnw test` (JDK 21; Testcontainers
spins up real PostgreSQL 16.4 + Kafka — Docker required, **no H2 anywhere**).

## Hard constraints

- **No H2. Ever.** Persistence tests run against real PostgreSQL via
  Testcontainers with Flyway applied; Kafka tests use the real
  `apache/kafka-native` container.
- The suite never calls live external providers (Cloudinary, Resend,
  payment, SMS) — provider ports are faked.
- `spring-boot-graphql-test`/`spring-graphql-test` (WebTestClient slices) are
  unusable in this Boot 4.1 module layout (missing published test class), so
  HTTP tests use `java.net.http.HttpClient` — see
  `../architecture/architecture.md`.

## Test pyramid (as built)

| Layer | What | Where |
|---|---|---|
| Unit | pure domain rules (cancellation math), GraphQL config | `CancellationPolicyTest`, `GraphqlConfigTest` |
| Architecture | the module gate | `ModuleArchitectureTest` (7 ArchUnit rules) |
| Integration | repositories/constraints/triggers against real PostgreSQL, quote math, full booking lifecycle | `DatabaseIntegrityIntegrationTest`, `PricingServiceIntegrationTest`, `BookingFlowIntegrationTest` |
| API (real HTTP) | GraphQL + REST + security matrix over real HTTP | `GraphqlApiIntegrationTest`, `RestApiIntegrationTest`, `MediaUploadIntegrationTest`, `PlatformGraphqlIntegrationTest`, `AdminGraphqlIntegrationTest`, `AuthRateLimitIntegrationTest` |
| Context | app boots, schema loads | `HotelPlatformApplicationTests` |

Use unit tests for pure rules, integration tests for anything touching the
database, and real-HTTP API tests for anything a client can reach (auth,
authorization, error codes, serialization).

## Test inventory (109 tests, 13 classes)

### Unit (6)

| Class | Covers |
|-------|--------|
| `rate/domain/rule/CancellationPolicyTest` (5) | penalty/refund math per rate-plan policy (deadline, first-night, percent), non-refundable plans |
| `shared/graphql/GraphqlConfigTest` (1) | depth instrumentation: 18-level query rejected with a "depth" error, 9-level query passes |

### Architecture (7)

| Class | Covers |
|-------|--------|
| `architecture/ModuleArchitectureTest` (7 ArchUnit rules) | per-module gate (cross-module imports only through `api`), domain purity (no infrastructure in `domain`), module-API acyclicity, adapter cleanliness, resolvers live in `adapter.graphql`, service ctor dependency limit |

### Integration — Testcontainers (real PostgreSQL + Kafka) (96)

| Class | Covers |
|-------|--------|
| `integration/DatabaseIntegrityIntegrationTest` (23) | Flyway V1–V18 applied; JPA entities validate against the schema; cross-hotel isolation, pricing overlap, capacity + total-inventory triggers, outbox updated_at, payment idempotency, media single-owner, content-block rules |
| `integration/PricingServiceIntegrationTest` (5) | quote math == frontend `pricing.ts` (subtotal 3000, tax 12%, total 3360); percentage promo discounts base before tax; invalid promo code rejected; extras per pricing model (per_stay/per_night/per_person/per_room) |
| `integration/BookingFlowIntegrationTest` (2) | full lifecycle: create (server-priced, inventory sold, outbox row in the same tx) → idempotent retry → lookup by reference+email → capacity CONFLICT → cancel with inventory release → staff payment create + capture → invoice → overpayment VALIDATION |
| `integration/GraphqlApiIntegrationTest` (15) | real HTTP + real Spring Security: discovery; quote/book/lookup/idempotent duplicate; auth flows; staff hotel-scoping (`FORBIDDEN`); payments owner-or-staff; anonymous cancel of account-backed booking; register enumeration; availability honors `rooms`; `RATING_DESC`; `checkInTime` serialization; idempotent invoice |
| `integration/RestApiIntegrationTest` (4) | REST endpoints: reservation self-service (ref+email), cancel, invoice; auth-required enforcement |
| `media/adapter/rest/MediaUploadIntegrationTest` (13) | multipart upload/delete over REST: bytes + metadata + GraphQL visibility; primary replacement without leftovers; auth-required; invalid MIME; executable bytes; oversized; traversal filenames; owner-scoped authorization (guest → 403, staff of the hotel → ok, staff of another hotel → 403, platform media → super_admin only) |
| `admin/adapter/graphql/AdminGraphqlIntegrationTest` (18) | back-office: hotel/room-type/room/rate-plan/promotion/inventory CRUD, staff scoping, audit entries, idempotent pricing ranges, inventory floor conflict |
| `platform/adapter/graphql/PlatformGraphqlIntegrationTest` (12) | platform hero/featured content + admin content-block management |
| `identity/adapter/security/AuthRateLimitIntegrationTest` (3) | per-IP rate limit on REST login/register AND GraphQL login/register mutations (429); ordinary GraphQL traffic never limited |
| `integration/HotelPlatformApplicationTests` (1) | context loads |

### Security scenarios exercised over real HTTP

Anonymous payment, cross-user payment, cross-hotel staff, account-backed
cancel binding, register enumeration, admin scope, media IDOR — all assert
GraphQL `extensions.code` (`UNAUTHORIZED` / `FORBIDDEN` / `VALIDATION`).

## Context support

- `integration/TestcontainersConfiguration` — shared Postgres + Kafka
  containers (`@ServiceConnection`), public for reuse.
- `integration/TestFixtures` — seeds a bookable hotel: one room type
  (maxAdults 2), refundable BB rate plan, nightly price 1000.00, inventory
  of 3 rooms/night × 30 days, 12% VAT — mirrors the frontend demo fixture.

## Determinism

- Fixed fixtures, frozen reference data, explicit dates (no
  `LocalDate.now()` drift in assertions).
- Unique emails/idempotency keys per run; no sleeps, no fixed ports.
- Container reuse: surefire reuses the fork; contexts are cached across
  classes sharing the same configuration.

## Coverage & gates

- The **module gate** (ArchUnit) runs with `./mvnw test` — a cross-module
  import outside an `api` package fails the build.
- JaCoCo/Spotless/OWASP dependency-check are **not wired into the build**
  yet (documented recommendations in `../audits/BACKEND_FINAL_AUDIT.md`);
  do not claim they run.