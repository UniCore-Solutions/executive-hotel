-- V3: CATALOG / PRODUCT
-- Source: database/collection-schema-postgresql.sql (approved schema, section 3).
-- hotels, room_types, amenities + junctions, rooms, experiences, restaurants,
-- faqs, extras, media (typed owners, C4).

-- ====================================================================
-- 3. CATALOG / PRODUCT
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
