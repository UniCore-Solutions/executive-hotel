# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# BACKEND DOMAIN & GRAPHQL IMPLEMENTATION REPORT

Status: **implemented and verified** — `./mvnw test` green (31 tests), entity
mappings validated against all 48 schema tables at boot
(`ddl-auto: validate`). Platform: Spring Boot 4.1.0 / Java 21 / PostgreSQL 16
/ Flyway / GraphQL / Spring Security / Kafka + Testcontainers.

---

## 1. Scope delivered

- **GraphQL-first API** (single `POST /graphql`) covering the frontend
  product surface: hotel discovery & details, room types, experiences /
  restaurants / FAQs / extras, promotions, reviews, **availability check**,
  **rates**, **quote**, **booking create** (accountless + idempotent),
  **reservation lookup by reference + email**, **cancel** (policy-driven
  penalties), **payment create + capture**, **invoice**, **reviews**,
  register/login/me, and **admin views** (`adminReservations`, `adminHotel`).
- **Domain layer** (`application/`) with all business rules
  server-side-authoritative (see `backend-invariants.md`): nightly-rate
  pricing, taxes/fees, promos, cancellation math, conservative occupancy,
  inventory locking, overpayment guard, one-invoice-per-reservation.
- **Transactional outbox → Kafka** for `booking.confirmed` /
  `booking.cancelled` / `booking.paid` with atomic claim, retries, and
  failed-state DLQ.
- **Security**: stateless JWT, anonymous accountless booking flow,
  hotel-scoped staff authorization (IDOR → `FORBIDDEN`).
- **Documentation** (`backend-hotel/docs/`): `backend-domain-requirements.md`
  (requirements → implementation + tests), `backend-architecture.md`,
  `backend-domain-requirements.md`, `domain-model.md`, `backend-invariants.md`,
  `graphql-api.md`.

## 2. How requirements map to implementation

Full traceability table in `docs/backend-domain-requirements.md` (R1–R37).
Highlights:

| Frontend behavior | Backend implementation |
|---|---|
| `taxesRate: 0.12` demo | 12% `percentage` `TaxFeeType` per hotel; engine supports all 4 calculation methods |
| `computeRefundAmount` cancellation rules | `CancellationPolicy`: non-refundable → full; free-cancel window → 0; past deadline → `first_night`/`percentage`/`fixed_amount` |
| promo `percent` / `fixed` | `percentage` / `fixed_amount` discount types; `stay_x_pay_y` → VALIDATION (unsupported) |
| `RoomAvailability.status` (`available/few/soldout`) | `AvailabilityService.check` — `few` when min free ≤ 2 |
| `makeReservation` idempotency | UNIQUE `idempotency_key`; duplicate → same reservation + `created: false` |
| reference `RC-XXXXXX` | `ReferenceGenerator`, charset `ABCDEFGHJKMNPQRSTUVWXYZ23456789` |
| "Only X rooms left" | `PESSIMISTIC_WRITE` inventory locking; `CONFLICT` on overbooking |
| my-booking page (reference + email) | `reservation(input)` without auth |
| plan cards (`refundable`, free-cancel badge) | `RatePlan.is_refundable`, `cancellation_deadline_days` surfaced via `rates` |

## 3. Database mapping (48 tables, V1–V8)

- Entities mirror the schema 1:1; **no schema drift** — `ddl-auto: validate`
  is part of the test run.
- PostgreSQL quirks handled:
  - `CHAR(2/3)` bpchar columns → `@JdbcTypeCode(SqlTypes.CHAR)` (15 fields;
    `columnDefinition` alone is insufficient for validate).
  - All CHECK-constrained enum columns → `@Enumerated(EnumType.STRING)` with
    values matching DB text exactly.
- Lifecycle associations only: `Reservation` → `roomLines/extras/charges/
  statusHistory/cancellation` (cascade ALL), `Payment` → `transactions`.
  Composite FKs (`hotel_id`-style) stay plain columns.
- API-exposed collections load eagerly (`@Fetch(SUBSELECT)` / eager joins)
  so resolvers work with `open-in-view: false`.

## 4. Notable implementation decisions

- **Server-side pricing is the source of truth**; client amounts are never
  trusted (C16 totals CHECK enforces identity at the DB too).
- **Booking transaction**: price → lock availability rows → sell → persist
  reservation + lines + charges + history + outbox row atomically.
- **Idempotency everywhere**: booking (`idempotency_key`), capture
  (`(provider, provider_reference)` UNIQUE), invoice (`reservation_id`
  UNIQUE).
- **Auth**: `AuthenticationException` → `UNAUTHORIZED`; hotel-scope violation
  → `FORBIDDEN` — both as stable `extensions.code` GraphQL errors.
- **N+1 elimination** for the frontend list/detail paths via `@BatchMapping`
  DataLoaders backed by batched SQL (`minPriceByHotelIds`,
  `findByIdsWithAmenities`, media-by-owner).

## 5. Testing (31 tests, Testcontainers: real PostgreSQL + Kafka)

| Suite | Covers |
|---|---|
| `CancellationPolicyTest` (5, unit) | all 5 cancellation branches incl. percentage penalty |
| `PricingServiceIntegrationTest` (3) | quote math vs frontend (12% tax), promo discount, invalid promo |
| `BookingFlowIntegrationTest` (1, e2e) | create → inventory sold → outbox row → idempotent retry → lookup → 4th booking CONFLICT → cancel (free window) → cancel (first-night penalty) → pay+capture → invoice → overpayment rejected |
| `GraphqlApiIntegrationTest` (6, real HTTP) | anonymous discovery/quote/booking/lookup/idempotency, `UNAUTHORIZED`, register/login/me, admin hotel-scope + staff success |
| `DatabaseIntegrityIntegrationTest` (15) | every entity ↔ table under validate |
| `HotelPlatformApplicationTests` (1) | context + GraphQL schema load |

## 6. Gaps & honest notes (by design or deferred)

1. **`invoice(id)`** schema field exists but is answered with VALIDATION
   guidance — invoices are exposed through the reservation flow only.
2. **`stay_x_pay_y`** promos: rejected with VALIDATION (schema C9/C10 only
   permit `percentage|fixed_amount`).
3. **Rating aggregates** are computed per request — `hotels` has no rating
   columns.
4. **Payment gateway**: `mock` provider; the `PaymentProvider` port is the
   seam for a real gateway.
5. **Admin** is read-only (no hotel/rate-plan/inventory CRUD); `adminHotel`
   returns a 30-day availability window.
6. **`AdminHotel.availability`** and admin reservation list load via
   subselect/eager patterns — revisit with DTO projections if admin usage
   grows.
7. **Toolchain note**: Boot 4.1's `spring-boot-graphql-test`
   (WebTestClient HTTP tester) cannot activate in this module layout
   (`AutoConfigureWebTestClient` missing from published jars) — HTTP tests
   use `java.net.http.HttpClient`, which is equally valid coverage.
8. Flyway validate on an **already-migrated** database was not re-exercised
   in this phase (fresh-container only) — see
   `database-foundation-report.md`.

## 7. How to run

```bash
export JAVA_HOME="$HOME/.local/share/jdk/jdk-21.0.12+8"
export PATH="$JAVA_HOME/bin:$PATH"
./mvnw test          # 31 tests, Testcontainers PostgreSQL + Kafka
./mvnw spring-boot:run   # dev server; GraphiQL at /graphiql
```
