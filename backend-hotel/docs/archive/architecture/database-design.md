# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Database Design — PostgreSQL Review and Proposed Schema

> STATUS: **DRAFT — proposed design, pending human approval.** No Flyway migrations exist yet.
> Source of domain intent: `database/collection-schema.sql` (Oracle 23ai dialect, v2.0 baseline).
> Proposed PostgreSQL schema (validated against PostgreSQL 16, 17/17 smoke tests passing): `database/collection-schema-postgresql.sql`.
> Scope: this document is the review output and the proposal for the final PostgreSQL schema.

---

## 1. Review method

The existing SQL was treated as **old baseline — source of business intent, not truth**:

1. Every table/relationship was re-read against the actual product behavior (booking flow, pricing, availability, check-in, reviews — see frontend docs).
2. Oracle constructs were mapped to PostgreSQL equivalents, not mechanically converted.
3. Every relationship was checked for **cross-hotel integrity** (an entity of Hotel A referencing an entity of Hotel B).
4. Missing structures, weak constraints, and redundant structures were identified.
5. A proposed final schema is described below; **the SQL file itself was not modified**.

## 2. Existing schema strengths (preserved)

| # | Strength | Where |
|---|---|---|
| S1 | Hotel scoping on all product entities (`hotel_id`) | room_types, rooms, rate_plans, extras, experiences, restaurants, availability |
| S2 | Single inventory source: `availability` per (room_type, date) with capacity CHECK + optimistic `version` | availability |
| S3 | Price snapshot discipline: prices frozen at booking time | reservation_rooms.rate_per_night, reservation_extras.unit_price, reservation_charges.amount, invoices.billing_* |
| S4 | Range-based pricing (`rate_plan_prices`) instead of dense per-date rows | pricing |
| S5 | Sparse per-date restriction overrides (`rate_restrictions`) | pricing |
| S6 | Real junction tables for promo eligibility (not JSON arrays) | promotion_eligible_* |
| S7 | `users`/`roles`/`permissions`/`user_roles` RBAC with hotel-scoped role assignment | identity |
| S8 | Full reservation status history table | reservation_status_history |
| S9 | Guests decoupled from users (guest without account is valid) | guests.user_id nullable |
| S10 | Business-facing reference codes and idempotency key on reservations | reservations.reference, idempotency_key |
| S11 | Status CHECK constraints and natural-key UNIQUEs | (hotel_id, room_number), (hotel_id, code) |
| S12 | No fake tables for search/filtering (derivable data) | §5 of schema |

## 3. PostgreSQL compatibility issues (Oracle → PostgreSQL)

| Oracle construct | PostgreSQL equivalent | Note |
|---|---|---|
| `NUMBER GENERATED ALWAYS AS IDENTITY` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Native, direct translation (PG ≥10) |
| `NUMBER(10,2)` / `NUMBER(9,6)` / `NUMBER(6)` | `NUMERIC(10,2)` / `NUMERIC(9,6)` / `INTEGER` | Money stays NUMERIC — never float |
| `NUMBER(2)` / `NUMBER(4)` | `SMALLINT` | decimal_places, sort_order, min_stay… |
| `VARCHAR2(n)` | `VARCHAR(n)` | Character semantics match (length in characters in PG) |
| `CLOB` | `TEXT` | descriptions, notes, policies |
| `CHAR(2)` / `CHAR(3)` | `CHAR(2)` / `CHAR(3)` (or `VARCHAR`) | Keep CHAR for fixed ISO codes; note PG pads with spaces |
| `BOOLEAN` | `BOOLEAN` | PG-native; drop the Oracle 23ai compat note |
| `JSON` | `JSONB` | hotels.config, audit_logs.metadata — JSONB: indexable, dedup keys, GIN support |
| `TIMESTAMP DEFAULT SYSTIMESTAMP` | `TIMESTAMPTZ DEFAULT now()` | Timezone-aware, UTC storage |
| `DATE` | `DATE` | Unchanged |
| `REGEXP_LIKE(col, pattern)` in CHECK | `col ~ 'pattern'` in CHECK | Or prefer real `TIME` type for check_in_time / check_out_time |
| `check_in_time VARCHAR2(5) + regex` | `TIME` column | See §4.2 — the type itself guarantees format |
| Oracle comment conventions | PG `COMMENT ON` | Optional; use SQL comments like the baseline does |

