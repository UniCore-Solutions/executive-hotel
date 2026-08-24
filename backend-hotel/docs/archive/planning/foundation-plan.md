# ARCHIVED DOCUMENT — HISTORICAL CONTEXT ONLY

> This document is retained for historical context only. It describes a previous
> phase, proposal, or report of this project and must **not** be treated as
> current documentation or architecture.
> For the current state, see the [documentation index](../../README.md) —
> starting with `docs/architecture/architecture.md`.

---
# Foundation Plan — Final Database & Backend Design (implementation-ready)

> STATUS: **DRAFT — proposed foundation, pending human approval.** No implementation exists.
> Sources: `database/collection-schema.sql` (old Oracle baseline — NOT modified), docs/database.md, docs/architecture.md, ADRs.
> This document is the single implementation-ready specification. An engineer can implement without guessing.

---

## 1. Executive summary

The old Oracle baseline is a sound domain model with three structural weaknesses: **no cross-hotel referential integrity**, **ambiguous overlapping price ranges**, and **polymorphic media without integrity**; plus a set of weak CHECKs and one missing table (`notifications`). The proposed PostgreSQL design keeps every valid business concept, fixes the structural weaknesses at the database level (composite inherited FKs, `btree_gist` EXCLUDE, typed media FKs), pins currency, adds snapshot invariants, and defines the Spring Boot foundation, Flyway strategy, and an 8-phase implementation roadmap. Nothing is implemented.

## 2. Reconciliation of previous findings

| Previous finding | Classification |
|---|---|
| Cross-hotel composite-FK pattern (D-8) | **MUST CHANGE** |
| btree_gist EXCLUDE on price ranges (D-9) | **MUST CHANGE** |
| Currency pinned on rate_plans/junction/prices (D-10) | **MUST CHANGE** |
| rate_restrictions → reference `room_type_rate_plan_id` | **MUST CHANGE** (new, resolves pair-consistency) |
| Promo eligibility junctions hotel-scoped (D-3) | **MUST CHANGE** |
| Media typed FK columns (D-2 / ADR-006) | **MUST CHANGE** |
| `notifications` table (D-6) | **MUST CHANGE** (add) |
| Money NUMERIC, TIMESTAMPTZ, JSONB, BIGINT identity | **MUST CHANGE** (PG types, D-13/D-14) |
| Reservation/invoice/payment invariant CHECKs | **MUST CHANGE** |
| App-level hotel-or-global for promotion/tax refs (D-5) | **MUST** (documented app rule; trigger optional) |
| `check_in_time`/`check_out_time` as `TIME` (D-12) | **SHOULD CHANGE** |
| Redundant index removal (P7) | **SHOULD CHANGE** |
| lower(email) unique (P10/D-15) | **SHOULD CHANGE** |
| user_roles partial unique (D-4) | **SHOULD CHANGE** |
| review-once-per-reservation, check-in invariant (P11) | **SHOULD CHANGE** |
| Availability model (counts + version + capacity CHECK) | **KEEP AS-IS** |
| Price snapshot discipline (reservation_rooms/extras/charges, invoice billing) | **KEEP AS-IS** |
| Sparse rate_restrictions, range pricing | **KEEP AS-IS** (restriction FK target changes) |
| No `domains` brand table (D-1) | **KEEP AS-IS** (defer) |
| No `room_blocks` (blocked counter) | **KEEP AS-IS** |
| No `exchange_rates`, translations, loyalty, complaints, PMS sync, tiered taxes, `hotel_services`/`hotel_configurations` | **DEFERRED** |

## 3. Critical database decisions

### 3A. Multi-hotel integrity — exact per-relationship solution

Pattern: **inherited composite FKs**. Parents expose `UNIQUE(hotel_id, id)`; children carry `hotel_id` and reference `(hotel_id, id)`.

