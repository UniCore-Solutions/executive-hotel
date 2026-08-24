-- =====================================================================
-- THE HOTEL COLLECTION -- HOTEL PLATFORM DATABASE SCHEMA
-- Dialect: PostgreSQL 16+ (final proposed design)
-- Derived from: database/collection-schema.sql (Oracle baseline, v2.0)
-- Specification: docs/foundation-plan.md (decisions C1-C23) + ADRs
-- Status: APPROVED FOR FLYWAY -- split into V1..V8 migrations in
--         backend-hotel/src/main/resources/db/migration/ (verified
--         end-to-end: Flyway on empty PostgreSQL 16 + integration tests).
--         This file is the locked source of truth; edit only via review
--         process, then re-verify. Do NOT modify the installed migrations
--         in place once merged (Flyway immutability rule).
-- =====================================================================
--
-- KEY DESIGN DECISIONS IMPLEMENTED HERE (see foundation-plan.md):
--   C1  Cross-hotel integrity via inherited composite FKs:
--       parents expose UNIQUE(hotel_id, id); children carry hotel_id
--       and reference (hotel_id, id). An entity of Hotel A can never
--       reference an entity of Hotel B.
--   C2  Overlapping price ranges are impossible: EXCLUDE USING gist
--       (btree_gist) on daterange(valid_from, valid_to, '[]').
--   C3  rate_restrictions reference room_type_rate_plan_id directly
--       (a restriction exists only for an offered room-type/rate-plan pair).
--   C4  media uses typed FK columns (exactly one owner) instead of the
--       polymorphic (entity_type, entity_id) design -- real FKs, no orphans.
--   C5  Promotion eligibility junctions are hotel-scoped; platform-wide
--       promotions use applies_to_all_* flags and carry no junction rows.
--   C6  Promotions and tax_fee_types may be platform-wide (hotel_id NULL);
--       "same hotel or global" for reservations.promotion_id and
--       reservation_charges.tax_fee_type_id is enforced by the application
--       (a composite FK cannot express NULL-or-same; optional trigger later).
--   C8  Currency is pinned: rate_plans.currency_code -> room_type_rate_plans
--       .currency_code -> rate_plan_prices (composite FK).
--   C9  availability is the single inventory source; total_inventory is
--       managed independently of physical rooms.
--   C10 Money is NUMERIC(10,2) everywhere. Never float.
--   C11 TIMESTAMPTZ DEFAULT now() for all instants; DATE for stay dates.
--   C12 JSON -> JSONB (hotels.config, audit_logs.metadata, event payloads).
--   C13 check_in_time / check_out_time are TIME.
--   C14 users.email unique on lower(email).
--   C15 user_roles: partial unique index prevents duplicate platform roles.
--   C16 Full invariant CHECK set on the reservation chain (totals identity).
--   C17 payments: UNIQUE(provider, provider_reference) partial index --
--       webhook/idempotency handle.
--   C18 reviews: one per reservation (partial unique); check_ins invariant.
--   C19 Redundant indexes (duplicating UNIQUE constraints) are omitted.
--   C20 BIGINT GENERATED ALWAYS AS IDENTITY everywhere (ADR-005).
-- =====================================================================

-- Extensions. btree_gist: EXCLUDE overlap constraints (C2).
-- pgcrypto: explicit dependency for gen_random_uuid() (core since PG 13, kept explicit).
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ====================================================================
-- 1. PLATFORM / REFERENCE DATA                    (Flyway V1)
-- ====================================================================

CREATE TABLE countries (
    code            CHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2
    name            VARCHAR(100) NOT NULL
);

CREATE TABLE currencies (
    code            CHAR(3) PRIMARY KEY,          -- ISO 4217
    name            VARCHAR(50) NOT NULL,
    decimal_places  SMALLINT NOT NULL DEFAULT 2
                    CONSTRAINT chk_currencies_decimal_places CHECK (decimal_places BETWEEN 0 AND 6)
);

CREATE TABLE languages (
    code            VARCHAR(5) PRIMARY KEY,       -- e.g. 'en', 'fr', 'ar'
    name            VARCHAR(50) NOT NULL,
    is_rtl          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE cancellation_reasons (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,  -- 'guest_changed_plans', 'found_cheaper', ...
    label           VARCHAR(150) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CONSTRAINT chk_cancellation_reasons_status CHECK (status IN ('active','inactive'))
);

-- ====================================================================
-- 2. IDENTITY / RBAC                            (Flyway V2)
-- ====================================================================

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(150) NOT NULL,        -- stored normalized lowercase; uniqueness on lower(email)
    password_hash   VARCHAR(255) NOT NULL,        -- BCrypt / Argon2id output
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    phone           VARCHAR(30),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CONSTRAINT chk_users_status CHECK (status IN ('active','inactive','locked')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE roles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE
    -- super_admin, hotel_admin, revenue_manager, reservation_agent,
    -- reception_staff, content_manager, finance_staff
);

CREATE TABLE permissions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            VARCHAR(80) NOT NULL UNIQUE,  -- e.g. 'reservations.cancel'
    description     VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    permission_id   BIGINT NOT NULL REFERENCES permissions(id),
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id)
);

-- hotel_id NULL = platform-level role (applies to every hotel).
-- FK to hotels added after the hotels table (see section 3).
-- Role-assignment semantics (who may grant which scope) are enforced by
-- the Spring Security / application layer, not by the database.
CREATE TABLE user_roles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    hotel_id        BIGINT,
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id, hotel_id)
);

-- Prevent duplicate platform-level roles (NULLs are distinct in UNIQUE).
CREATE UNIQUE INDEX uq_user_roles_platform ON user_roles (user_id, role_id) WHERE hotel_id IS NULL;
CREATE INDEX idx_user_roles_hotel ON user_roles (hotel_id);

-- ====================================================================
-- 3. CATALOG / PRODUCT                           (Flyway V3)
-- ====================================================================

