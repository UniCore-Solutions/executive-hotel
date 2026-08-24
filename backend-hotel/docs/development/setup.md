# Development — Setup & Conventions

How to set up, run, and work on this project. For tests, see
[`testing.md`](testing.md).

## 1. Prerequisites

- JDK 21 (`JAVA_HOME` set in `~/.zshrc` to the Temurin 21 install)
- Docker (Testcontainers; `docker compose` for local services)
- No system Maven required — the wrapper `./mvnw` is used everywhere

## 2. Commands

| Command | Purpose |
|---|---|
| `./mvnw compile` | compile |
| `./mvnw test` | full unit + integration suite (Testcontainers) — the quality gate |
| `./mvnw verify` | package + tests (no extra gates wired yet — see §3) |
| `./mvnw spring-boot:run` | local dev server (GraphiQL on in the `dev` profile) |
| `docker compose up -d` | local PostgreSQL 16.4 + Kafka 3.9.1 |
| `JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run` | dev server (**JWT_SECRET is required** — no default, fail-fast) |

## 3. Code quality gates — actual state

| Tool | Scope | Actual state |
|---|---|---|
| ArchUnit (`ModuleArchitectureTest`, 7 rules) | module boundaries, domain purity, acyclic module API graph, adapter cleanliness, resolver placement, ctor-dependency limit | **enabled** — runs in `./mvnw test`; do not add cross-module imports outside `api` packages |
| Spotless / Checkstyle | formatting | **not enabled** (documented recommendation only) |
| JaCoCo | coverage | **not enabled** (documented recommendation only) |
| OWASP dependency-check | vulnerability scan | **not wired** (CI item once a repository/CI exists) |

## 4. Java conventions

- Records for DTOs/value objects (module `api/` packages); sealed types where
  a closed hierarchy is real; no `@Data` on JPA entities (identity-based
  equality).
- Bean Validation on all request DTOs; one error taxonomy
  (`NOT_FOUND | FORBIDDEN | CONFLICT | VALIDATION | UNAUTHORIZED`) mapped by
  the shared exception advice — see `../api/graphql.md`.
- No `System.out`; SLF4J with MDC context (`traceId`, `userId`, `hotelId`).
- Transactions on application-service boundaries (`readOnly = true` for
  reads); no external calls inside DB transactions (outbox pattern instead).
- Null handling: `Optional` at boundaries; `@NotNull` on required inputs; no
  silent nulls across service boundaries.
- Entities carry no business logic except value-safe helpers
  (`sell()`, `release()`, `MoneyUtil`); pure domain rules are plain classes
  unit-tested without Spring.

## 5. Configuration & environment

- `application.yaml` + profiles (`dev` default, `test`, `prod`); secrets only
  via environment variables. `prod` profile: GraphiQL off, fail-fast secret
  check.
- Flyway owns the schema (`spring.flyway.enabled=true`,
  `spring.jpa.hibernate.ddl-auto: validate` in all environments — drift
  fails the build). **No new table** outside a new Flyway migration.
- Dev DB: Docker Compose (PostgreSQL 16.4-alpine); test DB: Testcontainers
  (same pinned images).
- `.env.example` documents all environment variables — real `.env` is never
  committed (`.gitignore`). Full variable reference:
  `../operations/configuration.md`.

## 6. Engineering workflow

Every domain follows the lifecycle gate `/domain-review`: architecture →
database → implementation → unit → integration → API → security → database
re-review → code review → documentation → final test → **DOMAIN COMPLETE**.
Compiling is not completion; verify with `./mvnw test` after meaningful
changes.

## 7. Git and CI (planned)

- Repository: not yet created. Conventional commits; migrations reviewed
  before merging.
- CI (GitHub Actions when the repo exists): `./mvnw verify` with a
  Testcontainers job; dependency scan; artifact build.