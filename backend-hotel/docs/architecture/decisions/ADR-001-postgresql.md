# ADR-001: PostgreSQL as the persistence database

- Status: proposed (pending approval)
- Date: 2026-08-18

## Context

The existing schema (`database/collection-schema.sql`) is Oracle-dialect. The target stack mandates PostgreSQL. The platform is pre-launch (no production data), so the schema can be re-designed cleanly.

## Decision

1. PostgreSQL (16+) is the only persistence database. **H2 is never used**, even in tests — Testcontainers with real PostgreSQL and Flyway is the integration-test path.
2. The Oracle schema is translated deliberately (VARCHAR2→VARCHAR, NUMBER→NUMERIC/INTEGER, CLOB→TEXT, JSON→JSONB, SYSTIMESTAMP→now(), BOOLEAN native), not mechanically.
3. **Cross-hotel integrity is enforced in the database** via the inherited composite-FK pattern: parents expose `UNIQUE(hotel_id, id)`; hotel-scoped children carry `hotel_id` and reference `(hotel_id, id)`. Where the referenced row may be platform-global (promotions, tax_fee_types), the app enforces "same hotel or global" (optional triggers are the stricter alternative).
4. **Overlapping price ranges are made impossible** with an EXCLUDE constraint (`btree_gist` + `daterange(valid_from, valid_to,'[]') &&`).
5. Money is `NUMERIC(10,2)`; timestamps are `TIMESTAMPTZ DEFAULT now()`; schema is owned by Flyway (`ddl-auto: none`).
6. **Polymorphic notification recipient is intentional.** `notifications.recipient_type/recipient_id` may target a guest or a platform user, so no FK can be created on `recipient_id`. This is an accepted trade-off (unlike media, which was converted to typed owner columns): referential integrity for notifications is enforced by the application. Reviewed and confirmed during schema review v2.
7. **RBAC scope semantics live in the application layer.** The database models `user_roles.hotel_id NULL` (platform role) vs `hotel_id X` (hotel-scoped role) and prevents duplicates, but authorization decisions (which roles may grant which scopes) are enforced by Spring Security, not by the database.
8. **Reservation snapshots: monetary + commercial terms only; no catalog-name snapshots.** `reservation_rooms.rate_per_night/subtotal_amount`, `reservation_extras.unit_price`, `reservation_charges.name/amount`, `invoices.billing_*` and `reservation_cancellations.is_refundable/penalty_amount/refund_amount` freeze everything commercially relevant at booking/cancellation time. Room-type/rate-plan names and meal plans are NOT snapshotted onto `reservation_rooms`: they are presentation data reconstructible via the FK joins, catalog renames are rare and never change commercial terms, and duplicated name columns would add write-sync burden and drift risk for no integrity gain (foundation plan S3 "KEEP AS-IS").
9. **Junction currency is DB-pinned to the rate plan.** `room_type_rate_plans.currency_code` is enforced equal to `rate_plans.currency_code` by the composite FK `(hotel_id, rate_plan_id, currency_code) → rate_plans(hotel_id, id, currency_code)` (backs `UNIQUE(hotel_id, id, currency_code)` on `rate_plans`); `rate_plan_prices` in turn pins to the junction via `(room_type_rate_plan_id, currency_code) → room_type_rate_plans(id, currency_code)`.
10. **Rate-plan stay windows are range-checked at DB level.** `chk_rate_plans_stay_range` (`max_stay >= min_stay` when both set) on `rate_plans`, and the mirror `chk_rate_restrictions_stay_range` on `rate_restrictions` overrides.

## Consequences

- Extra `hotel_id` columns on child tables (denormalized, FK-locked) and supporting `UNIQUE(hotel_id, id)` indexes — the price of DB-level integrity.
- `btree_gist` extension required (migration `V4__pricing_promotions.sql`); `pgcrypto` is enabled explicitly for `gen_random_uuid()`.
- No `domains` brand table at this stage (see database.md D-1).
- Reservation lines reference `room_type_rate_plans` so only genuinely offered (room type, rate plan) pairs can be booked; `reservation_extras.hotel_id` is pinned to the reservation's hotel.
- Historical reservations reconstruct via FK joins for catalog names; monetary and commercial-term history is fully frozen in the rows themselves.