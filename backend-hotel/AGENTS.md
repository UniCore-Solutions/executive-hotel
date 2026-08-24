# AGENTS.md — hotel-platform (backend)

Spring Boot backend for the **Hotel Collection** hotel platform (multi-hotel). Java 21, Maven, PostgreSQL, JPA/Hibernate, Flyway, Spring Security, Kafka, Testcontainers. This repo — engineering; `../database/collection-schema.sql` — the existing (Oracle-dialect) schema that a future database phase will adapt to PostgreSQL; `../frontend-hotel/` — the consumer of this API.

## Commands

| Command                     | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `./mvnw compile`            | compile                                        |
| `./mvnw test`               | unit + integration tests (Testcontainers)      |
| `./mvnw verify`             | full build gate                                |
| `JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run` | local dev server (**JWT_SECRET is required** — no default) |
| `docker compose up -d`      | local dev services (PostgreSQL 16.4-alpine, Kafka) |

Requires JDK 21 (`JAVA_HOME` is set in `~/.zshrc` to the Temurin 21 install).
The default Spring profile is `dev` (GraphiQL on); deployments must run with
`SPRING_PROFILES_ACTIVE=prod` (GraphiQL off, fail-fast JWT secret check).

## Architecture in one screen

Modular monolith with hexagonal modules (ADR-008). Each module owns its
domain and exposes use-case interfaces via `<module>/api` (cross-module
imports go through `api` only — enforced by ArchUnit):

```
src/main/java/com/hotelcollection/hotel/
  admin/        back-office facade: dashboard aggregation, admin reports
  audit/        audit_logs write/read
  availability/ single inventory source (C9): availability rows + capacity
  billing/      payments (create/capture, balance checks, invoice issuance)
  catalog/      hotels, room types, rooms, extras, amenities, media owners
  eventing/     transactional outbox relay + Kafka publisher (ADR-002)
  identity/     users, roles, JWT (ADR-007), Spring Security chain, rate limit
  media/        multipart upload/delete (REST — approved split), binary storage
  notification/ email/SMS templates + outbound notifications (outbox-driven)
  platform/     platform hero/featured content blocks
  rate/         rate plans, prices, promotions, quote/pricing engine
  reference/    countries, currencies, cancellation reasons
  reservation/  booking lifecycle: create (idempotent, server-priced), lookup,
                cancel, status history, inventory release
  review/       reviews + moderation + proof-of-stay
  shared/       exception taxonomy, validation, pagination, graphql config,
                web utils (no domain)
src/main/resources/graphql/schema.graphqls   the API contract (GraphQL only)
src/main/resources/db/migration/             Flyway migrations (V1__…V18__)
src/test/java/   unit tests (JUnit 5 + AssertJ) + ArchUnit (ModuleArchitectureTest)
                 integration tests (Testcontainers: real PostgreSQL 16 + Kafka)
```

## Documentation knowledge hierarchy

```
AGENTS.md  (this file — operational rules)
    ↓
docs/README.md  (documentation index — every link valid)
    ↓
docs/architecture/  architecture.md, persistence.md, invariants.md,
                    domain-requirements.md, decisions/ (ADR-00x)
docs/api/           graphql.md, api-guidelines.md (REST), frontend-contract.md
docs/security/      security.md
docs/development/   setup.md, testing.md
docs/operations/    configuration.md
docs/audits/        BACKEND_FINAL_AUDIT.md (+ this cleanup report)
docs/archive/       HISTORICAL ONLY — previous phases/proposals/reports;
                    never treat as current (archive/README.md explains)
```

Before changing behavior: read `docs/architecture/invariants.md` (the
non-negotiable rules) and `docs/architecture/architecture.md`. When a
decision matters, record it as an ADR in `docs/architecture/decisions/`.

Within a module: `api/` (use-case interfaces + I/O records), `application/`
(services), `domain/` (entities + ports), `adapter/` (persistence, graphql,
rest, security). Business services depend on abstractions, never on vendor
SDKs:

```
MediaStorageProvider ← LocalFilesystemMediaStorageProvider (Cloudinary future)
EmailProvider ← (future impl)          PaymentProvider ← (mock provider)
```

## Rules (do not violate)

1. **PostgreSQL only, no H2.** Persistence integration tests use Testcontainers with a real `postgres` container, Flyway, and JPA. Never substitute H2.
2. **Flyway owns the schema.** No `ddl-auto: update` in any environment. Migrations are versioned (`V1__…`), immutable once merged; schema review happens before implementation.
3. **The existing schema is Oracle-oriented.** Never blind-convert Oracle SQL. A dedicated database phase adapts `../database/collection-schema.sql` to PostgreSQL, then produces Flyway migrations. Review before converting.
4. **Vendor abstraction.** No Cloudinary/Resend/etc. SDK calls outside provider implementations behind `*Provider` interfaces. Services depend on the interface.
5. **Kafka is infrastructure, not application logic.** Synchronous flows stay synchronous; events publish facts. Idempotency, retries, DLQ, and outbox patterns are designed deliberately, never bolted on.
6. **Multi-hotel isolation.** Every hotel-scoped resource must be authorized at the hotel level (RBAC + hotel scoping). IDOR across hotels is a blocker.
7. **Clean, stable API contract.** GraphQL is the primary API (schema in
   `src/main/resources/graphql/`); REST exists only for the approved splits
   (`/api/v1/auth/**`, `/api/v1/reservations/**`, `/api/v1/media/**`).
   Consistent error taxonomy (`NOT_FOUND | FORBIDDEN | CONFLICT | VALIDATION
   | UNAUTHORIZED`), pagination conventions, server-side validation. The
   frontend consumes this contract.
8. **Domain complete ≠ compiles.** A feature is complete only after: implementation → unit tests → integration tests (Testcontainers) → API tests → security review → database review → code review → documentation → final test all pass. Use `/domain-review`.
9. **Verify before done.** After meaningful changes run `./mvnw test` and fix everything red. Tests must be deterministic.
10. **No secrets in code or config.** Secrets come from environment variables. `.env*` files are never committed.

## Key files to know

- `pom.xml` — Spring Boot 4.1.0 parent, Java 21; starters: webmvc, data-jpa, flyway, kafka, security, validation, actuator; micrometer-registry-prometheus; Testcontainers (postgres 16.4, kafka 3.9.1) in test scope
- `src/main/resources/application.yaml` — env-driven config; `JWT_SECRET` required; `application-dev.yaml` (GraphiQL), `prod` profile (GraphiQL off)
- `src/test/java/com/hotelcollection/hotel/integration/TestcontainersConfiguration.java` — shared Postgres + Kafka containers (`@ServiceConnection`, public for reuse)
- `src/test/java/com/hotelcollection/hotel/architecture/ModuleArchitectureTest.java` — module gate (7 ArchUnit rules); do not add cross-module imports outside `api` packages
- `../database/collection-schema.sql` — the existing schema (Oracle dialect, read-only reference)

## OpenCode project system

`.opencode/` holds project agents (`agents/*.md`), commands (`commands/*.md`), skills (`skills/*`), and `opencode.json`. The primary agent (`build`) implements; review agents (`architect`, `database`, `testing`, `security`, `api-docs`, `code-reviewer`, `devops`, `kafka`, `integration`) are read-only specialists used as gates. Use `/verify` and `/domain-review` for the quality gates. Changes to `.opencode/` require an opencode restart.