CREATE TABLE hotels (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    brand               VARCHAR(100),
    description         TEXT,
    long_description    TEXT,
    hotel_type          VARCHAR(50),
    address_line1       VARCHAR(200),
    address_line2       VARCHAR(200),
    city                VARCHAR(100),
    country_code        CHAR(2) REFERENCES countries(code),
    latitude            NUMERIC(9,6)
                        CONSTRAINT chk_hotels_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude           NUMERIC(9,6)
                        CONSTRAINT chk_hotels_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    phone               VARCHAR(30),
    email               VARCHAR(150),
    star_rating         SMALLINT
                        CONSTRAINT chk_hotels_star_rating CHECK (star_rating IS NULL OR star_rating BETWEEN 1 AND 7),
    check_in_time       TIME,                      -- C13: type-level format validity
    check_out_time      TIME,
    default_currency    CHAR(3) REFERENCES currencies(code),
    -- Presentation-layer feature flags, e.g.
    -- {"has_restaurant":true,"has_experiences":true,"has_spa":false,...}
    config              JSONB,                     -- C12
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_hotels_status CHECK (status IN ('active','inactive','draft')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles.hotel_id FK (deferred from section 2: hotels did not exist yet)
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id);

CREATE TABLE room_types (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    name                VARCHAR(150) NOT NULL,
    description         TEXT,
    long_description    TEXT,
    max_adults          SMALLINT NOT NULL DEFAULT 2
                        CONSTRAINT chk_room_types_max_adults CHECK (max_adults >= 0),
    max_children        SMALLINT NOT NULL DEFAULT 0
                        CONSTRAINT chk_room_types_max_children CHECK (max_children >= 0),
    bed_configuration   VARCHAR(200),
    size_sqm            NUMERIC(6,2)
                        CONSTRAINT chk_room_types_size CHECK (size_sqm IS NULL OR size_sqm > 0),
    view_type           VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_room_types_status CHECK (status IN ('active','inactive','draft')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_room_types_hotel_id UNIQUE (hotel_id, id)   -- C1 composite-FK target
);

CREATE TABLE amenities (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    icon                VARCHAR(50),
    category            VARCHAR(50),               -- 'general' | 'wellness' | 'business' | 'room' | ...
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotel_amenities (
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    amenity_id          BIGINT NOT NULL REFERENCES amenities(id),
    CONSTRAINT pk_hotel_amenities PRIMARY KEY (hotel_id, amenity_id)
);

CREATE TABLE room_type_amenities (
    room_type_id        BIGINT NOT NULL REFERENCES room_types(id),
    amenity_id          BIGINT NOT NULL REFERENCES amenities(id),
    CONSTRAINT pk_room_type_amenities PRIMARY KEY (room_type_id, amenity_id)
);

CREATE TABLE rooms (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    room_type_id        BIGINT NOT NULL,
    room_number         VARCHAR(20) NOT NULL,
    floor               VARCHAR(10),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_rooms_status CHECK (status IN ('active','inactive','out_of_order')),
    housekeeping_status VARCHAR(20) NOT NULL DEFAULT 'clean'
                        CONSTRAINT chk_rooms_housekeeping CHECK (housekeeping_status IN ('clean','dirty','inspected','out_of_service')),
    maintenance_status  VARCHAR(20) NOT NULL DEFAULT 'ok'
                        CONSTRAINT chk_rooms_maintenance CHECK (maintenance_status IN ('ok','needs_repair','under_repair')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: a physical room's type must belong to the same hotel
    CONSTRAINT fk_rooms_room_type FOREIGN KEY (hotel_id, room_type_id)
        REFERENCES room_types (hotel_id, id),
    CONSTRAINT uq_rooms_hotel_number UNIQUE (hotel_id, room_number),
    CONSTRAINT uq_rooms_hotel_id UNIQUE (hotel_id, id)   -- C1 composite-FK target
);

CREATE INDEX idx_rooms_room_type ON rooms (room_type_id);

CREATE TABLE experiences (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    name                VARCHAR(150) NOT NULL,
    description         TEXT,
    category            VARCHAR(50),
    duration_minutes    INTEGER
                        CONSTRAINT chk_experiences_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    price_amount        NUMERIC(10,2),             -- nullable: some experiences are complimentary
                        CONSTRAINT chk_experiences_price CHECK (price_amount IS NULL OR price_amount > 0),
    currency_code       CHAR(3) REFERENCES currencies(code),
    location            VARCHAR(200),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_experiences_status CHECK (status IN ('active','inactive')),
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiences_hotel ON experiences (hotel_id);

CREATE TABLE restaurants (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    name                VARCHAR(150) NOT NULL,
    description         TEXT,
    cuisine_type        VARCHAR(100),
    opening_hours       TEXT,                       -- display text; not backend-calculated
    location            VARCHAR(200),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_restaurants_status CHECK (status IN ('active','inactive')),
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurants_hotel ON restaurants (hotel_id);

CREATE TABLE faqs (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT REFERENCES hotels(id),   -- NULL = global/platform FAQ
    question            VARCHAR(300) NOT NULL,
    answer              TEXT NOT NULL,
    category            VARCHAR(50),
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_faqs_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faqs_hotel ON faqs (hotel_id);

CREATE TABLE extras (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    name                VARCHAR(150) NOT NULL,
    description         TEXT,
    pricing_model       VARCHAR(20) NOT NULL
                        CONSTRAINT chk_extras_pricing_model CHECK (pricing_model IN ('per_stay','per_person','per_night','per_room')),
    price_amount        NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_extras_price CHECK (price_amount > 0),
    currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_extras_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_extras_hotel_id UNIQUE (hotel_id, id)   -- C1 composite-FK target
);

-- C4: media with typed owner columns (exactly one owner per row).
-- Deletion cascades from the owner; Cloudinary cleanup is app-level
-- (storage_key is the deletion handle).
CREATE TABLE media (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url                 VARCHAR(500) NOT NULL,
    storage_key         VARCHAR(255),               -- Cloudinary public_id; UNIQUE where present
    alt_text            VARCHAR(255),
    category            VARCHAR(50),
    mime_type           VARCHAR(50),
    width               INTEGER,
    height              INTEGER,
    hotel_id            BIGINT REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id        BIGINT REFERENCES room_types(id) ON DELETE CASCADE,
    experience_id       BIGINT REFERENCES experiences(id) ON DELETE CASCADE,
    restaurant_id       BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
    extra_id            BIGINT REFERENCES extras(id) ON DELETE CASCADE,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_media_single_owner
        CHECK (num_nonnulls(hotel_id, room_type_id, experience_id, restaurant_id, extra_id) = 1)
);

CREATE UNIQUE INDEX uq_media_storage_key ON media (storage_key) WHERE storage_key IS NOT NULL;
-- One primary image per owner (partial unique indexes)
CREATE UNIQUE INDEX uq_media_primary_hotel ON media (hotel_id)       WHERE hotel_id IS NOT NULL AND is_primary;
CREATE UNIQUE INDEX uq_media_primary_room_type ON media (room_type_id) WHERE room_type_id IS NOT NULL AND is_primary;
CREATE UNIQUE INDEX uq_media_primary_experience ON media (experience_id) WHERE experience_id IS NOT NULL AND is_primary;
CREATE UNIQUE INDEX uq_media_primary_restaurant ON media (restaurant_id) WHERE restaurant_id IS NOT NULL AND is_primary;
CREATE UNIQUE INDEX uq_media_primary_extra ON media (extra_id)       WHERE extra_id IS NOT NULL AND is_primary;
CREATE INDEX idx_media_hotel ON media (hotel_id);
CREATE INDEX idx_media_room_type ON media (room_type_id);
CREATE INDEX idx_media_experience ON media (experience_id);
CREATE INDEX idx_media_restaurant ON media (restaurant_id);
CREATE INDEX idx_media_extra ON media (extra_id);

-- ====================================================================
-- 4. PRICING / PROMOTIONS                      (Flyway V4)
-- ====================================================================

CREATE TABLE rate_plans (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id                    BIGINT NOT NULL REFERENCES hotels(id),
    name                        VARCHAR(150) NOT NULL,
    code                        VARCHAR(30) NOT NULL,
    currency_code               CHAR(3) NOT NULL REFERENCES currencies(code),   -- C8
    meal_plan                   VARCHAR(50),               -- room_only / bb / half_board / etc.
    cancellation_policy         TEXT,                      -- guest-facing description (display only)
    payment_policy              TEXT,                      -- guest-facing description (display only)
    is_refundable               BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_deadline_days  SMALLINT
                        CONSTRAINT chk_rate_plans_deadline CHECK (cancellation_deadline_days IS NULL
                                                                  OR cancellation_deadline_days BETWEEN 0 AND 365),
    cancellation_penalty_type   VARCHAR(20)
                        CONSTRAINT chk_rate_plans_penalty_type CHECK (cancellation_penalty_type IN
                                                                     ('percentage','fixed_amount','first_night','full_stay')),
    cancellation_penalty_value  NUMERIC(10,2)
                        CONSTRAINT chk_rate_plans_penalty_value CHECK (cancellation_penalty_value IS NULL
                                                                       OR cancellation_penalty_value >= 0),
    payment_timing              VARCHAR(20) NOT NULL DEFAULT 'pay_at_property'
                        CONSTRAINT chk_rate_plans_payment_timing CHECK (payment_timing IN
                                                                       ('pay_at_property','prepay_full','prepay_deposit')),
    deposit_percentage          NUMERIC(5,2)
                        CONSTRAINT chk_rate_plans_deposit CHECK (deposit_percentage IS NULL
                                                                 OR deposit_percentage BETWEEN 0 AND 100),
    min_stay                    SMALLINT
                        CONSTRAINT chk_rate_plans_min_stay CHECK (min_stay IS NULL OR min_stay BETWEEN 1 AND 365),
    max_stay                    SMALLINT
                        CONSTRAINT chk_rate_plans_max_stay CHECK (max_stay IS NULL OR max_stay BETWEEN 1 AND 365),
    occupancy_rules             TEXT,                      -- kept flexible on purpose
    status                      VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_rate_plans_status CHECK (status IN ('active','inactive')),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rate_plans_hotel_code UNIQUE (hotel_id, code),
    CONSTRAINT uq_rate_plans_hotel_id UNIQUE (hotel_id, id),   -- C1 composite-FK target
    -- C8 composite-FK target: (hotel_id, id, currency_code) backs the
    -- junction FK so a link can never use a currency other than its rate plan's.
    CONSTRAINT uq_rate_plans_hotel_id_currency UNIQUE (hotel_id, id, currency_code),
    CONSTRAINT chk_rate_plans_stay_range CHECK (min_stay IS NULL OR max_stay IS NULL OR max_stay >= min_stay)
);

-- Offered (room_type, rate_plan) pairs, hotel-scoped. Currency is copied
-- from the rate plan at link time so price rows can be pinned to it;
-- the C8 composite FK below guarantees the copy always equals the
-- rate plan's currency (a link can never drift to another currency).
CREATE TABLE room_type_rate_plans (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL,
    room_type_id        BIGINT NOT NULL,
    rate_plan_id        BIGINT NOT NULL,
    currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),   -- C8
    CONSTRAINT fk_room_type_rate_plans_room_type FOREIGN KEY (hotel_id, room_type_id)
        REFERENCES room_types (hotel_id, id),
    CONSTRAINT fk_room_type_rate_plans_rate_plan FOREIGN KEY (hotel_id, rate_plan_id, currency_code)
        REFERENCES rate_plans (hotel_id, id, currency_code),            -- C8: same currency as rate plan
    CONSTRAINT uq_room_type_rate_plans UNIQUE (room_type_id, rate_plan_id),
    CONSTRAINT uq_room_type_rate_plans_hotel_id UNIQUE (hotel_id, id),          -- C1 composite-FK target
    CONSTRAINT uq_room_type_rate_plans_currency UNIQUE (id, currency_code)      -- C8 composite-FK target
);

CREATE INDEX idx_room_type_rate_plans_rate_plan ON room_type_rate_plans (rate_plan_id);

-- Base pricing by inclusive date RANGE. Overlapping ranges are impossible:
-- EXCLUDE constraint (C2, btree_gist).
-- DECISION: bounds are INCLUSIVE ('[]') — a rate valid 2026-08-01..2026-08-10
-- conflicts with a rate valid 2026-08-10..2026-08-20 (business decision,
-- mirrors the Oracle baseline's closed interval; revisit before V4 if the
-- product prefers half-open intervals).
CREATE TABLE rate_plan_prices (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_rate_plan_id   BIGINT NOT NULL,
    currency_code            CHAR(3) NOT NULL,
    valid_from               DATE NOT NULL,
    valid_to                 DATE NOT NULL,
    price_amount             NUMERIC(10,2) NOT NULL
                             CONSTRAINT chk_rate_plan_prices_amount CHECK (price_amount > 0),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_rate_plan_prices_link FOREIGN KEY (room_type_rate_plan_id, currency_code)
        REFERENCES room_type_rate_plans (id, currency_code),                    -- C8: same currency as link
    CONSTRAINT chk_rate_plan_prices_range CHECK (valid_to >= valid_from),
    CONSTRAINT ex_rate_plan_prices_no_overlap EXCLUDE USING gist (
        room_type_rate_plan_id WITH =,
        daterange(valid_from, valid_to, '[]') WITH &&
    )
);

CREATE INDEX idx_rate_plan_prices_lookup ON rate_plan_prices (room_type_rate_plan_id, valid_from);

-- Sparse per-date restriction overrides layered on top of range pricing.
-- C3: restrictions exist only for OFFERED (room_type, rate_plan) pairs.
CREATE TABLE rate_restrictions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT NOT NULL,
    room_type_rate_plan_id BIGINT NOT NULL,
    stay_date           DATE NOT NULL,
    min_stay_override   SMALLINT
                        CONSTRAINT chk_rate_restrictions_min CHECK (min_stay_override IS NULL OR min_stay_override BETWEEN 1 AND 365),
    max_stay_override   SMALLINT
                        CONSTRAINT chk_rate_restrictions_max CHECK (max_stay_override IS NULL OR max_stay_override BETWEEN 1 AND 365),
    closed_to_arrival   BOOLEAN NOT NULL DEFAULT FALSE,
    closed_to_departure BOOLEAN NOT NULL DEFAULT FALSE,
    stop_sell           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_rate_restrictions_link FOREIGN KEY (hotel_id, room_type_rate_plan_id)
        REFERENCES room_type_rate_plans (hotel_id, id),
    CONSTRAINT uq_rate_restrictions UNIQUE (room_type_rate_plan_id, stay_date),
    CONSTRAINT chk_rate_restrictions_stay_range CHECK (min_stay_override IS NULL OR max_stay_override IS NULL
                                                       OR max_stay_override >= min_stay_override)
);

CREATE TABLE promotions (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id                    BIGINT REFERENCES hotels(id),   -- NULL = platform-wide (C5/C6)
    code                        VARCHAR(30) NOT NULL UNIQUE,
    name                        VARCHAR(150) NOT NULL,
    description                 TEXT,
    discount_type               VARCHAR(20) NOT NULL
                        CONSTRAINT chk_promotions_discount_type CHECK (discount_type IN ('percentage','fixed_amount','stay_x_pay_y')),
    discount_value              NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_promotions_discount_value CHECK (discount_value > 0),
    booking_window_start        DATE,
    booking_window_end          DATE,
    stay_window_start           DATE,
    stay_window_end             DATE,
    min_nights                  SMALLINT
                        CONSTRAINT chk_promotions_min_nights CHECK (min_nights IS NULL OR min_nights BETWEEN 1 AND 365),
    max_usage_total             BIGINT
                        CONSTRAINT chk_promotions_max_usage_total CHECK (max_usage_total IS NULL OR max_usage_total > 0),
    max_usage_per_guest         BIGINT
                        CONSTRAINT chk_promotions_max_usage_per_guest CHECK (max_usage_per_guest IS NULL OR max_usage_per_guest > 0),
    stackable                   BOOLEAN NOT NULL DEFAULT FALSE,
    applies_to_all_room_types   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE short-circuits promotion_eligible_room_types
    applies_to_all_rate_plans   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE short-circuits promotion_eligible_rate_plans
    applicable_days_of_week     VARCHAR(20),                     -- 'MON,TUE,...'; NULL = all days
                        CONSTRAINT chk_promotions_days CHECK (applicable_days_of_week IS NULL
                            OR applicable_days_of_week ~ '^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$'),
    status                      VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_promotions_status CHECK (status IN ('active','inactive','expired')),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_promotions_hotel_id UNIQUE (hotel_id, id),     -- C1 composite-FK target
    CONSTRAINT chk_promotions_booking_window CHECK (booking_window_start IS NULL OR booking_window_end IS NULL
                                                    OR booking_window_end >= booking_window_start),
    CONSTRAINT chk_promotions_stay_window CHECK (stay_window_start IS NULL OR stay_window_end IS NULL
                                                 OR stay_window_end >= stay_window_start),
    CONSTRAINT chk_promotions_percentage CHECK (discount_type <> 'percentage' OR discount_value <= 100)
);

-- C5: junctions are hotel-scoped. Platform-wide promotions use
-- applies_to_all_* flags and must have NO junction rows.
CREATE TABLE promotion_eligible_room_types (
    promotion_id        BIGINT NOT NULL,
    hotel_id            BIGINT NOT NULL,
    room_type_id        BIGINT NOT NULL,
    CONSTRAINT fk_per_rt_promotion FOREIGN KEY (hotel_id, promotion_id)
        REFERENCES promotions (hotel_id, id),
    CONSTRAINT fk_per_rt_room_type FOREIGN KEY (hotel_id, room_type_id)
        REFERENCES room_types (hotel_id, id),
    CONSTRAINT pk_promotion_eligible_room_types PRIMARY KEY (promotion_id, room_type_id)
);

CREATE TABLE promotion_eligible_rate_plans (
    promotion_id        BIGINT NOT NULL,
    hotel_id            BIGINT NOT NULL,
    rate_plan_id        BIGINT NOT NULL,
    CONSTRAINT fk_per_rp_promotion FOREIGN KEY (hotel_id, promotion_id)
        REFERENCES promotions (hotel_id, id),
    CONSTRAINT fk_per_rp_rate_plan FOREIGN KEY (hotel_id, rate_plan_id)
        REFERENCES rate_plans (hotel_id, id),
    CONSTRAINT pk_promotion_eligible_rate_plans PRIMARY KEY (promotion_id, rate_plan_id)
);

CREATE TABLE tax_fee_types (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT REFERENCES hotels(id),        -- NULL = applies platform-wide by default (C6)
    name                VARCHAR(100) NOT NULL,                -- 'VAT', 'City Tourism Tax', 'Service Fee'
    charge_type         VARCHAR(10) NOT NULL
                        CONSTRAINT chk_tax_fee_types_charge CHECK (charge_type IN ('tax','fee')),
    calculation_method  VARCHAR(20) NOT NULL
                        CONSTRAINT chk_tax_fee_types_method CHECK (calculation_method IN
                                                                  ('percentage','fixed_per_night','fixed_per_stay','fixed_per_guest')),
    value               NUMERIC(10,4) NOT NULL
                        CONSTRAINT chk_tax_fee_types_value CHECK (value >= 0),
    currency_code       CHAR(3) REFERENCES currencies(code),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_tax_fee_types_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_tax_fee_types_currency CHECK (calculation_method = 'percentage' OR currency_code IS NOT NULL)
);

CREATE INDEX idx_tax_fee_types_hotel ON tax_fee_types (hotel_id);

-- ====================================================================
-- 5. INVENTORY / AVAILABILITY                  (Flyway V5)
-- ====================================================================

-- Single inventory source (C9). total_inventory is managed independently
-- of physical rooms; rooms are operational state only.
CREATE TABLE availability (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_id        BIGINT NOT NULL REFERENCES room_types(id),
    stay_date           DATE NOT NULL,
    total_inventory     INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_availability_total CHECK (total_inventory >= 0),
    rooms_sold          INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_availability_sold CHECK (rooms_sold >= 0),
    out_of_order        INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_availability_ooo CHECK (out_of_order >= 0),
    blocked             INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_availability_blocked CHECK (blocked >= 0),
    version             INTEGER NOT NULL DEFAULT 0,   -- optimistic-lock guard for concurrent bookings
    CONSTRAINT uq_availability UNIQUE (room_type_id, stay_date),
    CONSTRAINT chk_availability_capacity CHECK (rooms_sold + out_of_order + blocked <= total_inventory)
);

-- ====================================================================
-- 6. BOOKING / RESERVATIONS                    (Flyway V6)
-- ====================================================================

CREATE TABLE guests (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT,   -- nullable: guest may not have an account
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(150),
    phone               VARCHAR(30),
    country_code        CHAR(2) REFERENCES countries(code),
    date_of_birth       DATE,                            -- store only where legally required
    preferences         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_guests_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_guests_email ON guests (email);
CREATE INDEX idx_guests_user ON guests (user_id);

CREATE TABLE reservations (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference           VARCHAR(20) NOT NULL UNIQUE,     -- guest-facing confirmation code 'RC-XXXXXX'
    idempotency_key     VARCHAR(100) UNIQUE,             -- prevents duplicate creation
    hotel_id            BIGINT NOT NULL REFERENCES hotels(id),
    guest_id            BIGINT NOT NULL REFERENCES guests(id),   -- primary/booking guest
    booked_by_user_id   BIGINT REFERENCES users(id),      -- set when staff-created
    promotion_id        BIGINT REFERENCES promotions(id), -- app-level: promo must be global or same hotel (C6)
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_reservations_status CHECK (status IN ('pending','confirmed','modified',
                                                                             'cancelled','checked_in','checked_out','no_show')),
    hold_expires_at     TIMESTAMPTZ,                      -- pending-hold release deadline (scheduled job)
    check_in_date       DATE NOT NULL,
    check_out_date      DATE NOT NULL,
    adults              SMALLINT NOT NULL DEFAULT 1
                        CONSTRAINT chk_reservations_adults CHECK (adults >= 1),
    children            SMALLINT NOT NULL DEFAULT 0
                        CONSTRAINT chk_reservations_children CHECK (children >= 0),
    currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
    subtotal_amount     NUMERIC(10,2) NOT NULL DEFAULT 0
                        CONSTRAINT chk_reservations_subtotal CHECK (subtotal_amount >= 0),
    discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0
                        CONSTRAINT chk_reservations_discount CHECK (discount_amount >= 0),
    tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0
                        CONSTRAINT chk_reservations_tax CHECK (tax_amount >= 0),
    fee_amount          NUMERIC(10,2) NOT NULL DEFAULT 0
                        CONSTRAINT chk_reservations_fee CHECK (fee_amount >= 0),
    total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_reservations_payment_status CHECK (payment_status IN
                                                                          ('pending','authorized','captured',
                                                                           'failed','refunded','partially_refunded')),
    source              VARCHAR(30) NOT NULL DEFAULT 'direct'
                        CONSTRAINT chk_reservations_source CHECK (source IN ('direct','staff','ota','channel')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_reservations_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_reservations_discount_cap CHECK (discount_amount <= subtotal_amount),
    CONSTRAINT chk_reservations_totals CHECK (
        total_amount = subtotal_amount - discount_amount + tax_amount + fee_amount),
    -- C1 composite-FK targets (children + invoices/payments/reviews)
    CONSTRAINT uq_reservations_hotel_id UNIQUE (hotel_id, id),
    CONSTRAINT uq_reservations_id_guest UNIQUE (id, guest_id),
    CONSTRAINT uq_reservations_id_currency UNIQUE (id, currency_code)
);

CREATE INDEX idx_reservations_guest ON reservations (guest_id);
CREATE INDEX idx_reservations_dates ON reservations (check_in_date, check_out_date);
CREATE INDEX idx_reservations_promotion ON reservations (promotion_id);

CREATE TABLE reservation_rooms (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL,
    hotel_id            BIGINT NOT NULL,                  -- C1: inherited from reservation
    room_type_id        BIGINT NOT NULL,
    rate_plan_id        BIGINT NOT NULL,
    room_id             BIGINT,                           -- assigned physical room (nullable until assignment)
    check_in_date       DATE NOT NULL,
    check_out_date      DATE NOT NULL,
    nights              SMALLINT NOT NULL,
    rate_per_night      NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_reservation_rooms_rate CHECK (rate_per_night > 0),
    subtotal_amount     NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_reservation_rooms_subtotal CHECK (subtotal_amount >= 0),
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CONSTRAINT chk_reservation_rooms_status CHECK (status IN ('active','cancelled')),
    -- C1: everything hotel-scoped, same hotel as the reservation
    CONSTRAINT fk_reservation_rooms_reservation FOREIGN KEY (hotel_id, reservation_id)
        REFERENCES reservations (hotel_id, id),
    CONSTRAINT fk_reservation_rooms_room_type FOREIGN KEY (hotel_id, room_type_id)
        REFERENCES room_types (hotel_id, id),
    CONSTRAINT fk_reservation_rooms_rate_plan FOREIGN KEY (hotel_id, rate_plan_id)
        REFERENCES rate_plans (hotel_id, id),
    CONSTRAINT fk_reservation_rooms_room FOREIGN KEY (hotel_id, room_id)
        REFERENCES rooms (hotel_id, id),
    -- The (room_type, rate_plan) combination must be an actual offer:
    -- reservation lines can only use pairs the hotel really sells.
    CONSTRAINT fk_reservation_rooms_rate_offer FOREIGN KEY (room_type_id, rate_plan_id)
        REFERENCES room_type_rate_plans (room_type_id, rate_plan_id),
    CONSTRAINT uq_reservation_rooms_reservation_id UNIQUE (reservation_id, id),   -- children composite-FK target
    CONSTRAINT chk_reservation_rooms_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_reservation_rooms_nights CHECK (nights >= 1 AND nights = (check_out_date - check_in_date))
);

-- reservation_id lookups are served by uq_reservation_rooms_reservation_id (reservation_id, id)
CREATE INDEX idx_reservation_rooms_room ON reservation_rooms (room_id);

CREATE TABLE reservation_guests (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL,
    reservation_room_id BIGINT,
    guest_id            BIGINT REFERENCES guests(id),     -- nullable: occupant may not have a guest record
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    age_category        VARCHAR(10) NOT NULL DEFAULT 'adult'
                        CONSTRAINT chk_reservation_guests_age CHECK (age_category IN ('adult','child')),
    -- C1: the room line must belong to the same reservation
    CONSTRAINT fk_reservation_guests_room FOREIGN KEY (reservation_id, reservation_room_id)
        REFERENCES reservation_rooms (reservation_id, id),
    CONSTRAINT uq_reservation_guests_reservation_id UNIQUE (reservation_id, id)   -- check_ins composite-FK target
);

-- reservation_id lookups are served by uq_reservation_guests_reservation_id (reservation_id, id)

CREATE TABLE reservation_extras (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL,
    hotel_id            BIGINT NOT NULL,
    reservation_room_id BIGINT,
    extra_id            BIGINT NOT NULL,
    stay_date           DATE,                              -- populated when priced per_night
    quantity            INTEGER NOT NULL DEFAULT 1
                        CONSTRAINT chk_reservation_extras_quantity CHECK (quantity > 0),
    unit_price          NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_reservation_extras_unit CHECK (unit_price >= 0),
    total_price         NUMERIC(10,2) NOT NULL,
    -- C1: extra from the same hotel; room line of the same reservation; and the
    -- extra's hotel_id is pinned to the reservation's hotel (closes the hole where
    -- hotel_id could name a different hotel than the reservation it belongs to)
    CONSTRAINT fk_reservation_extras_extra FOREIGN KEY (hotel_id, extra_id)
        REFERENCES extras (hotel_id, id),
    CONSTRAINT fk_reservation_extras_reservation_hotel FOREIGN KEY (hotel_id, reservation_id)
        REFERENCES reservations (hotel_id, id),
    CONSTRAINT fk_reservation_extras_room FOREIGN KEY (reservation_id, reservation_room_id)
        REFERENCES reservation_rooms (reservation_id, id),
    CONSTRAINT chk_reservation_extras_total CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_reservation_extras_reservation ON reservation_extras (reservation_id);

CREATE TABLE reservation_charges (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL REFERENCES reservations(id),
    tax_fee_type_id     BIGINT REFERENCES tax_fee_types(id),  -- nullable: one-off/manual charge; app-level hotel-or-global (C6)
    charge_type         VARCHAR(10) NOT NULL
                        CONSTRAINT chk_reservation_charges_type CHECK (charge_type IN ('tax','fee')),
    name                VARCHAR(100) NOT NULL,               -- snapshotted at booking time
    amount              NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_reservation_charges_amount CHECK (amount >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_charges_reservation ON reservation_charges (reservation_id);

CREATE TABLE reservation_status_history (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL REFERENCES reservations(id),
    from_status         VARCHAR(20),                             -- NULL on the initial insert
                        CONSTRAINT chk_reservation_status_history_from CHECK (from_status IS NULL OR from_status IN
                            ('pending','confirmed','modified','cancelled','checked_in','checked_out','no_show')),
    to_status           VARCHAR(20) NOT NULL
                        CONSTRAINT chk_reservation_status_history_to CHECK (to_status IN
                            ('pending','confirmed','modified','cancelled','checked_in','checked_out','no_show')),
    changed_by_user_id  BIGINT REFERENCES users(id),              -- NULL when the guest/system triggered it
    note                VARCHAR(255),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_status_history_reservation ON reservation_status_history (reservation_id);

CREATE TABLE reservation_cancellations (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id           BIGINT NOT NULL UNIQUE REFERENCES reservations(id),
    cancellation_reason_id   BIGINT REFERENCES cancellation_reasons(id),
    reason_note              VARCHAR(255),                             -- free text detail on top of the standard reason
    cancelled_by_user_id     BIGINT REFERENCES users(id),              -- NULL when the guest cancelled it themselves
    is_refundable            BOOLEAN NOT NULL,                        -- snapshot of the rate plan's policy at cancellation time
    penalty_amount           NUMERIC(10,2) NOT NULL DEFAULT 0
                             CONSTRAINT chk_reservation_cancellations_penalty CHECK (penalty_amount >= 0),
    refund_amount            NUMERIC(10,2) NOT NULL DEFAULT 0
                             CONSTRAINT chk_reservation_cancellations_refund CHECK (refund_amount >= 0),
    cancelled_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 7. BILLING / STAY                            (Flyway V7)
-- ====================================================================

CREATE TABLE payments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      BIGINT NOT NULL,
    amount              NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_payments_amount CHECK (amount > 0),
    currency_code       CHAR(3) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_payments_status CHECK (status IN ('pending','authorized','captured','failed',
                                                                         'refunded','partially_refunded','cancelled')),
    provider            VARCHAR(50) NOT NULL,          -- provider code as data; SDKs stay in infrastructure/provider
    provider_reference  VARCHAR(150),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: payment currency must match the reservation's billing currency (C8)
    CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id, currency_code)
        REFERENCES reservations (id, currency_code)
);

CREATE INDEX idx_payments_reservation ON payments (reservation_id);
-- C17: idempotency/webhook handle per provider
CREATE UNIQUE INDEX uq_payments_provider_reference ON payments (provider, provider_reference)
    WHERE provider_reference IS NOT NULL;

CREATE TABLE payment_transactions (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id               BIGINT NOT NULL REFERENCES payments(id),
    transaction_type         VARCHAR(20) NOT NULL
                        CONSTRAINT chk_payment_transactions_type CHECK (transaction_type IN
                                                                       ('authorization','capture','refund','void')),
    amount                   NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_payment_transactions_amount CHECK (amount >= 0),
    status                   VARCHAR(20) NOT NULL
                        CONSTRAINT chk_payment_transactions_status CHECK (status IN ('pending','succeeded','failed','reversed')),
    provider_transaction_id  VARCHAR(150),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_payment ON payment_transactions (payment_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions (provider_transaction_id);

CREATE TABLE invoices (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number        VARCHAR(30) NOT NULL UNIQUE,
    reservation_id        BIGINT NOT NULL,
    guest_id              BIGINT NOT NULL,
    billing_name          VARCHAR(150) NOT NULL,                     -- snapshotted, independent of later guest edits
    billing_address       VARCHAR(255),
    billing_country_code  CHAR(2) REFERENCES countries(code),
    currency_code         CHAR(3) NOT NULL REFERENCES currencies(code),
    subtotal_amount       NUMERIC(10,2) NOT NULL,
    discount_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
    fee_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount          NUMERIC(10,2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'issued'
                        CONSTRAINT chk_invoices_status CHECK (status IN ('issued','paid','void')),
    issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: an invoice's guest must be the reservation's booking guest
    CONSTRAINT fk_invoices_reservation FOREIGN KEY (reservation_id, guest_id)
        REFERENCES reservations (id, guest_id),
    CONSTRAINT chk_invoices_discount_cap CHECK (discount_amount <= subtotal_amount),
    CONSTRAINT chk_invoices_amounts CHECK (subtotal_amount >= 0 AND discount_amount >= 0
                                           AND tax_amount >= 0 AND fee_amount >= 0),
    CONSTRAINT chk_invoices_totals CHECK (
        total_amount = subtotal_amount - discount_amount + tax_amount + fee_amount)
);

CREATE INDEX idx_invoices_reservation ON invoices (reservation_id);

CREATE TABLE invoice_items (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id            BIGINT NOT NULL REFERENCES invoices(id),
    description           VARCHAR(255) NOT NULL,                    -- e.g. 'Deluxe Room x 3 nights', 'VAT'
    item_type             VARCHAR(20) NOT NULL
                        CONSTRAINT chk_invoice_items_type CHECK (item_type IN ('room','extra','tax','fee','discount')),
    quantity              NUMERIC(6,2) NOT NULL DEFAULT 1
                        CONSTRAINT chk_invoice_items_quantity CHECK (quantity > 0),
    unit_price            NUMERIC(10,2) NOT NULL
                        CONSTRAINT chk_invoice_items_unit CHECK (unit_price >= 0),
    total_price           NUMERIC(10,2) NOT NULL,
    sort_order            SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_invoice_items_total CHECK (total_price = unit_price * quantity)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

CREATE TABLE check_ins (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id         BIGINT NOT NULL,
    reservation_guest_id   BIGINT,
    status                 VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_check_ins_status CHECK (status IN ('pending','completed')),
    arrival_time_estimate  VARCHAR(20),
    preferences            TEXT,
    id_document_reference  VARCHAR(255),                          -- tokenized/hashed reference, never the document
    verified_at            TIMESTAMPTZ,
    checked_out_at         TIMESTAMPTZ,                            -- explicit checkout event; NULL while in-house
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: the check-in guest line must belong to the same reservation;
    -- direct FK guarantees the reservation itself always exists even when
    -- reservation_guest_id is NULL (composite FK would be vacuously satisfied)
    CONSTRAINT fk_check_ins_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    CONSTRAINT fk_check_ins_reservation_guest FOREIGN KEY (reservation_id, reservation_guest_id)
        REFERENCES reservation_guests (reservation_id, id),
    CONSTRAINT chk_check_ins_checkout CHECK (checked_out_at IS NULL OR status = 'completed')   -- C18
);

CREATE INDEX idx_check_ins_reservation ON check_ins (reservation_id);

-- ====================================================================
-- 8. REVIEWS / NOTIFICATIONS / EVENTS         (Flyway V8)
-- ====================================================================

CREATE TABLE reviews (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id              BIGINT NOT NULL REFERENCES hotels(id),
    reservation_id        BIGINT,
    guest_id              BIGINT REFERENCES guests(id),          -- nullable: a review never requires an account
    author_name           VARCHAR(100),                          -- display name when guest_id is null
    rating                SMALLINT NOT NULL CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    cleanliness_rating    SMALLINT CONSTRAINT chk_reviews_cleanliness CHECK (cleanliness_rating BETWEEN 1 AND 5),
    location_rating       SMALLINT CONSTRAINT chk_reviews_location CHECK (location_rating BETWEEN 1 AND 5),
    service_rating        SMALLINT CONSTRAINT chk_reviews_service CHECK (service_rating BETWEEN 1 AND 5),
    value_rating          SMALLINT CONSTRAINT chk_reviews_value CHECK (value_rating BETWEEN 1 AND 5),
    title                 VARCHAR(150),
    comment               TEXT,
    moderation_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_reviews_moderation CHECK (moderation_status IN ('pending','approved','rejected')),
    response_text         TEXT,                                   -- hotel's reply to the review
    responded_at          TIMESTAMPTZ,
    responded_by_user_id  BIGINT REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- C1: the reservation must belong to the hotel being reviewed
    CONSTRAINT fk_reviews_reservation FOREIGN KEY (hotel_id, reservation_id)
        REFERENCES reservations (hotel_id, id),
    CONSTRAINT chk_reviews_author CHECK (guest_id IS NOT NULL OR author_name IS NOT NULL)
);

CREATE INDEX idx_reviews_hotel ON reviews (hotel_id);
-- C18: one review per reservation
CREATE UNIQUE INDEX uq_reviews_reservation ON reviews (reservation_id) WHERE reservation_id IS NOT NULL;

-- Email/SMS templates. hotel_id NULL = platform-wide template;
-- hotel-specific templates override for that hotel.
CREATE TABLE notification_templates (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT REFERENCES hotels(id),
    code                VARCHAR(50) NOT NULL,                    -- 'booking.confirmed', 'booking.cancelled', ...
    channel             VARCHAR(10) NOT NULL
                        CONSTRAINT chk_notification_templates_channel CHECK (channel IN ('email','sms')),
    subject_template    VARCHAR(255),
    body_template       TEXT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One platform-wide template per (code, channel); hotel templates may override.
CREATE UNIQUE INDEX uq_notification_templates_global ON notification_templates (code, channel)
    WHERE hotel_id IS NULL;
CREATE UNIQUE INDEX uq_notification_templates_hotel ON notification_templates (hotel_id, code, channel)
    WHERE hotel_id IS NOT NULL;

-- One row per outbound notification; subject/body are snapshotted
-- (rendered) so later template edits never rewrite history.
-- recipient is INTENTIONALLY polymorphic: a notification may target a
-- guest (recipient_type='guest' -> guests.id) or a platform user
-- (recipient_type='user' -> users.id); referential integrity is enforced
-- by the application (see ADR: polymorphic notification recipient).
CREATE TABLE notifications (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            BIGINT REFERENCES hotels(id),
    recipient_type      VARCHAR(10) NOT NULL
                        CONSTRAINT chk_notifications_recipient_type CHECK (recipient_type IN ('guest','user')),
    recipient_id        BIGINT NOT NULL,                          -- guests.id or users.id (polymorphic by recipient_type)
    channel             VARCHAR(10) NOT NULL
                        CONSTRAINT chk_notifications_channel CHECK (channel IN ('email','sms')),
    type                VARCHAR(50) NOT NULL,                     -- 'booking.confirmed', 'cancellation', ...
    template_id         BIGINT REFERENCES notification_templates(id),
    subject             VARCHAR(255),
    body                TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CONSTRAINT chk_notifications_status CHECK (status IN ('pending','sent','failed','suppressed')),
    provider            VARCHAR(50),                               -- 'resend', ...
    provider_reference  VARCHAR(150),
    attempts            INTEGER NOT NULL DEFAULT 0
                        CONSTRAINT chk_notifications_attempts CHECK (attempts >= 0),
    sent_at             TIMESTAMPTZ,
    error               VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_type, recipient_id);
CREATE INDEX idx_notifications_status ON notifications (status, created_at) WHERE status = 'pending';

-- Transactional outbox (ADR-002): business writes + outbox row commit in
-- one transaction; the outbox relay publishes to Kafka.
CREATE TABLE event_outbox (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,           -- 'booking.confirmed', ...
    event_version   INTEGER NOT NULL DEFAULT 1,
    hotel_id        BIGINT REFERENCES hotels(id),
    aggregate_id    VARCHAR(100) NOT NULL,           -- 'reservation:RC-ABC123'
    payload         JSONB NOT NULL,
    trace_id        VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CONSTRAINT chk_event_outbox_status CHECK (status IN ('pending','published','failed')),
    attempts        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX idx_event_outbox_pending ON event_outbox (status, created_at) WHERE status = 'pending';

-- Idempotency ledger: one row per (consumer group, event) — consumers
-- skip events they have already processed (at-least-once semantics).
CREATE TABLE event_consumption (
    consumer_group  VARCHAR(100) NOT NULL,
    event_id        UUID NOT NULL,
    consumed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (consumer_group, event_id)
);

-- ====================================================================
-- 9. AUDIT / SYSTEM
-- ====================================================================

CREATE TABLE audit_logs (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id       BIGINT REFERENCES users(id),
    action              VARCHAR(100) NOT NULL,      -- 'reservation.cancelled', 'rate.changed', ...
    resource_type       VARCHAR(50) NOT NULL,
    resource_id         BIGINT NOT NULL,
    hotel_id            BIGINT REFERENCES hotels(id),   -- hotel scope of the audited action, when applicable
    result              VARCHAR(20) NOT NULL
                        CONSTRAINT chk_audit_logs_result CHECK (result IN ('success','failure')),
    metadata            JSONB,                       -- structured detail, non-sensitive only (C12)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_hotel ON audit_logs (hotel_id);

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
