-- V6: BOOKING / RESERVATIONS
-- Source: database/collection-schema-postgresql.sql (approved schema, section 6).
-- guests, reservations, reservation_rooms (offer FK), reservation_guests,
-- reservation_extras (hotel pin), reservation_charges,
-- reservation_status_history, reservation_cancellations.

-- ====================================================================
-- 6. BOOKING / RESERVATIONS
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
