---
name: backend-project-facts
description: Facts about the Hotel Collection hotel backend — stack, build commands, schema location, provider abstraction rules, Kafka posture, testing constraints, and the domain-complete lifecycle gate. Use when implementing or reviewing any feature of backend-hotel.
---

# Backend Project Facts

Single source of truth for engineering rules: `backend-hotel/AGENTS.md`. The existing schema reference lives at `database/collection-schema.sql` (Oracle dialect — read-only; a dedicated database phase adapts it to PostgreSQL).

## Stack (fixed)

- Java 21 (Temurin, `JAVA_HOME` set in `~/.zshrc`), Spring Boot 4.1.0, Maven wrapper (`./mvnw`)
- PostgreSQL (runtime + Testcontainers), Spring Data JPA/Hibernate, Flyway, Spring Security, Spring Web (MVC), Apache Kafka, Testcontainers, OpenAPI
- External: Cloudinary (media), Resend (email) — behind provider abstractions

## Invariants (never regress)

1. **No H2** — persistence integration tests run on real PostgreSQL via Testcontainers, with Flyway applied.
2. **Flyway owns the schema** — no `ddl-auto: update`; migrations immutable once merged.
3. **Provider abstraction** — services depend on `*Provider` interfaces (`MediaStorageProvider`, `EmailProvider`, `PaymentProvider`, `SmsProvider`); vendor SDKs only inside provider implementations.
4. **Kafka is infrastructure** — events record facts; idempotency, retries, DLQ, outbox designed deliberately.
5. **Multi-hotel isolation** — every hotel-scoped resource is authorized at hotel level; cross-hotel access is a blocker.
6. **Stable API contract** — the frontend consumes this API; DTOs, validation, consistent error envelope, OpenAPI documentation are mandatory.
7. **Domain complete ≠ compiles** — a feature passes only the full lifecycle: implementation → unit → integration (Testcontainers) → API → security review → database review → code review → documentation → final test. Run `/domain-review`.

## Commands

- `./mvnw compile` · `./mvnw test` (Testcontainers) · `./mvnw verify` · `./mvnw spring-boot:run`
- Docker available for Testcontainers; dev services via `docker compose` (added in the devops phase)

## Files of truth

- `backend-hotel/pom.xml` — dependencies (starters: webmvc, data-jpa, flyway, kafka, security, validation, actuator; testcontainers-postgresql/kafka in test scope)
- `backend-hotel/src/test/java/com/hotelcollection/hotel/TestcontainersConfiguration.java` — shared Postgres + Kafka containers
- `backend-hotel/src/main/resources/application.yaml` — minimal; env-driven config comes later
- `database/collection-schema.sql` — existing schema (Oracle dialect, 756 lines) — review reference only
- `frontend-hotel/` — the API consumer; contract changes must be coordinated there