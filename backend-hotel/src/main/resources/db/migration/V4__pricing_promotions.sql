-- V4: PRICING / PROMOTIONS
-- Source: database/collection-schema-postgresql.sql (approved schema, section 4).
-- btree_gist first: required by the EXCLUDE overlap constraint (C2).
-- rate_plans, room_type_rate_plans (C8 currency pin), rate_plan_prices,
-- rate_restrictions, promotions + eligibility junctions, tax_fee_types.

-- ====================================================================
-- 4. PRICING / PROMOTIONS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

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
