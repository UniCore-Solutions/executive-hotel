# Hotel Collection — Backend (hotel-platform)

Spring Boot backend for the **Hotel Collection** hotel platform (multi-hotel):
catalog & discovery, pricing/quoting, availability, bookings (accountless +
idempotent), payments & invoices, reviews, notifications via transactional
outbox → Kafka, and a back-office admin surface — exposed through a GraphQL
API with an approved REST split for guest write flows and media.

## Technology stack

Java 21 · Spring Boot 4.1 · Spring Data JPA / Hibernate · PostgreSQL 16
(Flyway V1–V18, `ddl-auto: validate`) · Spring Security (stateless JWT) ·
Kafka (transactional outbox) · GraphQL (Spring for GraphQL, depth-limited) ·
Testcontainers (real PostgreSQL + Kafka in tests) · Maven wrapper.

## Repository structure

```
backend-hotel/
├── src/main/java/com/hotelcollection/hotel/  16 domain modules + shared
│   ├── admin/  availability/  billing/  catalog/  eventing/
│   ├── identity/  media/  notification/  platform/  rate/
│   ├── reference/  reservation/  review/  audit/  shared/
├── src/main/resources/graphql/               the GraphQL schema (per module)
├── src/main/resources/db/migration/          Flyway migrations V1__…V18__
├── src/test/java/                            unit + ArchUnit + integration
├── docs/                                     documentation (see below)
├── scripts/seed-db.sh + seed.sql             demo seed data
├── postman/                                  Postman collection + local env
├── docker-compose.yml                        local PostgreSQL + Kafka
└── AGENTS.md                                 AI-agent operational guide
```

Each module is hexagonal: `api/` (use-case interfaces), `application/`
(services), `domain/` (entities + ports), `adapter/` (persistence, graphql,
rest, security). Cross-module imports go through `<module>/api` only —
enforced by ArchUnit (`ModuleArchitectureTest`, runs in `./mvnw test`).

## Prerequisites

- JDK 21 (Temurin; `JAVA_HOME` is set in `~/.zshrc`)
- Docker (Testcontainers + local services)
- Maven wrapper included — no system Maven needed

## Run locally

```bash
docker compose up -d                                   # PostgreSQL 16 + Kafka
JWT_SECRET=$(openssl rand -hex 32) ./mvnw spring-boot:run
```

`JWT_SECRET` is **required** — the app refuses to start without a strong
secret. GraphiQL is available at `http://localhost:8080/graphiql` in the
default `dev` profile (deployments must run
`SPRING_PROFILES_ACTIVE=prod`).

## Run tests

```bash
./mvnw test        # 109 tests: unit, ArchUnit module gate, Testcontainers
                   # integration (real PostgreSQL + Kafka, no H2)
```

## Access the API

- GraphQL: `POST http://localhost:8080/graphql` — schema in
  `src/main/resources/graphql/`, docs in `docs/api/graphql.md`
- REST splits: `/api/v1/auth/**`, `/api/v1/reservations/**`, `/api/v1/media/**`
- Health probes: `/actuator/health`, `/actuator/health/readiness|/liveness`
- Metrics: `/actuator/prometheus`
- Demo data: `./scripts/seed-db.sh` (3 hotels, rate plans, promos, extras)

## Configuration

Everything is environment-driven; `.env.example` documents every variable
(DB, Kafka, `JWT_SECRET`, media path, CORS, outbox). Full reference:
`docs/operations/configuration.md`.

## Development workflow

1. `docker compose up -d` for local services (tests use Testcontainers and
   do not need this).
2. Make changes; follow the module rules in `AGENTS.md`.
3. `./mvnw test` — the quality gate (includes the ArchUnit module gate).
4. Migrations are versioned and immutable once merged; schema is
   Flyway-owned (`ddl-auto: validate`).

## Documentation

- **AI-agent guide**: [`AGENTS.md`](AGENTS.md)
- **Documentation index**: [`docs/README.md`](docs/README.md) — architecture,
  API, security, development, operations, audits, archive

## Related projects

- `../database/collection-schema.sql` — the existing (Oracle-dialect) schema
  that the PostgreSQL foundation was adapted from (read-only reference)
- `../frontend-hotel/` — the guest-facing consumer of this API (currently
  mock-based; contract matrix in `docs/api/frontend-contract.md`)