| Relationship | Current | Proposed exact solution |
|---|---|---|
| hotels | id PK | unchanged |
| room_types → hotel | hotel_id FK | + `UNIQUE(hotel_id, id)` (composite-FK target) |
| rooms → hotel + room_type | plain FKs | `(hotel_id, room_type_id) REFERENCES room_types(hotel_id, id)` |
| rate_plans → hotel | hotel_id FK | + `UNIQUE(hotel_id, id)` |
| room_type_rate_plans | plain FKs | `hotel_id` + `(hotel_id, room_type_id) → room_types(hotel_id, id)` + `(hotel_id, rate_plan_id) → rate_plans(hotel_id, id)` + `UNIQUE(id, hotel_id)` + `UNIQUE(room_type_id, rate_plan_id)` |
| reservations → hotel | hotel_id FK | + `UNIQUE(hotel_id, id)`, `UNIQUE(id, guest_id)`, `UNIQUE(id, currency_code)` |
| reservation_rooms | plain FKs | `hotel_id` + `(hotel_id, reservation_id) → reservations(hotel_id, id)` + `(hotel_id, room_type_id)` + `(hotel_id, rate_plan_id)` + `(hotel_id, room_id)` (nullable) + `UNIQUE(id, reservation_id)` |
| reservation_guests → reservation_rooms | plain FK | `(reservation_id, reservation_room_id) → reservation_rooms(reservation_id, id)` |
| reservation_extras → extra | plain FK | `(hotel_id, extra_id) → extras(hotel_id, id)` (+ `hotel_id` added) |
| reservation_extras → reservation_rooms | plain FK | `(reservation_id, reservation_room_id) → reservation_rooms(reservation_id, id)` |
| reservation_charges → tax_fee_types | plain FK | **app-level** rule: tax_fee_type must be global or same hotel (trigger optional) |
| check_ins → reservation_guests | plain FK | `(reservation_id, reservation_guest_id) → reservation_guests(reservation_id, id)` |
| reviews → hotel + reservation | plain FKs | `(hotel_id, reservation_id) → reservations(hotel_id, id)` (nullable) + `UNIQUE(reservation_id) WHERE reservation_id IS NOT NULL` |
| promotions → hotel | hotel_id FK nullable | + `UNIQUE(hotel_id, id)` (for hotel-scoped rows) |
| promotion eligibility | plain FKs | junctions carry `hotel_id`; `(hotel_id, promotion_id) → promotions(hotel_id, id)` + `(hotel_id, room_type_id)` / `(hotel_id, rate_plan_id)`. **Platform-wide promos use `applies_to_all_*` flags and have no junction rows** (semantic change) |
| reservations.promotion_id | plain FK | **app-level**: promo must be global or same hotel |
| media | polymorphic | typed FK columns (see 3B) |

### 3B. Media architecture — ONE recommendation

| Criterion | 1. Polymorphic (baseline) | 2. Per-entity junction tables | 3. Typed FK columns (**recommended**) |
|---|---|---|---|
| DB integrity | none (orphans, cross-hotel, wrong-entity ids) | strong | strong: real FKs, CHECK exactly-one |
| JPA mapping | one `@Entity`, no associations | N `@OneToMany` + N join tables | 5 optional `@ManyToOne` on one entity |
| Querying | `entity_type='room_type' AND entity_id=?` | per-entity joins | `WHERE room_type_id = ?` — direct |
| Deletion/cascade | none (manual) | FK cascade per table | FK `ON DELETE CASCADE` per typed column |
| Cloudinary | no impact | no impact | no impact (`storage_key` handle) |
| New attachable entity | none | new table | migration: column + CHECK update |
| Complexity | low | high | low–moderate |

**Recommendation: approach 3** — single `media` table with typed nullable FK columns (`hotel_id`, `room_type_id`, `experience_id`, `restaurant_id`, `extra_id`), `CHECK (num_nonnulls(...) = 1)`, partial unique indexes per owner on `is_primary`. Rationale: strongest integrity with one table; JPA-friendly; baseline concept (one media store) preserved. (ADR-006.)

### 3C. Room / Room type / Inventory — final decision

```
hotels ──< room_types ──< rooms (physical, operational state only)
            └──< availability(room_type_id, stay_date)  ← THE source of truth
```