No `NVL`, `SYSDATE`, `ROWNUM`, sequences, `MERGE`, or analytic functions are used in DDL — the baseline is DDL-only, which translates cleanly.

## 4. Proposed final PostgreSQL design (per domain)

### 4.1 Platform / reference data (unchanged, plus seeds)

- `countries(code CHAR(2) PK, name)` — seeded (ISO 3166-1).
- `currencies(code CHAR(3) PK, name, decimal_places SMALLINT DEFAULT 2)`, `decimal_places` CHECK 0–6.
- `languages(code VARCHAR(5) PK, name, is_rtl BOOLEAN)`.
- All three are read-only reference data, seeded in `R__reference_data.sql` (`INSERT … ON CONFLICT DO NOTHING`).
- **No `domains` table** (brand/collection layer). The v2 doc proposed `domains`; the current baseline does not contain it, and the task scope is multi-*hotel* integrity. Adding a brand layer now would add joins everywhere for no current consumer. If a multi-brand requirement appears, it is an additive migration. → approval item D-1.

### 4.2 Catalog domain

**hotels** (rename → keep table `hotels`):

| Column | Proposed type | Change |
|---|---|---|
| id | `BIGINT GENERATED ALWAYS AS IDENTITY PK` | oracle identity |
| name, brand, hotel_type, address, city, phone, email, star_rating | VARCHAR(n) | VARCHAR2→VARCHAR |
| description, long_description | TEXT | CLOB→TEXT |
| country_code | `CHAR(2) FK → countries` | same |
| latitude, longitude | `NUMERIC(9,6)` | same |
| check_in_time, check_out_time | **`TIME`** | replaces VARCHAR(5)+regex — the type enforces HH:MM[:SS]; CHECK `BETWEEN TIME '00:00' AND TIME '23:59'` optional |
| default_currency | `CHAR(3) FK → currencies` | same |
| config | **`JSONB`** | JSON→JSONB; presentation flags only (`has_restaurant`, …). Optional shape CHECK via `jsonb_typeof`/path checks; keep application-validated, DB only guarantees valid JSON |
| status | VARCHAR(20) + CHECK | same enum |
| created_at / updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | SYSTIMESTAMP→now() |

**room_types**: `hotel_id FK`, add **`UNIQUE (hotel_id, id)`** (needed for composite FKs, §5.2). `max_adults`/`max_children` CHECK ≥ 0; `size_sqm` CHECK > 0.

**rooms**: keep `(hotel_id, room_number)` UNIQUE. **Change the FK structure** (cross-hotel fix):
- `(hotel_id, room_type_id) REFERENCES room_types(hotel_id, id)` — a physical room's type is guaranteed to belong to the same hotel.
- Status/housekeeping/maintenance CHECKs kept.

**amenities / hotel_amenities / room_type_amenities**: unchanged (junction PKs fine).

**experiences / restaurants / extras / faqs**: unchanged structurally; money → NUMERIC(10,2); `extras` gains `CHECK (price_amount > 0)`; `experiences.price_amount` stays nullable (complimentary) with `CHECK (price_amount IS NULL OR price_amount > 0)`; `faqs.hotel_id` nullable (global FAQ) kept.

**media — polymorphic association (REVIEW ITEM §5.4):**

- Current: `media(entity_type VARCHAR, entity_id NUMBER, url, storage_key, alt_text, category, is_primary, sort_order)`.
- **Proposed: single `media` table (file facts) + typed FK columns, exactly one non-null:**

```
media (
  id, url VARCHAR(500), storage_key VARCHAR(255),
  alt_text, category, mime_type VARCHAR(50), width, height,
  hotel_id BIGINT REFERENCES hotels(id),          -- hotel-level images
  room_type_id BIGINT REFERENCES room_types(id),
  experience_id BIGINT REFERENCES experiences(id),
  restaurant_id BIGINT REFERENCES restaurants(id),
  extra_id BIGINT REFERENCES extras(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (exactly one of hotel_id/room_type_id/experience_id/restaurant_id/extra_id IS NOT NULL)
)
-- one primary per owner:
CREATE UNIQUE INDEX … ON media(room_type_id)  WHERE room_type_id IS NOT NULL AND is_primary;
CREATE UNIQUE INDEX … ON media(hotel_id)      WHERE hotel_id IS NOT NULL AND is_primary;
… (same per typed column)
```

