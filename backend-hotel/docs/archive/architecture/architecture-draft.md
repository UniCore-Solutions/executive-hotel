# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Backend Architecture

> STATUS: DRAFT — proposed architecture, pending human approval. No implementation exists yet.

## 1. Technology stack

| Layer | Choice |
|---|---|
| Language | Java 21 (Temurin) |
| Framework | Spring Boot 4.1.0 (parent), Spring Web (MVC) |
| Persistence | Spring Data JPA / Hibernate 6+, PostgreSQL 16+ |
| Migrations | Flyway (PostgreSQL module) |
| Security | Spring Security (stateless JWT) |
| Events | Spring Kafka (Apache Kafka), transactional outbox |
| Validation | Jakarta Bean Validation (spring-boot-starter-validation) |
| API docs | springdoc-openapi (OpenAPI 3, Swagger UI) |
| Tests | JUnit 5, Mockito, AssertJ, Testcontainers (postgresql + kafka), spring-security-test, spring-kafka-test |
| Build | Maven wrapper 3.9.16, Spring Boot parent, JDK 21 |
| Ops | Spring Boot Actuator, structured logs, Micrometer (Prometheus later) |
| Providers | Cloudinary (media), Resend (email); payment/SMS ports reserved |

## 2. Module / package structure (evaluated and refined)

The suggested structure (`common, platform, identity, hotel, room, availability, pricing, promotion, guest, reservation, payment, invoice, checkin, review, media, notification, audit`) is domain-oriented but **too fragmented**: `room`/`availability`/`pricing`/`promotion` are one product-pricing continuum; `payment`/`invoice` are one billing module; `checkin`/`review` are stay lifecycle. Final structure — **domain modules, each internally layered**:

```
com.hotelcollection.hotel
├── common/                  shared: error envelope, pagination, money/currency, time,
│                            correlation ids, validation utilities, base config
├── catalog/                 hotels, room_types, rooms, amenities, media, experiences,
│                            restaurants, extras, faqs        (the sellable product)
├── identity/                users, roles, permissions, RBAC, authentication, authorization
│   └── security/            Spring Security config, JWT, hotel-scope resolver
├── pricing/                 rate_plans, room_type_rate_plans, rate_plan_prices,
│                            rate_restrictions, promotions, tax_fee_types
├── inventory/               availability (counts, holds, release)
├── booking/                 guests, reservations, reservation_rooms/guests/extras/charges,
│                            status history, cancellations, hold expiry
├── billing/                 payments, payment_transactions, invoices, invoice_items
├── stay/                    check_ins, checkouts
├── reviews/                 reviews + moderation
├── notification/            notifications, EmailSender port
├── audit/                   audit log writer + aspect
├── events/                  event contracts, outbox table access, outbox relay, Kafka config
├── integration/             provider ports (interfaces) + @ConfigurationProperties
├── infrastructure/          JPA repository implementations, vendor adapters
│   └── provider/            CloudinaryProvider, ResendEmailProvider, (PaymentProvider…),
│                            SmsProvider — vendor SDKs confined here
└── web/                     REST controllers, global exception handler, OpenAPI config
    └── v1/                  controllers per module (catalog, booking, billing, …)
```

### Internal layering (same in every module)

| Layer | Contents | Responsibility |
|---|---|---|
| `api` (web) | controllers, DTOs (records), mappers | HTTP mapping, validation, response shaping — no business logic |
| `application` | application services, use cases, transactions | orchestration, transaction boundaries, ports called |
| `domain` | entities, value objects, domain services, repository interfaces | business rules and invariants — framework-light |
| `infrastructure` | JPA repository impls, Kafka clients, provider adapters | technology — no business logic |

Dependency rule (enforced by ArchUnit): `web → application → domain`; `infrastructure → domain`; `integration`/`infrastructure` are depended upon only through their interfaces. Nothing imports vendor SDKs outside `infrastructure/provider`.