1. **`total_inventory` is independently managed** — NOT derived from `rooms`. Rationale: guests book types; physical assignment happens at check-in; deriving counts from `rooms` would couple operations (housekeeping/repairs) to sellability and break for partially-maintained room registers.
2. `rooms` is operational state only (`status`, `housekeeping_status`, `maintenance_status`) — **never counted for sellability**.
3. `out_of_order` (count) and `blocked` (count) are manual counters on the availability row; sellable = `total_inventory − out_of_order − blocked − rooms_sold`. CHECK: `rooms_sold + out_of_order + blocked <= total_inventory` and all four >= 0.
4. **Blocked inventory**: the `blocked` counter replaces `room_blocks` (baseline decision kept) — a reasoned block-history table is deferred.
5. **Concurrent reservations**: atomic optimistic update per night:
   `UPDATE availability SET rooms_sold = rooms_sold + n, version = version + 1 WHERE room_type_id = ? AND stay_date = ? AND version = ? AND rooms_sold + n + out_of_order + blocked <= total_inventory`
   — failed rows → retry (max 3); all nights updated in one transaction; partial success rolls back.
6. Source of truth: the `availability` row per (room_type, stay_date) — nothing else.

### 3D. Rate plans / pricing — final decision

```
room_types ──< room_type_rate_plans >── rate_plans
                 ├──< rate_plan_prices   (range, EXCLUDE no-overlap)
                 └──< rate_restrictions  (sparse per-date overrides)
```

1. **Ranges may not overlap.** Concrete DDL:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE rate_plan_prices ADD CONSTRAINT ex_rate_plan_prices_no_overlap
  EXCLUDE USING gist (room_type_rate_plan_id WITH =,
                      daterange(valid_from, valid_to, '[]') WITH &&);