- Advantages: real FKs (no orphans, no cross-hotel attachment, cascade options), type safety, indexable, one media store.
- Disadvantages: adding a new attachable entity requires a migration (add column + adjust CHECK); polymorphic flexibility is lost.
- Alternative kept on the table for comparison: keep `(entity_type, entity_id)` + `UNIQUE (entity_type, entity_id) WHERE is_primary` partial index + application-only integrity. Weaker integrity, zero schema churn.
- Recommendation: **typed FK columns** (strong integrity is a stated project goal). → approval item D-2.

### 4.3 Inventory domain

**availability** — keep the core model; tighten:

- Keep PK `id` BIGINT identity, `UNIQUE (room_type_id, stay_date)`, capacity CHECK, optimistic `version`.
- Add: `CHECK (rooms_sold >= 0)`, `CHECK (out_of_order >= 0)`, `CHECK (blocked >= 0)`, `CHECK (total_inventory >= 0)`.
- **Drop `idx_availability_lookup`** — redundant, the UNIQUE (room_type_id, stay_date) index already serves lookups.
- Concurrency: bookings update via `UPDATE availability SET rooms_sold = rooms_sold + n, version = version + 1 WHERE room_type_id = ? AND stay_date = ? AND version = ? AND rooms_sold + n + out_of_order + blocked <= total_inventory`, retried on optimistic-lock failure. No `room_blocks` table (decision preserved: `blocked` count covers it).
- `rooms` remains operational state only — never counted for sellability (preserved decision).

### 4.4 Pricing domain