## 3. Request lifecycle

```
HTTP request
  → Security filter chain (JWT auth, hotel-scope principal)
  → Controller (validates DTO, maps to command/query)
  → Application service (@Transactional where writes)
      → Domain logic / repository interface
      → Outbox write (same transaction) when the use case emits events
      → Provider ports where needed (email/media/payment)
  → Response DTO mapped, correlation id in MDC + X-Trace-Id header
  → Errors: @RestControllerAdvice → standard error envelope
```

Writes that must emit events: **DB transaction + outbox row → commit → outbox relay publishes to Kafka → consumers (e.g. notification service) act**. Synchronous vendor calls (email) are NOT made inside the transaction; they are queued via outbox/notifications.

## 4. Database architecture

See [database.md](database-design.md). Summary: PostgreSQL 16+, Flyway-versioned schema per §11 there, cross-hotel integrity via composite FKs, EXCLUDE constraint for pricing ranges, NUMERIC money, BIGINT identity, JSONB where needed, TIMESTAMPTZ.

## 5. Event architecture

See [events.md](events-design.md). Kafka for domain facts → notifications/downstream; outbox for reliability; DLQ + idempotency; no Kafka in CRUD.

## 6. Security architecture

See [security.md](security-design.md). JWT for staff + guest accounts; capability tokens for reference-based guest flows; RBAC with hotel-scoped roles; every hotel-scoped use case checks principal hotel membership (IDOR blocker).

## 7. Testing architecture

See [testing.md](../development/testing.md). Testcontainers PostgreSQL + Kafka; no H2; unit → integration → API → security layers; ArchUnit architecture tests; JaCoCo.

## 8. External integrations

See [integrations.md](integrations-design.md). Ports (`EmailProvider`, `MediaStorageProvider`, `PaymentProvider`, `SmsProvider`) in `integration`; vendor adapters in `infrastructure/provider`; webhook signature verification; idempotent webhook handling.

## 9. API architecture

See [api-guidelines.md](../../api/api-guidelines.md). `/api/v1`, standard error envelope, page-based pagination, stable DTO contract, springdoc.

## 10. Observability (MVP)

- Actuator: `/actuator/health` (liveness + readiness), `/actuator/info`; exposed endpoints limited.
- Structured logging: JSON lines (timestamp, level, logger, message, traceId, userId, hotelId) — no PII.
- Correlation: `X-Trace-Id` request header or generated UUID → MDC → logs + error envelope.
- Metrics: Micrometer counters/timers for key paths (bookings created, provider calls, Kafka lag via consumer metrics) — Prometheus endpoint enabled; dashboards later.
- Error logging: WARN for handled domain errors, ERROR for unexpected + stack trace, correlated.

## 11. Documentation strategy

- `docs/` files are written incrementally per domain during `/domain-review`; never ahead of work.
- Significant decisions → `docs/decisions/ADR-*.md` (index in README).
- API docs: springdoc generates; `docs/api.md` mirrors the contract (added when endpoints exist).

## 12. Architecture decisions requiring approval

| # | Decision | ADR |
|---|---|---|
| A-1 | Domain modules with internal layering (not one layer per technology) | (this doc) |
| A-2 | BIGINT identity everywhere (no UUID) | ADR-005 |
| A-3 | PostgreSQL as the only persistence (no H2 ever) | ADR-001 |
| A-4 | Events via outbox; Kafka only for cross-cutting facts | ADR-002 |
| A-5 | Cloudinary behind MediaStorageProvider | ADR-003 |
| A-6 | Resend behind EmailProvider | ADR-004 |
| A-7 | JWT + capability tokens; hotel-scoped RBAC | ADR-007 |
| A-8 | Composite-FK cross-hotel integrity in DB | ADR-001 (schema) |
| A-9 | No `domains` brand table at this stage | database.md D-1 |
| A-10 | ArchUnit + Spotless + JaCoCo + OWASP dependency-check enabled | development.md |