CHECK (valid_to >= valid_from); CHECK (price_amount > 0);
```

2. **rate_restrictions references `room_type_rate_plan_id` directly** (change from baseline's `(room_type_id, rate_plan_id)` pair): a restriction exists only for an *offered* (room_type, rate_plan) pair; this removes the two-FK pair-consistency problem and tightens uniqueness:

```sql
rate_restrictions (
  id BIGINT IDENTITY PK,
  hotel_id BIGINT NOT NULL,
  room_type_rate_plan_id BIGINT NOT NULL,
  stay_date DATE NOT NULL,
  min_stay_override SMALLINT NULL, max_stay_override SMALLINT NULL,
  closed_to_arrival BOOLEAN NOT NULL DEFAULT FALSE,
  closed_to_departure BOOLEAN NOT NULL DEFAULT FALSE,
  stop_sell BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (room_type_rate_plan_id, stay_date),
  FOREIGN KEY (hotel_id, room_type_rate_plan_id) REFERENCES room_type_rate_plans(hotel_id, id)
)
```

3. **Precedence (application rule, documented)**: per stay night, `rate_plan_prices` gives the base price; `rate_restrictions` rows for that date override behavior:
   - `stop_sell` → the pair is not sellable that date (wins over price/availability).
   - `closed_to_arrival` → no stays *starting* that date; `closed_to_departure` → no stays *ending* that date; neither blocks mid-stay nights.
   - `min_stay_override`/`max_stay_override` replace the plan's `min_stay`/`max_stay` for the whole stay when present (NULL = fall back to plan defaults).
4. A date is sellable only if: a price range covers it AND availability capacity allows AND no stop-sell AND stay-length rules pass.
5. Concrete indexes: btree `(room_type_rate_plan_id, valid_from)` for price lookup; the EXCLUDE gist index serves overlap prevention (and range lookups reasonably); `UNIQUE(room_type_rate_plan_id, stay_date)` serves restriction lookup.

## 4. PostgreSQL target design (type mapping)

| Oracle | PostgreSQL | Reason |
|---|---|---|
| `NUMBER GENERATED ALWAYS AS IDENTITY` | `BIGINT GENERATED ALWAYS AS IDENTITY` | native, compact, JPA-friendly (ADR-005) |
| `NUMBER(10,2)` money | `NUMERIC(10,2)` | exact decimal; never float |
| `NUMBER(9,6)` lat/long | `NUMERIC(9,6)` | exact |
| `NUMBER(2)`/`NUMBER(4)`/`NUMBER(6)` | `SMALLINT`/`INTEGER` | magnitudes fit |
| `NUMBER(10,4)` (tax value) | `NUMERIC(10,4)` | percentage precision |
| `VARCHAR2(n)` | `VARCHAR(n)` | character-length semantics match |
| `CLOB` | `TEXT` | unbounded text |
| `CHAR(2)`/`CHAR(3)` codes | `CHAR(2)`/`CHAR(3)` | ISO codes (padded) |
| `BOOLEAN` | `BOOLEAN` | native |
| `JSON` | `JSONB` | indexable, deduped, GIN-capable |
| `TIMESTAMP DEFAULT SYSTIMESTAMP` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | UTC-aware |
| `DATE` (stay dates) | `DATE` | no tz |
| `VARCHAR(5)+regex` (times) | `TIME` | type-level format validity |
| Oracle identity/sequence exposure | identity only; no app-visible sequences | encapsulation |

Per-table spec (tables not listed = baseline shape with types mapped + hotel_id/currency/CHECK additions noted in 3A/3D/§5):

- **hotels**: baseline + `config JSONB`, `check_in_time TIME`, `check_out_time TIME`, status CHECK kept; `UNIQUE(id)` implicit.
- **room_types**: + `UNIQUE(hotel_id, id)`; CHECKs `max_adults >= 0`, `max_children >= 0`, `size_sqm > 0`.
- **rooms**: + composite FK per 3A; CHECKs kept; `UNIQUE(hotel_id, room_number)`.
- **media**: typed columns per 3B; `storage_key` UNIQUE (deletion handle is the idempotency key for Cloudinary).
- **availability**: baseline + positivity CHECKs; PK id; `UNIQUE(room_type_id, stay_date)`; **drop `idx_availability_lookup`** (redundant).
- **rate_plans**: + `currency_code CHAR(3) NOT NULL FK → currencies`; CHECKs `deposit_percentage BETWEEN 0 AND 100`, penalty value >= 0, `min_stay BETWEEN 1 AND 365` (or NULL).
- **room_type_rate_plans**: + `hotel_id`, `currency_code CHAR(3) NOT NULL` (copied from rate_plan), `UNIQUE(id, hotel_id)`, `UNIQUE(id, currency_code)` (FK target for prices), composite FKs per 3A.
- **rate_plan_prices**: + EXCLUDE (3D), composite FK `(room_type_rate_plan_id, currency_code) → room_type_rate_plans(id, currency_code)`; btree index `(room_type_rate_plan_id, valid_from)`; drop id-proxy ambiguity (keep `id` PK).
- **rate_restrictions**: per 3D (junction reference).
- **promotions**: `UNIQUE(hotel_id, id)`; CHECKs: `discount_value >= 0`; percentage `<= 100`; window CHECKs (`booking_window_end >= booking_window_start`, same for stay); `applicable_days_of_week` CHECK regex `^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|…))*$` (app-level acceptable alternative).
- **promotion_eligible_room_types / _rate_plans**: + `hotel_id`, composite FKs per 3A.
- **tax_fee_types**: CHECK `(calculation_method = 'percentage' OR currency_code IS NOT NULL)`; `value >= 0`.
- **users**: + `UNIQUE (lower(email))` functional index; `password_hash VARCHAR(255)`.
- **user_roles**: + partial unique `UNIQUE(user_id, role_id) WHERE hotel_id IS NULL`.
- **reservations**: CHECKs per §5; `UNIQUE(hotel_id, id)`, `UNIQUE(id, guest_id)`, `UNIQUE(id, currency_code)`.
- **reservation_rooms**: per 3A + CHECKs per §5.
- **reservation_guests / reservation_extras / reservation_charges / reservation_status_history / reservation_cancellations**: per §5.
- **payments / payment_transactions / invoices / invoice_items**: per §5; `UNIQUE(provider, provider_reference) WHERE provider_reference IS NOT NULL`.
- **check_ins**: composite FK + `CHECK (checked_out_at IS NULL OR status = 'completed')`.
- **reviews**: per 3A; `CHECK (guest_id IS NOT NULL OR author_name IS NOT NULL)`.
- **audit_logs**: `metadata JSONB`; + optional `hotel_id`.
- **notifications** (new): per database.md §4.12.
- **event_outbox / event_consumption** (new, ADR-002): `event_outbox(event_id UUID PK, event_type, event_version, hotel_id, aggregate_id, payload JSONB, trace_id, status, attempts, created_at, published_at)`; `event_consumption(group_id, event_id, PK)`.

## 5. Integrity rules (reservation chain) — owner per rule

### 5.1 PostgreSQL constraints

| Rule | Where |
|---|---|
| `check_out_date > check_in_date` | reservations, reservation_rooms |
| `nights >= 1`; `nights = check_out_date − check_in_date` (app fills; CHECK ≥ 1) | reservation_rooms |
| `adults >= 1`, `children >= 0` | reservations |
| `subtotal_amount >= 0`, `discount_amount >= 0`, `discount_amount <= subtotal_amount`, `tax_amount >= 0`, `fee_amount >= 0` | reservations |
| `total_amount = subtotal_amount − discount_amount + tax_amount + fee_amount` | reservations |
| `rate_per_night > 0`, `subtotal_amount >= 0` | reservation_rooms |
| `quantity > 0`, `unit_price >= 0`, `total_price = unit_price * quantity` | reservation_extras, invoice_items |
| `amount >= 0` | reservation_charges |
| `penalty_amount >= 0`, `refund_amount >= 0` | reservation_cancellations |
| `amount > 0` (capture/refund), status CHECK (`pending, succeeded, failed, reversed`) | payment_transactions |
| status CHECKs (reservations, reservation_rooms, payments, invoices, check_ins, reviews, promotions, users, …) | as baseline |
| `UNIQUE (reservation_id)` | reservation_cancellations |
| `UNIQUE(reservation_id) WHERE reservation_id IS NOT NULL` | reviews (one per reservation) |
| `CHECK (checked_out_at IS NULL OR status = 'completed')` | check_ins |
| all composite FKs of §3A | see 3A |

### 5.2 Application/business rules

- Room-type capacity: `reservation_guests` adults/children per room line ≤ `room_types.max_adults/max_children`.
- At least one adult per room line.
- Reservation `adults/children` = sum over room lines (single source: reservation_guests).
- Stay dates within reservation's `check_in/out` for room lines and extras (`stay_date`).
- Extras priced per `pricing_model` (per_stay/per_person/per_night/per_room) — `unit_price` snapshot taken at booking.
- Promotion eligibility validated at booking (windows, min nights, eligible room types/plans, usage caps, stackability) and **snapshotted** (`promotion_id` + `discount_amount`); catalog edits never rewrite past reservations.
- Tax/fee computation from `tax_fee_types` at booking; line items snapshotted in `reservation_charges`; rollups copied to `reservations.tax_amount/fee_amount`.
- State transitions (app service, single transaction): `pending → confirmed → (modified) → checked_in → checked_out`; `→ cancelled` from `pending|confirmed` (never from checked_in/out); `no_show` from `confirmed` after no-show policy; `payment_status` rollup maintained by billing service (`pending → authorized → captured → failed/refunded/partially_refunded`).
- Cancellation: transaction = `reservation_cancellations` row + status `cancelled` + inventory release + (refundable → refund payment transaction) + outbox event. Policy from rate_plan snapshot (is_refundable, penalty type/value, deadline).
- Idempotency: `reservations.idempotency_key` UNIQUE; replay of the same `Idempotency-Key` returns the existing reservation (200).
- Reference format `RC-[A-Z0-9]{6}` (ambiguous chars excluded) — generated app-side.
- Hold expiry: scheduled job releases inventory and cancels `pending` reservations past `hold_expires_at` (single transaction per reservation).

### 5.3 Transaction boundaries

| Operation | Atomic scope |
|---|---|
| Booking creation | availability guard-updates (all nights) + reservation + room lines + guests + extras + charges + status history + outbox row — **one DB transaction** |
| Cancellation | cancellation row + status + availability release + outbox — **one transaction** |
| Check-in | check_in row + reservation status + outbox — **one transaction** |
| Payment capture/refund | payment + payment_transactions + reservation.payment_status + invoice status + outbox — **one transaction** (provider call OUTSIDE the DB transaction, then record; webhook reconciles) |
| Hold expiry | release + status — **one transaction** |
| Queries/quotes | read-only, `readOnly = true`, no external calls |

## 6. Payment and invoice foundation

- **Lifecycle**: `payments`: `pending → authorized → captured → (partially_)refunded | failed | cancelled`; every provider operation appends a `payment_transactions` row (`authorization | capture | refund | void` with status).
- **Provider abstraction**: `PaymentProvider` port — `authorize`, `capture`, `refund`, `void`, `parseWebhook` — implemented later; `payments.provider` stores the provider code as data; vendor SDKs confined to `infrastructure/provider`.
- **Provider reference uniqueness**: `UNIQUE (provider, provider_reference) WHERE provider_reference IS NOT NULL` — the webhook/idempotency handle.
- **Webhooks**: signature verification → dedupe by provider event id → apply transition → record in `payment_transactions` (`provider_transaction_id` indexed).
- **Reservation/payment consistency**: payment currency = reservation currency (composite FK `(reservation_id, currency_code)`); sum of captures ≤ reservation `total_amount` (app); overpayment rejected; refund ≤ captured (app).
- **Refund handling**: refund transaction rows with negative-amount-free semantics (`type='refund'`, `amount > 0`); partial refunds supported; `payments.status` + `reservations.payment_status` updated in the same transaction.
- **Invoice snapshot rules**: issued from reservation state at issue time — billing_name/address snapshot, room lines, extras, charges as `invoice_items` (`room | extra | tax | fee | discount`); `invoice_number` unique + format `INV-YYYY-NNNNN` (app); status `issued → paid | void`; invoice never auto-regenerates after issue; reissue = void + new invoice.

## 7. Security / multi-hotel authorization — final

- `user_roles.hotel_id = NULL` = **platform-level role** (applies to every hotel); non-NULL = role scoped to that hotel. Effective permissions = union of platform roles + roles for the hotels the user can access.
- Seeded roles: `super_admin` (platform), `hotel_admin`, `revenue_manager`, `reservation_agent`, `reception_staff`, `content_manager`, `finance_staff` (hotel-scoped). Permission codes per domain (`reservations.cancel`, `pricing.update`, `inventory.update`, `reviews.moderate`, `billing.refund`, …).
- **Hotel context resolution**: JWT carries `hotels: [{hotelId, roles[]}]`; the security layer binds the request's `hotelId` (path variable for hotel-scoped routes) into an `AuthenticatedHotel` principal claim; a custom `AuthorizationManager` (`@PreAuthorize("hasHotelPermission('reservations.cancel')")`) checks membership + permission before the controller executes.
- **Cross-hotel prevention is defense-in-depth**: (1) authorization check first (403), (2) DB composite FKs as backstop (§3A).
- Guest reference flows use capability tokens (HMAC, short-lived) — ADR-007.

## 8. Backend foundation

### 8.1 Packages (final)

```
com.hotelcollection.hotel
├── common/        error envelope, pagination, money, time, correlation, validation
├── catalog/       hotels, room_types, rooms, amenities, media, experiences, restaurants, extras, faqs
├── identity/      users, roles, permissions, RBAC services
│   └── security/  Spring Security config, JWT, capability tokens, hotel scope
├── pricing/       rate_plans, links, prices, restrictions, promotions, tax_fee_types
├── inventory/     availability, holds, release job
├── booking/       guests, reservations, room lines, guests, extras, charges, history, cancellations, hold expiry
├── billing/       payments, payment_transactions, invoices, invoice_items
├── stay/          check_ins
├── reviews/       reviews + moderation
├── notification/  notifications, EmailProvider port
├── audit/         audit log aspect
├── events/        contracts, outbox, relay, Kafka config
├── integration/   provider ports + configuration properties
├── infrastructure/ JPA impls; provider/ (CloudinaryProvider, ResendEmailProvider, …)
└── web/v1/        controllers, advice, OpenAPI
```

### 8.2 Domain boundaries & dependencies

| Module | Owns | Depends on |
|---|---|---|
| identity/security | users, roles, permissions, authn/z, hotel context | common |
| catalog | hotels, room types, rooms, amenities, media, experiences, restaurants, extras, faqs | common, identity (audit) |
| pricing | rate plans, prices, restrictions, promotions, tax/fee types | catalog (room types), common |
| inventory | availability | catalog (room types), common |
| booking | guests, reservations chain, cancellations | catalog, pricing, inventory, identity, notification (port), audit |
| billing | payments, transactions, invoices | booking, catalog, integration (payment port), audit |
| stay | check-ins | booking, catalog |
| reviews | reviews, moderation | booking, catalog, identity |
| notification | notifications, EmailProvider port | common |
| audit | audit log writer | identity |
| events | outbox, relay, Kafka | common |
| integration | provider ports (Email/Media/Payment/Sms) | common |
| infrastructure | JPA impls, provider adapters | all module interfaces |

### 8.3 Transaction boundaries

See §5.3. Rule: **no external calls inside DB transactions**; outbox rows carry side-effect intent.

### 8.4 Kafka boundaries

Synchronous (no Kafka): quotes, booking creation core, availability reads/writes, CRUD, search, auth.
Event candidates (via outbox): `booking.confirmed`, `booking.cancelled`, `payment.captured`, `payment.refunded`, `stay.checked_in`, `stay.checked_out`, `review.approved`. Consumers initially: notification service (emails). Nothing else forced. (ADR-002.)

### 8.5 External integration ports (sketches, not implemented)

```java
interface EmailProvider { EmailSendResult send(EmailMessage m); }
interface MediaStorageProvider { UploadedMedia upload(byte[] data, String contentType, String folder); void delete(String storageKey); }
interface PaymentProvider { /* authorize/capture/refund/void + webhook parsing */ }
interface SmsProvider { /* future */ }
```

Adapters: `ResendEmailProvider`, `CloudinaryProvider` in `infrastructure/provider`; timeouts + bounded retries; domain exceptions; webhook signature verification; config via `@ConfigurationProperties` + env vars.

## 9. Flyway strategy

- **Baseline**: platform is pre-launch → clean `V1__…` sequence (no `flyway baseline` on existing DBs needed).
- **Naming**: `V<version>__<snake_case>.sql`, strictly increasing, immutable once merged; fixes = new versions; `R__<name>.sql` repeatables for reference data only.
- **Versioning**: `V1__reference_data.sql` (countries, currencies, languages, cancellation_reasons) · `V2__identity_rbac.sql` (users, roles, permissions, role_permissions, user_roles, audit_logs) · `V3__catalog.sql` (hotels, amenities+junctions, room_types, rooms, experiences, restaurants, extras, faqs, media) · `V4__pricing_promotions.sql` (rate_plans, links, prices + btree_gist EXCLUDE, restrictions, promotions, eligibility, tax_fee_types) · `V5__inventory.sql` (availability) · `V6__booking.sql` (guests, reservations chain, history, cancellations) · `V7__billing_stay.sql` (payments, transactions, invoices, items, check_ins) · `V8__reviews_notifications_events.sql` (reviews, notifications, event_outbox, event_consumption).
- **Reference/master data**: seeded in `R__reference_data_seed.sql` via `INSERT … ON CONFLICT DO NOTHING` (countries, currencies, languages, cancellation_reasons, seed roles/permissions).
- **Dev DB**: Docker Compose PostgreSQL (pinned major) + Flyway on startup; `ddl-auto: none` everywhere.
- **Test DB**: Testcontainers PostgreSQL, same major version, Flyway applied on container start — every migration exercised in CI.
- **Production**: `./mvnw flyway:migrate` (or on-boot with `spring.flyway.enabled=true`), backup before apply, migration review by the database agent, never edited after merge.

## 10. Implementation roadmap

| Phase | Scope | Tables | Modules | Deps | Tests required | Risks |
|---|---|---|---|---|---|---|
| 0 | Approval gate | — | — | — | — | unapproved decisions block everything |
| 1 | Foundation: build config, Spotless/JaCoCo/ArchUnit, Testcontainers wiring, Flyway V1 | reference data | common | JDK21 toolchain | context test, Flyway-on-postgres | docker availability |
| 2 | Identity/security + hotels | V2 + hotels part of V3 | identity, common, catalog(hotels) | 1 | security unit/integration, hotel isolation tests | JWT design, capability tokens |
| 3 | Rooms/catalog/media | V3 rest | catalog | 2 | repository tests, media integrity, Cloudinary adapter unit | media typed-FK mapping |
| 4 | Availability/pricing/promotions | V4, V5 | inventory, pricing | 2, 3 | EXCLUDE overlap test, pricing precedence, availability concurrency test | concurrency correctness |
| 5 | Guests/reservations | V6 | booking | 2–4 | booking tx tests, snapshots, idempotency, hold expiry | cross-domain invariants |
| 6 | Payments/invoices | V7 | billing | 2–5 | payment lifecycle, webhook idempotency (fake provider) | provider abstraction stability |
| 7 | Check-in/reviews | V7 (check_ins), V8 | stay, reviews | 5 | check-in tx, review-once | none major |
| 8 | Kafka/outbox + integrations + observability | V8 events | events, notification, integration | 2–7 | outbox relay, consumer idempotency, DLQ | outbox relay liveness |

## 11. Risks

1. **Composite-FK pattern complexity** — many `UNIQUE(hotel_id, id)` indexes + extra columns; mitigated by ArchUnit-free (it's DB-side) review discipline and migration review.
2. **EXCLUDE constraint surprises** — `btree_gist` required; insert conflicts surface as 23P02/overlap violations → must be mapped to friendly errors.
3. **Promotion semantics change** (platform promos can't use junctions) — approval required; affects offer-management UX.
4. **Hold expiry vs payment window** — pending reservations with payment provider involvement need reconciliation (webhook + job).
5. **Snapshot drift** — totals CHECKs catch it early; billing recompute must never rewrite history.
6. **Outbox relay liveness** — needs monitoring (attempts, staleness) in Phase 8.
7. **Toolchain drift** — Spring Boot 4.1.0 is a moving target; pin versions in `pom.xml` once approved.

## 12. Decision register

| ID | Decision | Current | Proposed | Reason | Priority | Approval |
|---|---|---|---|---|---|---|
| C1 | Cross-hotel integrity | plain FKs | composite inherited FKs (§3A) | prevents cross-hotel references | MUST | required |
| C2 | Price range overlap | allowed | EXCLUDE (btree_gist) | no ambiguous pricing | MUST | required |
| C3 | rate_restrictions target | (room_type_id, rate_plan_id) | `room_type_rate_plan_id` | pair consistency, tighter UNIQUE | MUST | required |
| C4 | Media | polymorphic | typed FK columns (ADR-006) | integrity, JPA, cascade | MUST | required |
| C5 | Promo eligibility | plain junctions | hotel-scoped junctions; platform promos via flags | cross-hotel prevention | MUST | required |
| C6 | Promo/tax hotel-or-global | plain FK | app-level rule (+ optional trigger) | NULL-hotel pattern | MUST | required |
| C7 | Notifications table | absent | add (database.md §4.12) | day-one email | MUST | required |
| C8 | Currency | implied | pinned on rate_plans→junction→prices | currency consistency | MUST | required |
| C9 | Inventory source | availability counts | availability counts (independent of rooms) | single source of truth | MUST | required |
| C10 | Money | NUMBER(10,2) | NUMERIC(10,2) | exact math | MUST | required |
| C11 | Timestamps | TIMESTAMP | TIMESTAMPTZ now() | timezone correctness | MUST | required |
| C12 | JSON | JSON | JSONB | indexability | SHOULD | required |
| C13 | check-in/out times | VARCHAR+regex | TIME | type validity | SHOULD | recommended |
| C14 | Emails | VARCHAR unique | lower(email) unique index | case-insensitivity | SHOULD | recommended |
| C15 | user_roles platform dup | UNIQUE(user,role,hotel) | + partial unique hotel_id NULL | no duplicate platform roles | SHOULD | recommended |
| C16 | Reservation invariants | weak CHECKs | full CHECK set (§5.1) | data integrity | MUST | required |
| C17 | Payment reference uniqueness | none | UNIQUE(provider, provider_reference) partial | webhook idempotency | MUST | required |
| C18 | Review/check-in invariants | none | partial unique + CHECK | lifecycle correctness | SHOULD | recommended |
| C19 | Redundant indexes | idx_availability_lookup, idx_rate_restrictions_lookup | removed | duplicate UNIQUEs | SHOULD | recommended |
| C20 | IDs | BIGINT identity | BIGINT identity (ADR-005) | compact, JPA | KEEP | required (confirm) |
| C21 | domains brand table | absent | absent (defer) | no consumer | KEEP | required |
| C22 | exchange_rates | absent | absent (defer) | FX is frontend | DEFER | recommended |
| C23 | Kafka | none | outbox + events (ADR-002) | reliable events | MUST (Phase 8) | required |

## 13. Items requiring human approval (full list)

C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16, C17, C18, C19, C20, C21, C23 — plus Phase 0 approval of this document before any implementation. C22 is a deferral confirmation.

