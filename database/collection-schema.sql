-- =====================================================================
-- THE HOTEL COLLECTION -- HOTEL PLATFORM DATABASE SCHEMA
-- Version: 2.0 (production candidate)
-- Dialect: Oracle Database 21c+ (native JSON type used for `config`;
--          native BOOLEAN assumes 23ai -- see compatibility note below
--          if targeting 19c/21c instead).
--
-- CHANGES FROM v1.2, DECIDED IN THIS REVIEW PASS:
--   1. `HOTEL_CONFIG` table removed. Hotel-level feature flags
--      (has_restaurant, has_experiences, has_spa, has_room_service,
--      has_parking, has_pool, has_gym) now live in HOTELS.config as a
--      single native JSON column. These are presentation-layer
--      switches (does the site show a tab), not first-class entities,
--      so a 1:1 side table added a join for no benefit. Native JSON
--      (OSON storage, Oracle 21c+) is a supported, performant choice
--      for this -- not a CLOB/IS-JSON workaround.
--   2. Promotion eligibility reverted from JSON ID arrays back to
--      real junction tables (promotion_eligible_room_types,
--      promotion_eligible_rate_plans). Unlike the config flags, this
--      IS relational data with FK meaning (an array of IDs pointing
--      at rows that can be deleted independently) -- it needs
--      referential integrity and cheap joins, so it does not belong
--      in JSON.
--   3. `promotion_rules` dropped permanently (decision: promotions
--      table alone is sufficient; no separate rule-type/value table).
--   4. `room_blocks` dropped permanently (decision: `availability`
--      already tracks blocked/out-of-order counts per date; a
--      reasoned block-history table is not needed for this MVP).
--   5. `rates` (v1.2's dense per-date pricing+restriction table) was
--      replaced in the prior pass by `rate_plan_prices` (date-RANGE
--      pricing), which dropped stop_sell / closed_to_arrival /
--      closed_to_departure / min_stay_override / max_stay_override
--      entirely. Those are restored here as a new, separate
--      `rate_restrictions` table: sparse, one row per date ONLY when
--      a restriction actually applies (instead of v1.2's dense model,
--      which forced a row for every single date). Base pricing stays
--      range-based in `rate_plan_prices`; date-specific restrictions
--      layer on top only where needed.
--
-- COMPATIBILITY NOTE: this file uses the native Oracle 23ai BOOLEAN
-- type. If targeting 19c/21c, replace `BOOLEAN` with
-- `NUMBER(1) DEFAULT 0 CHECK (col IN (0,1))` throughout.
-- =====================================================================

-- ====================================================================
-- 1. PLATFORM / CONFIGURATION
-- ====================================================================

CREATE TABLE countries (
    code            CHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2
    name            VARCHAR2(100) NOT NULL
);

CREATE TABLE currencies (
    code            CHAR(3) PRIMARY KEY,          -- ISO 4217
    name            VARCHAR2(50) NOT NULL,
    decimal_places  NUMBER(2) DEFAULT 2 NOT NULL
);

CREATE TABLE languages (
    code            VARCHAR2(5) PRIMARY KEY,      -- e.g. 'en', 'fr', 'ar'
    name            VARCHAR2(50) NOT NULL,
    is_rtl          BOOLEAN DEFAULT FALSE NOT NULL
);

-- ====================================================================
-- 2. HOTEL / PRODUCT
-- ====================================================================

CREATE TABLE hotels (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR2(150) NOT NULL,
    brand               VARCHAR2(100),
    description         CLOB,
    long_description    CLOB,
    hotel_type          VARCHAR2(50),
    address_line1       VARCHAR2(200),
    address_line2       VARCHAR2(200),
    city                VARCHAR2(100),
    country_code        CHAR(2) REFERENCES countries(code),
    latitude            NUMBER(9,6),
    longitude           NUMBER(9,6),
    phone               VARCHAR2(30),
    email               VARCHAR2(150),
    star_rating         NUMBER(2),
    check_in_time       VARCHAR2(5)  CHECK (check_in_time  IS NULL OR REGEXP_LIKE(check_in_time,  '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
    check_out_time      VARCHAR2(5)  CHECK (check_out_time IS NULL OR REGEXP_LIKE(check_out_time, '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
    default_currency    CHAR(3) REFERENCES currencies(code),
    -- Presentation-layer feature flags. Example shape:
    -- {"has_restaurant":true,"has_experiences":true,"has_spa":false,
    --  "has_room_service":true,"has_parking":true,"has_pool":false,
    --  "has_gym":false}
    config              JSON,
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_hotels_status CHECK (status IN ('active','inactive','draft')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Optional (Oracle 23ai): enforce the known keys/types inside `config`
-- instead of leaving its shape entirely up to the application layer.
-- ALTER TABLE hotels ADD CONSTRAINT chk_hotels_config_shape
--   CHECK (config IS JSON VALIDATE '{
--     "type":"object",
--     "properties":{
--       "has_restaurant":{"type":"boolean"},
--       "has_experiences":{"type":"boolean"},
--       "has_spa":{"type":"boolean"},
--       "has_room_service":{"type":"boolean"},
--       "has_parking":{"type":"boolean"},
--       "has_pool":{"type":"boolean"},
--       "has_gym":{"type":"boolean"}
--     },
--     "additionalProperties": false
--   }');

CREATE TABLE room_types (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    name                VARCHAR2(150) NOT NULL,
    description         CLOB,
    long_description    CLOB,
    max_adults          NUMBER(3) DEFAULT 2 NOT NULL,
    max_children        NUMBER(3) DEFAULT 0 NOT NULL,
    bed_configuration   VARCHAR2(200),
    size_sqm            NUMBER(6,2),
    view_type           VARCHAR2(100),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_room_types_status CHECK (status IN ('active','inactive','draft')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);

CREATE TABLE rooms (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    room_number         VARCHAR2(20) NOT NULL,
    floor               VARCHAR2(10),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_rooms_status CHECK (status IN ('active','inactive','out_of_order')),
    housekeeping_status VARCHAR2(20) DEFAULT 'clean' NOT NULL
                        CONSTRAINT chk_rooms_housekeeping CHECK (housekeeping_status IN ('clean','dirty','inspected','out_of_service')),
    maintenance_status  VARCHAR2(20) DEFAULT 'ok' NOT NULL
                        CONSTRAINT chk_rooms_maintenance CHECK (maintenance_status IN ('ok','needs_repair','under_repair')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_rooms_hotel_number UNIQUE (hotel_id, room_number)
);

CREATE INDEX idx_rooms_room_type ON rooms(room_type_id);

CREATE TABLE amenities (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR2(100) NOT NULL UNIQUE,
    icon                VARCHAR2(50),
    category            VARCHAR2(50),               -- 'general' | 'wellness' | 'business' | 'room' | ...
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE TABLE hotel_amenities (
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    amenity_id          NUMBER NOT NULL REFERENCES amenities(id),
    CONSTRAINT pk_hotel_amenities PRIMARY KEY (hotel_id, amenity_id)
);

CREATE TABLE room_type_amenities (
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    amenity_id          NUMBER NOT NULL REFERENCES amenities(id),
    CONSTRAINT pk_room_type_amenities PRIMARY KEY (room_type_id, amenity_id)
);

CREATE TABLE experiences (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    name                VARCHAR2(150) NOT NULL,
    description         CLOB,
    category            VARCHAR2(50),
    duration_minutes    NUMBER(6),
    price_amount        NUMBER(10,2),               -- nullable: some experiences are complimentary
    currency_code       CHAR(3) REFERENCES currencies(code),
    location            VARCHAR2(200),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_experiences_status CHECK (status IN ('active','inactive')),
    sort_order          NUMBER(4) DEFAULT 0 NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_experiences_hotel ON experiences(hotel_id);

CREATE TABLE restaurants (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    name                VARCHAR2(150) NOT NULL,
    description         CLOB,
    cuisine_type        VARCHAR2(100),
    opening_hours       CLOB,                        -- display text; not backend-calculated
    location            VARCHAR2(200),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_restaurants_status CHECK (status IN ('active','inactive')),
    sort_order          NUMBER(4) DEFAULT 0 NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_restaurants_hotel ON restaurants(hotel_id);

CREATE TABLE faqs (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER REFERENCES hotels(id),   -- NULL = global/platform FAQ
    question            VARCHAR2(300) NOT NULL,
    answer              CLOB NOT NULL,
    category            VARCHAR2(50),
    sort_order          NUMBER(4) DEFAULT 0 NOT NULL,
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_faqs_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_faqs_hotel ON faqs(hotel_id);

CREATE TABLE extras (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    name                VARCHAR2(150) NOT NULL,
    description         CLOB,
    pricing_model       VARCHAR2(20) NOT NULL
                        CONSTRAINT chk_extras_pricing_model CHECK (pricing_model IN ('per_stay','per_person','per_night','per_room')),
    price_amount        NUMBER(10,2) NOT NULL,
    currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_extras_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE TABLE media (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url                 VARCHAR2(500) NOT NULL,
    storage_key         VARCHAR2(255),
    alt_text            VARCHAR2(255),
    category            VARCHAR2(50),
    entity_type         VARCHAR2(50) NOT NULL,      -- 'hotel' | 'room_type' | 'extra' | 'experience' | 'restaurant' | ...
    entity_id           NUMBER NOT NULL,
    is_primary          BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order          NUMBER(4) DEFAULT 0 NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_media_entity ON media(entity_type, entity_id);

-- ====================================================================
-- 3. ROOM INVENTORY / AVAILABILITY
-- ====================================================================

-- `room_blocks` deliberately NOT included (decision: `blocked` below
-- already covers this; a reasoned block-history table is deferred).

CREATE TABLE availability (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    stay_date           DATE NOT NULL,
    total_inventory     NUMBER(6) DEFAULT 0 NOT NULL,
    rooms_sold          NUMBER(6) DEFAULT 0 NOT NULL,
    out_of_order        NUMBER(6) DEFAULT 0 NOT NULL,
    blocked             NUMBER(6) DEFAULT 0 NOT NULL,
    version             NUMBER(10) DEFAULT 0 NOT NULL,   -- optimistic-lock guard for concurrent bookings
    CONSTRAINT uq_availability UNIQUE (room_type_id, stay_date),
    CONSTRAINT chk_availability_capacity CHECK (rooms_sold + out_of_order + blocked <= total_inventory)
);

CREATE INDEX idx_availability_lookup ON availability(room_type_id, stay_date);

-- ====================================================================
-- 4. PRICING / RATE MANAGEMENT
-- ====================================================================

CREATE TABLE rate_plans (
    id                          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id                    NUMBER NOT NULL REFERENCES hotels(id),
    name                        VARCHAR2(150) NOT NULL,
    code                        VARCHAR2(30) NOT NULL,
    meal_plan                   VARCHAR2(50),               -- room_only / bb / half_board / etc.
    cancellation_policy         CLOB,                        -- guest-facing description (display only)
    payment_policy              CLOB,                        -- guest-facing description (display only)
    is_refundable               BOOLEAN DEFAULT TRUE NOT NULL,
    cancellation_deadline_days  NUMBER(4),                   -- free cancellation up to N days before check-in; NULL = n/a
    cancellation_penalty_type   VARCHAR2(20)
                        CONSTRAINT chk_rate_plans_penalty_type CHECK (cancellation_penalty_type IN ('percentage','fixed_amount','first_night','full_stay')),
    cancellation_penalty_value  NUMBER(10,2),                -- meaning depends on penalty_type
    payment_timing              VARCHAR2(20) DEFAULT 'pay_at_property' NOT NULL
                        CONSTRAINT chk_rate_plans_payment_timing CHECK (payment_timing IN ('pay_at_property','prepay_full','prepay_deposit')),
    deposit_percentage          NUMBER(5,2),                 -- only used when payment_timing = 'prepay_deposit'
    min_stay                    NUMBER(4),
    max_stay                    NUMBER(4),
    occupancy_rules             CLOB,                        -- JSON/text, kept flexible on purpose
    status                      VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_rate_plans_status CHECK (status IN ('active','inactive')),
    created_at                  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at                  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_rate_plans_hotel_code UNIQUE (hotel_id, code)
);

CREATE TABLE room_type_rate_plans (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    rate_plan_id        NUMBER NOT NULL REFERENCES rate_plans(id),
    CONSTRAINT uq_room_type_rate_plans UNIQUE (room_type_id, rate_plan_id)
);

-- Base pricing, by date RANGE (not one row per date). Cheap to store,
-- cheap to query "what's today's rate" via a between-dates lookup.
CREATE TABLE rate_plan_prices (
    id                       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_rate_plan_id   NUMBER NOT NULL REFERENCES room_type_rate_plans(id),
    valid_from               DATE NOT NULL,
    valid_to                 DATE NOT NULL,
    price_amount             NUMBER(10,2) NOT NULL,
    currency_code            CHAR(3) NOT NULL REFERENCES currencies(code),
    created_at               TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at               TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT chk_rate_plan_prices_range CHECK (valid_to >= valid_from)
);

CREATE INDEX idx_rate_plan_prices_lookup ON rate_plan_prices(room_type_rate_plan_id, valid_from, valid_to);

-- Sparse per-date restriction OVERRIDES layered on top of the range
-- pricing above. Only insert a row for a date when a restriction
-- actually applies -- unlike v1.2's `rates`, this is not a dense
-- "one row per date" table, so a hotel with no seasonal restrictions
-- has zero rows here.
CREATE TABLE rate_restrictions (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    rate_plan_id        NUMBER NOT NULL REFERENCES rate_plans(id),
    stay_date           DATE NOT NULL,
    min_stay_override   NUMBER(4),
    max_stay_override   NUMBER(4),
    closed_to_arrival   BOOLEAN DEFAULT FALSE NOT NULL,
    closed_to_departure BOOLEAN DEFAULT FALSE NOT NULL,
    stop_sell           BOOLEAN DEFAULT FALSE NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT uq_rate_restrictions UNIQUE (room_type_id, rate_plan_id, stay_date)
);

CREATE INDEX idx_rate_restrictions_lookup ON rate_restrictions(room_type_id, rate_plan_id, stay_date);

CREATE TABLE promotions (
    id                          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id                    NUMBER REFERENCES hotels(id),   -- NULL = platform-wide
    code                        VARCHAR2(30) NOT NULL UNIQUE,
    name                        VARCHAR2(150) NOT NULL,
    description                 CLOB,
    discount_type               VARCHAR2(20) NOT NULL
                        CONSTRAINT chk_promotions_discount_type CHECK (discount_type IN ('percentage','fixed_amount','stay_x_pay_y')),
    discount_value               NUMBER(10,2) NOT NULL,
    booking_window_start         DATE,
    booking_window_end           DATE,
    stay_window_start            DATE,
    stay_window_end              DATE,
    min_nights                   NUMBER(4),
    max_usage_total               NUMBER(10),
    max_usage_per_guest           NUMBER(10),
    stackable                     BOOLEAN DEFAULT FALSE NOT NULL,
    applies_to_all_room_types     BOOLEAN DEFAULT FALSE NOT NULL,   -- TRUE short-circuits promotion_eligible_room_types
    applies_to_all_rate_plans     BOOLEAN DEFAULT FALSE NOT NULL,   -- TRUE short-circuits promotion_eligible_rate_plans
    applicable_days_of_week       VARCHAR2(20),                     -- e.g. 'MON,TUE,WED'; NULL = all days
    status                        VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_promotions_status CHECK (status IN ('active','inactive','expired')),
    created_at                    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at                    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Real junction tables (not JSON ID arrays): eligibility is
-- relational data that needs FK integrity and cheap joins, unlike
-- the presentation-only flags in hotels.config.
CREATE TABLE promotion_eligible_room_types (
    promotion_id        NUMBER NOT NULL REFERENCES promotions(id),
    room_type_id         NUMBER NOT NULL REFERENCES room_types(id),
    CONSTRAINT pk_promotion_eligible_room_types PRIMARY KEY (promotion_id, room_type_id)
);

CREATE TABLE promotion_eligible_rate_plans (
    promotion_id        NUMBER NOT NULL REFERENCES promotions(id),
    rate_plan_id         NUMBER NOT NULL REFERENCES rate_plans(id),
    CONSTRAINT pk_promotion_eligible_rate_plans PRIMARY KEY (promotion_id, rate_plan_id)
);

-- `promotion_rules` deliberately NOT included (decision: the
-- promotions table's own fields are sufficient; no separate
-- rule-type/value table).

CREATE TABLE tax_fee_types (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id            NUMBER REFERENCES hotels(id),        -- NULL = applies platform-wide by default
    name                VARCHAR2(100) NOT NULL,                -- 'VAT', 'City Tourism Tax', 'Service Fee'
    charge_type         VARCHAR2(10) NOT NULL CONSTRAINT chk_tax_fee_types_charge CHECK (charge_type IN ('tax','fee')),
    calculation_method  VARCHAR2(20) NOT NULL
                        CONSTRAINT chk_tax_fee_types_method CHECK (calculation_method IN ('percentage','fixed_per_night','fixed_per_stay','fixed_per_guest')),
    value               NUMBER(10,4) NOT NULL,                 -- percentage (10 = 10%) or fixed amount, per calculation_method
    currency_code       CHAR(3) REFERENCES currencies(code),  -- only meaningful for fixed_* methods
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_tax_fee_types_status CHECK (status IN ('active','inactive')),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- ====================================================================
-- 5. SEARCH / FILTERING
-- ====================================================================

-- Deliberately no tables -- all filter values are derivable from
-- room_types / amenities / rate_plan_prices / availability / reviews.

-- ====================================================================
-- 6. CLIENT / GUEST
-- ====================================================================

CREATE TABLE guests (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             NUMBER,   -- nullable: guest may not have an account; FK added after users table below
    first_name          VARCHAR2(100) NOT NULL,
    last_name           VARCHAR2(100) NOT NULL,
    email               VARCHAR2(150),
    phone               VARCHAR2(30),
    country_code        CHAR(2) REFERENCES countries(code),
    date_of_birth       DATE,                            -- store only where legally required
    preferences         CLOB,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_guests_email ON guests(email);

-- ====================================================================
-- 7. USERS / AGENTS / BACK OFFICE
-- ====================================================================

CREATE TABLE users (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               VARCHAR2(150) NOT NULL UNIQUE,
    password_hash       VARCHAR2(255) NOT NULL,
    first_name          VARCHAR2(100),
    last_name           VARCHAR2(100),
    phone               VARCHAR2(30),
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_users_status CHECK (status IN ('active','inactive','locked')),
    last_login_at       TIMESTAMP,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

ALTER TABLE guests ADD CONSTRAINT fk_guests_user FOREIGN KEY (user_id) REFERENCES users(id);

CREATE TABLE roles (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR2(50) NOT NULL UNIQUE
    -- super_admin, hotel_admin, revenue_manager, reservation_agent,
    -- reception_staff, content_manager, finance_staff
);

CREATE TABLE permissions (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR2(80) NOT NULL UNIQUE,   -- e.g. 'reservations.cancel'
    description         VARCHAR2(255)
);

CREATE TABLE role_permissions (
    role_id             NUMBER NOT NULL REFERENCES roles(id),
    permission_id       NUMBER NOT NULL REFERENCES permissions(id),
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             NUMBER NOT NULL REFERENCES users(id),
    role_id             NUMBER NOT NULL REFERENCES roles(id),
    hotel_id            NUMBER REFERENCES hotels(id),
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id, hotel_id)
);

-- ====================================================================
-- 8. RESERVATIONS
-- ====================================================================

CREATE TABLE reservations (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference           VARCHAR2(20) NOT NULL UNIQUE,     -- guest-facing confirmation code
    idempotency_key     VARCHAR2(100) UNIQUE,             -- prevents duplicate creation
    hotel_id            NUMBER NOT NULL REFERENCES hotels(id),
    guest_id            NUMBER NOT NULL REFERENCES guests(id),   -- primary/booking guest
    booked_by_user_id   NUMBER REFERENCES users(id),      -- set when staff-created
    promotion_id        NUMBER REFERENCES promotions(id),
    status              VARCHAR2(20) DEFAULT 'pending' NOT NULL
                        CONSTRAINT chk_reservations_status CHECK (status IN ('pending','confirmed','modified','cancelled',
                                           'checked_in','checked_out','no_show')),
    hold_expires_at     TIMESTAMP,                        -- set while status='pending'; a scheduled job releases
                                                            -- the held inventory and cancels the reservation past this time
    check_in_date       DATE NOT NULL,
    check_out_date      DATE NOT NULL,
    adults              NUMBER(3) DEFAULT 1 NOT NULL,
    children             NUMBER(3) DEFAULT 0 NOT NULL,
    currency_code        CHAR(3) NOT NULL REFERENCES currencies(code),
    subtotal_amount       NUMBER(10,2) DEFAULT 0 NOT NULL,
    discount_amount       NUMBER(10,2) DEFAULT 0 NOT NULL,
    tax_amount             NUMBER(10,2) DEFAULT 0 NOT NULL,   -- sum of reservation_charges where charge_type='tax'
    fee_amount              NUMBER(10,2) DEFAULT 0 NOT NULL,   -- sum of reservation_charges where charge_type='fee'
    total_amount             NUMBER(10,2) DEFAULT 0 NOT NULL,
    payment_status             VARCHAR2(20) DEFAULT 'pending' NOT NULL
                        CONSTRAINT chk_reservations_payment_status CHECK (payment_status IN ('pending','authorized','captured',
                                                   'failed','refunded','partially_refunded')),
    source                     VARCHAR2(30) DEFAULT 'direct' NOT NULL,
    notes                      CLOB,
    created_at                 TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at                 TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT chk_reservations_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_reservations_hotel ON reservations(hotel_id);
CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);

CREATE TABLE reservation_rooms (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    room_type_id        NUMBER NOT NULL REFERENCES room_types(id),
    rate_plan_id        NUMBER NOT NULL REFERENCES rate_plans(id),
    room_id             NUMBER REFERENCES rooms(id),      -- assigned physical room (nullable until assignment)
    check_in_date       DATE NOT NULL,
    check_out_date      DATE NOT NULL,
    nights              NUMBER(4) NOT NULL,
    rate_per_night      NUMBER(10,2) NOT NULL,
    subtotal_amount     NUMBER(10,2) NOT NULL,
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_reservation_rooms_status CHECK (status IN ('active','cancelled'))
);

CREATE INDEX idx_reservation_rooms_reservation ON reservation_rooms(reservation_id);
CREATE INDEX idx_reservation_rooms_room ON reservation_rooms(room_id);

CREATE TABLE reservation_guests (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    reservation_room_id NUMBER REFERENCES reservation_rooms(id),
    guest_id            NUMBER REFERENCES guests(id),     -- nullable: occupant may not have a guest record
    first_name          VARCHAR2(100) NOT NULL,
    last_name            VARCHAR2(100) NOT NULL,
    is_primary            BOOLEAN DEFAULT FALSE NOT NULL,
    age_category           VARCHAR2(10) DEFAULT 'adult' NOT NULL
                        CONSTRAINT chk_reservation_guests_age CHECK (age_category IN ('adult','child'))
);

CREATE TABLE reservation_extras (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    reservation_room_id NUMBER REFERENCES reservation_rooms(id),
    extra_id            NUMBER NOT NULL REFERENCES extras(id),
    stay_date           DATE,                              -- populated when priced per_night
    quantity            NUMBER(6) DEFAULT 1 NOT NULL,
    unit_price          NUMBER(10,2) NOT NULL,
    total_price          NUMBER(10,2) NOT NULL
);

CREATE TABLE reservation_charges (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    tax_fee_type_id     NUMBER REFERENCES tax_fee_types(id),  -- nullable: allows a one-off/manual charge
    charge_type         VARCHAR2(10) NOT NULL CONSTRAINT chk_reservation_charges_type CHECK (charge_type IN ('tax','fee')),
    name                VARCHAR2(100) NOT NULL,
    amount              NUMBER(10,2) NOT NULL,
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_reservation_charges_reservation ON reservation_charges(reservation_id);

CREATE TABLE reservation_status_history (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    from_status          VARCHAR2(20),                             -- NULL on the initial insert
    to_status              VARCHAR2(20) NOT NULL,
    changed_by_user_id    NUMBER REFERENCES users(id),              -- NULL when the guest/system triggered it
    note                   VARCHAR2(255),
    changed_at             TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_reservation_status_history_reservation ON reservation_status_history(reservation_id);

-- ====================================================================
-- 9. MODIFICATION / CANCELLATION
-- ====================================================================

CREATE TABLE cancellation_reasons (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR2(30) NOT NULL UNIQUE,               -- 'guest_changed_plans', 'found_cheaper', ...
    label               VARCHAR2(150) NOT NULL,
    status              VARCHAR2(20) DEFAULT 'active' NOT NULL
                        CONSTRAINT chk_cancellation_reasons_status CHECK (status IN ('active','inactive'))
);

CREATE TABLE reservation_cancellations (
    id                       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id           NUMBER NOT NULL UNIQUE REFERENCES reservations(id),
    cancellation_reason_id   NUMBER REFERENCES cancellation_reasons(id),
    reason_note              VARCHAR2(255),                             -- free text detail, on top of the standard reason
    cancelled_by_user_id     NUMBER REFERENCES users(id),               -- NULL when the guest cancelled it themselves
    is_refundable            BOOLEAN NOT NULL,                          -- snapshot of the rate plan's policy at cancellation time
    penalty_amount           NUMBER(10,2) DEFAULT 0 NOT NULL,
    refund_amount            NUMBER(10,2) DEFAULT 0 NOT NULL,
    cancelled_at              TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- ====================================================================
-- 10. PAYMENT
-- ====================================================================

CREATE TABLE payments (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id      NUMBER NOT NULL REFERENCES reservations(id),
    amount              NUMBER(10,2) NOT NULL,
    currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
    status              VARCHAR2(20) DEFAULT 'pending' NOT NULL
                        CONSTRAINT chk_payments_status CHECK (status IN ('pending','authorized','captured','failed',
                                           'refunded','partially_refunded','cancelled')),
    provider            VARCHAR2(50) NOT NULL,
    provider_reference  VARCHAR2(150),
    created_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);

CREATE TABLE payment_transactions (
    id                       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id               NUMBER NOT NULL REFERENCES payments(id),
    transaction_type         VARCHAR2(20) NOT NULL
                        CONSTRAINT chk_payment_transactions_type CHECK (transaction_type IN ('authorization','capture','refund','void')),
    amount                    NUMBER(10,2) NOT NULL,
    status                    VARCHAR2(20) NOT NULL,
    provider_transaction_id   VARCHAR2(150),
    created_at                TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- ====================================================================
-- 11. INVOICING
-- ====================================================================

CREATE TABLE invoices (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number         VARCHAR2(30) NOT NULL UNIQUE,
    reservation_id          NUMBER NOT NULL REFERENCES reservations(id),
    guest_id                NUMBER NOT NULL REFERENCES guests(id),
    billing_name             VARCHAR2(150) NOT NULL,                     -- snapshotted, independent of later guest edits
    billing_address          VARCHAR2(255),
    billing_country_code     CHAR(2) REFERENCES countries(code),
    currency_code             CHAR(3) NOT NULL REFERENCES currencies(code),
    subtotal_amount            NUMBER(10,2) NOT NULL,
    discount_amount             NUMBER(10,2) DEFAULT 0 NOT NULL,
    tax_amount                   NUMBER(10,2) DEFAULT 0 NOT NULL,
    fee_amount                    NUMBER(10,2) DEFAULT 0 NOT NULL,
    total_amount                   NUMBER(10,2) NOT NULL,
    status                          VARCHAR2(20) DEFAULT 'issued' NOT NULL
                        CONSTRAINT chk_invoices_status CHECK (status IN ('issued','paid','void')),
    issued_at                       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_invoices_reservation ON invoices(reservation_id);

CREATE TABLE invoice_items (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id             NUMBER NOT NULL REFERENCES invoices(id),
    description              VARCHAR2(255) NOT NULL,                    -- e.g. 'Deluxe Room x 3 nights', 'Airport transfer', 'VAT'
    item_type                 VARCHAR2(20) NOT NULL
                        CONSTRAINT chk_invoice_items_type CHECK (item_type IN ('room','extra','tax','fee','discount')),
    quantity                   NUMBER(6,2) DEFAULT 1 NOT NULL,
    unit_price                  NUMBER(10,2) NOT NULL,
    total_price                   NUMBER(10,2) NOT NULL,
    sort_order                     NUMBER(4) DEFAULT 0 NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ====================================================================
-- 12. CHECK-IN / STAY
-- ====================================================================

CREATE TABLE check_ins (
    id                     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id          NUMBER NOT NULL REFERENCES reservations(id),
    reservation_guest_id     NUMBER REFERENCES reservation_guests(id),
    status                    VARCHAR2(20) DEFAULT 'pending' NOT NULL
                        CONSTRAINT chk_check_ins_status CHECK (status IN ('pending','completed')),
    arrival_time_estimate      VARCHAR2(20),
    preferences                  CLOB,
    id_document_reference         VARCHAR2(255),
    verified_at                    TIMESTAMP,
    checked_out_at                 TIMESTAMP,                               -- explicit checkout event; NULL while still in-house
    created_at                     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at                     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- ====================================================================
-- 13. REVIEWS / RATINGS / FEEDBACK
-- ====================================================================

CREATE TABLE reviews (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id                NUMBER NOT NULL REFERENCES hotels(id),
    reservation_id            NUMBER REFERENCES reservations(id),   -- tie review to a legitimate stay
    guest_id                    NUMBER REFERENCES guests(id),          -- nullable: a review never requires an account
    author_name                   VARCHAR2(100),                          -- display name when guest_id is null
    rating                          NUMBER(1) NOT NULL CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    cleanliness_rating                NUMBER(1) CONSTRAINT chk_reviews_cleanliness CHECK (cleanliness_rating BETWEEN 1 AND 5),
    location_rating                     NUMBER(1) CONSTRAINT chk_reviews_location CHECK (location_rating BETWEEN 1 AND 5),
    service_rating                        NUMBER(1) CONSTRAINT chk_reviews_service CHECK (service_rating BETWEEN 1 AND 5),
    value_rating                            NUMBER(1) CONSTRAINT chk_reviews_value CHECK (value_rating BETWEEN 1 AND 5),
    title                                     VARCHAR2(150),
    comment                                    CLOB,
    moderation_status                             VARCHAR2(20) DEFAULT 'pending' NOT NULL
                        CONSTRAINT chk_reviews_moderation CHECK (moderation_status IN ('pending','approved','rejected')),
    response_text                                   CLOB,                                   -- hotel's reply to the review
    responded_at                                     TIMESTAMP,
    responded_by_user_id                               NUMBER REFERENCES users(id),
    created_at                                          TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at                                           TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- ====================================================================
-- 14-17. COMPLAINTS / LOYALTY / NOTIFICATIONS / CONTENT-TRANSLATIONS
-- ====================================================================
-- Deferred entirely, unchanged from v1.2. Not needed for a single
-- boutique property's MVP; clean bolt-on domains later if needed.

-- ====================================================================
-- 18. AUDIT / SYSTEM
-- ====================================================================

CREATE TABLE audit_logs (
    id                  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id       NUMBER REFERENCES users(id),
    action              VARCHAR2(100) NOT NULL,      -- 'reservation.cancelled', 'rate.changed', ...
    resource_type       VARCHAR2(50) NOT NULL,
    resource_id         NUMBER NOT NULL,
    result               VARCHAR2(20) NOT NULL CONSTRAINT chk_audit_logs_result CHECK (result IN ('success','failure')),
    metadata               JSON,                       -- structured detail, non-sensitive only
    created_at              TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================