**rate_plans**: keep. Add **`currency_code CHAR(3) NOT NULL FK → currencies`** (defaults to the hotel's `default_currency` at creation). `meal_plan`, cancellation/payment policy text stays; `cancellation_penalty_value` CHECK ≥ 0; `deposit_percentage` CHECK 0–100; `min_stay`/`max_stay` CHECK 1–365 (or NULL).

**room_type_rate_plans**: junction + **`hotel_id`** (cross-hotel fix):
- `(hotel_id, room_type_id) REFERENCES room_types(hotel_id, id)`
- `(hotel_id, rate_plan_id) REFERENCES rate_plans(hotel_id, id)`
- `UNIQUE (room_type_id, rate_plan_id)` kept.
- Add **`currency_code CHAR(3) NOT NULL`** (copied from rate_plan at link time) so price rows can be pinned to one currency per link.

**rate_plan_prices** — overlapping-range problem (THE PostgreSQL-native fix):

> Example ambiguity: `2026-08-01→10` and `2026-08-05→20` overlap → what is the price on 08-07?

- Keep DATE range columns (`valid_from`, `valid_to`, inclusive), `CHECK (valid_to >= valid_from)`.
- Add **EXCLUSION constraint** (requires `btree_gist` extension):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE rate_plan_prices ADD CONSTRAINT ex_rate_plan_prices_no_overlap
  EXCLUDE USING gist (room_type_rate_plan_id WITH =,
                      daterange(valid_from, valid_to, '[]') WITH &&);
```

- This makes overlapping ranges **impossible at the database level**, per (room_type, rate_plan) link.
- Add `CHECK (price_amount > 0)`; composite FK `(room_type_rate_plan_id, currency_code) REFERENCES room_type_rate_plans(id, currency_code)` (requires `UNIQUE(id, currency_code)` on the junction) so a price row can never carry a different currency than its plan link.
- Keep a btree index `(room_type_rate_plan_id, valid_from)` for date lookups.

**rate_restrictions**: sparse per-date overrides. Cross-hotel fix: add `hotel_id` with composite FKs to `room_types` and `rate_plans` (both reference the same `hotel_id` value → pair consistency guaranteed by construction). **Drop `idx_rate_restrictions_lookup`** (redundant with the UNIQUE). Keep CHECKs `min_stay_override`/`max_stay_override` ≥ 1.

**promotions**: keep. `code` UNIQUE; `hotel_id` nullable (platform-wide). Discount CHECKs: percentage 0–100, fixed_amount ≥ 0, `stay_x_pay_y` value ≥ 1. Window CHECKs (`booking_window_end >= booking_window_start`, etc.). `applicable_days_of_week` format validated app-level (or CHECK against a regex).

**promotion_eligible_room_types / promotion_eligible_rate_plans** (cross-hotel + global-promo tension):

- Recommended: junctions are only meaningful for **hotel-scoped** promotions. Add `hotel_id` to both junctions with composite FKs `(hotel_id, promotion_id) REFERENCES promotions(hotel_id, id)`, `(hotel_id, room_type_id) REFERENCES room_types(hotel_id, id)` (requires `UNIQUE(hotel_id, id)` on promotions). Platform-wide promotions use the existing `applies_to_all_room_types` / `applies_to_all_rate_plans` flags and have **no junction rows**.
- Consequence: a platform-wide promotion can no longer target a specific subset of room types via junctions. If that capability is needed, the alternative is application-level enforcement (+ optional trigger) instead. → approval item D-3.

**tax_fee_types**: keep; `hotel_id` nullable (platform-wide default). `value` CHECK ≥ 0; `currency_code` required only for `fixed_*` methods (app-level; a CHECK can't reference the method column conditionally across types — actually it can: `CHECK (calculation_method = 'percentage' OR currency_code IS NOT NULL)`). Add that CHECK.

### 4.5 Identity domain

**users**: keep; `email` — add **functional unique index on `lower(email)`** and store normalized lowercase (recommend) or enable `citext`. `password_hash` VARCHAR(255) (BCrypt/Argon2 output fits). Add `CHECK (char_length(email) <= 254)` optional.

**guests**: keep; `user_id` nullable FK (added after users, as in baseline); `email` indexed non-unique (two guests can share an email); `preferences` CLOB → TEXT (app-structured JSON).

**roles / permissions / role_permissions**: unchanged.

**user_roles**: keep `UNIQUE (user_id, role_id, hotel_id)` — note: PG treats `(1,2,NULL)` as distinct from `(1,2,NULL)` (NULLs are distinct in unique indexes), so a user could get the same platform role twice; fix with a **partial unique index** `UNIQUE (user_id, role_id) WHERE hotel_id IS NULL` plus the existing constraint, or a `CHECK` app-level. Recommended: keep existing UNIQUE + add the partial index. → minor, approval D-4.

### 4.6 Booking domain

**reservations**: keep the model; add integrity CHECKs:

- `CHECK (check_out_date > check_in_date)` (kept)
- `CHECK (adults > 0)`, `CHECK (children >= 0)`
- `CHECK (subtotal_amount >= 0)`, `CHECK (discount_amount >= 0)`, `CHECK (discount_amount <= subtotal_amount)`, `CHECK (tax_amount >= 0)`, `CHECK (fee_amount >= 0)`
- `CHECK (total_amount = subtotal_amount - discount_amount + tax_amount + fee_amount)` — exact NUMERIC arithmetic; guards drift between the row and the charges that back it
- Add **`UNIQUE (id, hotel_id)`** (composite FK target for children), **`UNIQUE (id, guest_id)`** (invoice consistency), **`UNIQUE (id, currency_code)`** (payment currency consistency)
- `reference` — keep UNIQUE; format `RC-XXXXXX` enforced app-level (or CHECK regex `~ '^RC-[A-Z0-9]{6}$'` — frontend already excludes ambiguous chars; recommend app-level + optional CHECK)
- `idempotency_key` UNIQUE kept; `source` — add CHECK against a small enum ('direct','staff','ota'…) app-side or DB
- `hold_expires_at` kept; hold expiry job (app-level) releases inventory
- `promotion_id` FK kept, but a hotel-scoped promotion from another hotel must be rejected: **composite FK impossible** (promotion.hotel_id nullable) → enforce app-level; optional trigger. → approval D-5 (app-level accepted vs trigger)

**reservation_rooms**: cross-hotel fix via inherited FK pattern:

- Add `hotel_id`, then `(hotel_id, reservation_id) REFERENCES reservations(hotel_id, id)`, `(hotel_id, room_type_id) REFERENCES room_types(hotel_id, id)`, `(hotel_id, rate_plan_id) REFERENCES rate_plans(hotel_id, id)`, `(hotel_id, room_id) REFERENCES rooms(hotel_id, id)` (room_id nullable — assignment later)
- `UNIQUE (id, reservation_id)` (target for reservation_guests/extras consistency)
- Add `CHECK (nights > 0)`, `CHECK (rate_per_night > 0)`, `CHECK (subtotal_amount >= 0)`, `CHECK (check_out_date > check_in_date)`

**reservation_guests**: add composite FK `(reservation_id, reservation_room_id) REFERENCES reservation_rooms(reservation_id, id)` — the occupant's room line must belong to the same reservation. `guest_id` nullable kept. Add `CHECK (age_category IN ('adult','child'))` (kept). App-level: at least one adult per room; total occupants ≤ room type capacity.

**reservation_extras**: composite FK `(reservation_id, reservation_room_id) → reservation_rooms(reservation_id, id)`; add `CHECK (quantity > 0)`, `CHECK (unit_price >= 0)`, `CHECK (total_price = unit_price * quantity)`; `stay_date` CHECK within stay (app-level, cross-row).

**reservation_charges**: add `CHECK (amount >= 0)`; `tax_fee_type_id` nullable kept (one-off charges); hotel consistency of the referenced `tax_fee_types` (global or same hotel) — app-level (+ optional trigger). `name` snapshotted — kept.

**reservation_status_history**: unchanged; `from_status`/`to_status` CHECKs optional.

### 4.7 Cancellation

**cancellation_reasons**: unchanged (seeded).

**reservation_cancellations**: keep `reservation_id UNIQUE`; `CHECK (penalty_amount >= 0)`, `CHECK (refund_amount >= 0)`. Invariant (app-level, one transaction): cancellation row + `reservations.status = 'cancelled'` + released inventory + (when refundable) refund payment record.

### 4.8 Billing domain

**payments**: add composite FK `(reservation_id, currency_code) REFERENCES reservations(id, currency_code)` (payment currency must match the reservation's billing currency); `CHECK (amount > 0)`; `provider` kept as VARCHAR (provider code, not vendor coupling — the `provider` string is data, the code depends on the `PaymentProvider` abstraction).

**payment_transactions**: add `CHECK (status IN ('pending','succeeded','failed','reversed'))` (baseline left status free); `amount > 0` for capture/refund; `provider_transaction_id` indexed (idempotency lookups).

**invoices**: composite FK `(reservation_id, guest_id) REFERENCES reservations(id, guest_id)` — an invoice's guest must be the reservation's booking guest; `invoice_number` UNIQUE + format app-level; amount CHECKs mirroring reservations.

**invoice_items**: `CHECK (quantity > 0)`, `CHECK (unit_price >= 0)`, `CHECK (total_price = unit_price * quantity)`.

### 4.9 Stay domain

**check_ins**: add composite FK `(reservation_id, reservation_guest_id) REFERENCES reservation_guests(reservation_id, id)`; add `CHECK (checked_out_at IS NULL OR status = 'completed')`; status enum kept (add 'cancelled'? — no: check-in cancellation is a reservation cancellation; keep pending/completed).

### 4.10 Reviews

**reviews**: cross-hotel fix: composite FK `(hotel_id, reservation_id) REFERENCES reservations(hotel_id, id)` (requires `UNIQUE(hotel_id, id)` on reservations) — a review can only reference a reservation of the hotel it reviews; **partial unique index** `UNIQUE (reservation_id) WHERE reservation_id IS NOT NULL` — one review per reservation; rating CHECKs kept (1–5); `author_name` required when guest_id is null (app-level CHECK: `CHECK (guest_id IS NOT NULL OR author_name IS NOT NULL)`); moderation workflow kept.

### 4.11 Audit

**audit_logs**: `metadata` → **JSONB**; `resource_type`/`resource_id` index kept; add `hotel_id BIGINT NULL REFERENCES hotels(id)` (optional, for hotel-scoped audit queries); app writes via a single audit service/aspect.

### 4.12 NEW: notifications (proposed addition)

The baseline defers notifications, but the platform's first use case (Resend emails for booking confirmations, cancellation notices) needs an outbound record:

```sql
notifications (
  id BIGINT IDENTITY PK,
  hotel_id BIGINT NULL REFERENCES hotels(id),
  recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('guest','user')),
  recipient_id BIGINT NOT NULL,              -- guests.id or users.id
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email','sms')),
  type VARCHAR(50) NOT NULL,                 -- 'booking.confirmed', 'cancellation', …
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','sent','failed','suppressed')),
  provider VARCHAR(50),                      -- 'resend', …
  provider_reference VARCHAR(150),
  attempts INTEGER NOT NULL DEFAULT 0,
  subject VARCHAR(255), body TEXT,
  sent_at TIMESTAMPTZ, error VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Produced by the email/notification service; the event pipeline (Kafka/outbox) feeds it. → approval item D-6.

## 5. Cross-hotel integrity — the central fix

### 5.1 Problem

With plain FKs, nothing prevents:
- `rooms` of Hotel A referencing a `room_type` of Hotel B
- `reservation_rooms` mixing Hotel A's reservation with Hotel B's room type / rate plan / room
- `room_type_rate_plans` pairing a Hotel A room type with a Hotel B rate plan
- `rate_restrictions` pairing cross-hotel types/plans
- `reviews.hotel_id` = A while `reviews.reservation_id` = a reservation of B
- `reservation_extras.extra_id` from another hotel, `reservation_charges.tax_fee_type_id` from another hotel
- promo eligibility junctions referencing another hotel's room types

### 5.2 Solution — inherited composite FKs

Pattern: parent gains `UNIQUE(hotel_id, id)`; child carries `hotel_id` and references `(hotel_id, id)`.

- Parents: `hotels(id)` (already unique), `room_types(hotel_id, id)`, `rate_plans(hotel_id, id)`, `rooms(hotel_id, id)`, `promotions(hotel_id, id)` (for hotel-scoped rows), `reservations(hotel_id, id)`.
- Children (hotel-scoped chains): `rooms`, `room_type_rate_plans`, `rate_restrictions`, `reservation_rooms`, `promotion_eligible_*`, `reviews`, plus `reservation_guests`/`reservation_extras`/`check_ins` inherit through `reservation_id` pairs.
- Where the referenced row may be **global** (`promotions.hotel_id NULL`, `tax_fee_types.hotel_id NULL`), composite FKs cannot express "same hotel OR global" → application-layer validation (documented per table), with optional triggers as the strict alternative. → approval D-3/D-5.

### 5.3 Cost

Extra `hotel_id` columns (denormalized but FK-locked to the parent's value) and a handful of `UNIQUE(hotel_id, id)` supporting indexes. No application impact beyond mapping the extra column (it is always equal to the parent's hotel).

## 6. Pricing integrity — overlapping ranges (see §4.4)

`btree_gist` EXCLUDE constraint is the PostgreSQL-native answer; it also prevents the same overlap on insert of a third overlapping row. Alternative considered: `tsrange`/`daterange` column instead of two DATE columns — rejected (keeps baseline shape, app/SQL simpler).

## 7. Availability concurrency model (see §4.3)

Optimistic guard update + retry; hold expiry job releases pending holds; capacity CHECK is the last line of defense. Consideration: pessimistic `SELECT … FOR UPDATE` on the (room_type, date) rows inside the booking transaction is a valid stricter alternative for high-contention dates — defer; revisit if contention appears.

## 8. IDs — BIGINT identity, not UUID (see ADR-005)

All tables keep `BIGINT GENERATED ALWAYS AS IDENTITY`. Guest-facing references (`RC-XXXXXX`) and idempotency keys are the public identifiers; internal numeric ids are never exposed to guests. Trade-off documented in ADR-005.

## 9. Money representation

- All monetary columns: `NUMERIC(10,2)` (exact decimal, max 99,999,999.99 per line).
- Currency carried explicitly per monetary context (`currency_code`) — never implied by hotel default.
- No `float`/`double` anywhere. Display conversions (FX) are frontend concern; a future `exchange_rates` table is deferred (approval D-7, not added now).
- Tax/fee: percentage values `NUMERIC(10,4)` (e.g. 12.5%); computed amounts rounded to 2dp in application code.

## 10. Timestamps

- `TIMESTAMPTZ NOT NULL DEFAULT now()` for created_at everywhere; updated_at set by the application (JPA `@PreUpdate`) — DB trigger optional, not recommended (JPA covers it).
- Dates of stay (`stay_date`, check_in/out) remain plain `DATE` (no timezone).

## 11. Flyway migration strategy

Pre-launch platform → **clean sequential migrations, no data migration**.

| Migration | Contents |
|---|---|
| `V1__reference_data.sql` | countries, currencies, languages, cancellation_reasons (tables) |
| `V2__identity_rbac.sql` | users, roles, permissions, role_permissions, user_roles |
| `V3__catalog.sql` | hotels, amenities + junctions, room_types (+UNIQUE hotel,id), rooms, experiences, restaurants, extras, faqs, media (+ `ALTER` adding hotel FK to user_roles) |
| `V4__pricing_promotions.sql` | rate_plans, room_type_rate_plans, rate_plan_prices (+ `CREATE EXTENSION btree_gist` + EXCLUDE), rate_restrictions, promotions, eligibility junctions, tax_fee_types |
| `V5__inventory.sql` | availability |
| `V6__booking.sql` | guests, reservations, reservation_rooms, reservation_guests, reservation_extras, reservation_charges, reservation_status_history |
| `V7__billing_stay.sql` | payments, payment_transactions, invoices, invoice_items, check_ins |
| `V8__reviews_notifications_events_audit.sql` | reviews, notification_templates, notifications, event_outbox (+ `CREATE EXTENSION pgcrypto`), event_consumption, audit_logs |
| `R__reference_data_seed.sql` | idempotent seed: countries, currencies, languages, cancellation_reasons (repeatable) |

> Note: `audit_logs` lives in `V8` (not `V2`) because it references `hotels` (created in `V3`).
> Migrations `V1`–`V8` are installed and verified (Flyway on empty PostgreSQL 16, 16/16 integration tests green).

Conventions:

- Naming: `V<version>__<snake_case_description>.sql`, strictly increasing, **immutable once merged**. Fixes = new versions.
- Repeatables (`R__`): reference/seed data only; idempotent (`ON CONFLICT DO NOTHING`); no business seed in test fixtures.
- Development DB: Docker Compose PostgreSQL (pinned major version), Flyway on startup, `ddl-auto: none`.
- Test DB: Testcontainers PostgreSQL (same major version as dev/prod) + Flyway — **no H2**.
- Each migration validated by the integration suite (Flyway runs on every container start).
- Structural review of each migration by the `database` review agent before merge.

## 12. Proposed change register (summary — full list with rationale in the report)

| # | Change | Approval |
|---|---|---|
| D-1 | No `domains` table (brand layer) — defer | required |
| D-2 | Media: typed FK columns replace polymorphic (entity_type, entity_id) | required |
| D-3 | Promo eligibility junctions hotel-scoped; platform promos via `applies_to_all_*` flags | required |
| D-4 | `user_roles`: partial unique index for platform roles | optional |
| D-5 | `reservations.promotion_id` / `reservation_charges.tax_fee_type_id` hotel-or-global integrity at app level (no trigger) | required |
| D-6 | New `notifications` table | required |
| D-7 | No `exchange_rates` table yet | optional |
| D-8 | Composite-FK cross-hotel pattern throughout (rooms, junctions, reservation chain, reviews) | required |
| D-9 | EXCLUDE constraint on `rate_plan_prices` (btree_gist) | required |
| D-10 | Currency pinned on `rate_plans` + junction + price rows | required |
| D-11 | Tightened CHECKs (positivity, totals, nights, quantities) + redundant-index removal | recommended |
| D-12 | `check_in_time`/`check_out_time` as `TIME` | recommended |
| D-13 | JSONB for `hotels.config`, `audit_logs.metadata` | recommended |
| D-14 | TIMESTAMPTZ + `now()` | recommended (no approval needed) |
| D-15 | lower(email) unique for users | recommended |

Back to: [README](../../README.md) · [architecture](architecture-draft.md)