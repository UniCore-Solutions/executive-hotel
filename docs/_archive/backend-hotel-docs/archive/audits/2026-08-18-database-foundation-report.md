# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Database Foundation Report

**Scope:** PostgreSQL schema (from `database/collection-schema-postgresql.sql`) integrated into the Spring Boot project as Flyway migrations, verified end-to-end on real PostgreSQL 16.

---

## 1. Schema audit: PASS

Three review rounds (review v2 → final correction pass → final gate). Final gate's only blocker fixed; 48 tables, 82 FKs, 115 CHECKs, 76 UNIQUEs, 0 redundant indexes verified by audit queries on a real PostgreSQL 16.

## 2. Flyway migrations: PASS

Files created in `backend-hotel/src/main/resources/db/migration/`:

| File | Contents |
|---|---|
| `V1__reference_data.sql` | countries, currencies, languages, cancellation_reasons |
| `V2__identity_rbac.sql` | users, roles, permissions, role_permissions, user_roles |
| `V3__catalog.sql` | hotels, user_roles hotel FK, room_types, rooms, experiences, restaurants, faqs, extras, media + junctions |
| `V4__pricing_promotions.sql` | rate_plans, room_type_rate_plans, rate_plan_prices + EXCLUDE, rate_restrictions, promotions, eligibility junctions, tax_fee_types |
| `V5__inventory.sql` | availability |
| `V6__booking.sql` | guests, reservations, reservation_rooms, reservation_guests, reservation_extras, reservation_charges, status history, cancellations |
| `V7__billing_stay.sql` | payments, payment_transactions, invoices, invoice_items, check_ins |
| `V8__reviews_notifications_events_audit.sql` | reviews, notification_templates, notifications, event_outbox, event_consumption, audit_logs |

## 3. Clean PostgreSQL database migration: PASS

Fresh `postgres:16-alpine` container, empty DB (0 tables confirmed) → app startup applied all 8 migrations: "Successfully applied 8 migrations … now at version v8"; `flyway_schema_history` shows 8 rows, all `success=true`.

## 4. PostgreSQL verification: PASS

Verified by query on the migrated DB:

- **Tables:** 48
- **Foreign keys:** 82 (22 composite)
- **Constraints:** 115 CHECK + 76 UNIQUE + 111 PK + 1 EXCLUDE
- **Indexes:** 83 non-PK
- **Extensions:** `btree_gist` + `pgcrypto` present

## 5. Flyway validate: NOT EXPLICITLY TESTED

Every run migrated a fresh empty DB; the app was never started a second time against an already-migrated database, so checksum validation of applied migrations was not explicitly exercised (Flyway's default validate-on-migrate only trivially ran).

## 6. Spring Boot connection/startup: PASS

"Started HotelPlatformApplication in 4.722 seconds" against the migrated container DB; also started successfully in every Testcontainers test run.

## 7. Hibernate schema validation: NOT TESTED

By design — `spring.jpa.hibernate.ddl-auto: none` (Flyway owns the schema, AGENTS.md rule); no entity classes exist yet, so there is nothing for Hibernate to validate.

## 8. Database/integration tests: PASS

`./mvnw clean test` → 16/16 pass, BUILD SUCCESS. Important tests executed:

- `flywayAppliedAllEightMigrations`, `databaseContainsExpectedTablesAndExtensions` (48 tables, both extensions)
- Cross-hotel rejection: room→room_type, junction pairing, reservation extras hotel pin (C1)
- `overlappingPriceRangesAreRejected` (EXCLUDE, C2)
- `reservationRoomMustUseOfferedRoomRateCombination` (offer FK, C3)
- Currency pins: junction↔rate plan, price↔junction (C8)
- `reservationTotalsMustBeConsistent`, `roomLineNightsMustEqualDates` (C16)
- `checkInCannotReferenceNonexistentReservation`, `paymentProviderReferenceIsUniquePerProvider` (C17), `ratePlanMaxStayCannotBeBelowMinStay`, `mediaMustHaveExactlyOneOwner` (C4)
- Earlier audit round: 25/25 smoke tests on fresh DB (pre-split)

## 9. Problems found

- `check_ins.reservation_id` orphan hole (FK could be vacuously satisfied) — final gate blocker
- C8 currency pin missing entirely (price rows could drift currency)
- Missing `chk_rate_plans_stay_range` / `chk_rate_restrictions_stay_range` checks
- Missing offer FK on `reservation_rooms` (unoffered room/rate pairs insertable)
- `reservation_extras.hotel_id` not pinned to reservation's hotel
- 6 redundant indexes duplicating UNIQUE constraints; `idx_media_hotel` missing
- No `pgcrypto` extension / `gen_random_uuid()` default for `event_outbox.event_id`
- Test fixture bug: identity sequences survive rollback, breaking hardcoded ids after the first test
- Doc drift: `docs/database.md` split table listed `audit_logs` in V2 and wrong V8 name

## 10. Problems fixed

- Added `fk_check_ins_reservation` direct FK to `reservations`
- Added C8 pin: `UNIQUE(hotel_id, id, currency_code)` on rate_plans + composite FKs on junction and prices
- Added both stay-range CHECKs
- Added `fk_reservation_rooms_rate_offer`; added `fk_reservation_extras_reservation_hotel`
- Removed 6 redundant indexes; added `idx_media_hotel`; normalized FK column order; added `pgcrypto` + `gen_random_uuid()` default
- ADR-001 updated with decisions 6–10
- Test fixture rewritten with `OVERRIDING SYSTEM VALUE` explicit ids
- Docs corrected (V8 name, audit_logs placement, schema header status)

## 11. Remaining blockers: NONE

## 12. Files created/modified

- **Created:** 8 Flyway migrations, `application.yaml` (datasource + Flyway), `docker-compose.yml` (PG16 + Kafka), `DatabaseIntegrityIntegrationTest.java`
- **Modified:** `database/collection-schema-postgresql.sql` (locked source of truth, corrections + status header), `docs/database.md`, `docs/decisions/ADR-001-postgresql.md`
- (Separate rebrand: Riad Collection → Hotel Collection across backend/frontend, incl. package `com.hotelcollection.hotel`)

---

## FINAL STATUS: DATABASE FOUNDATION COMPLETE

Items 5 and 7 marked NOT TESTED as stated above; nothing in either blocks the foundation — item 5 can be closed with one restart of the app against an existing DB when convenient.