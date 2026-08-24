-- V8: REVIEWS / NOTIFICATIONS / EVENTS / AUDIT
-- Source: database/collection-schema-postgresql.sql (approved schema, sections 8 + 9).
-- pgcrypto: explicit dependency for event_outbox.event_id DEFAULT gen_random_uuid().
-- audit_logs sits here (not V2 as originally planned) because it FKs hotels (V3).

-- ====================================================================
-- 8. REVIEWS / NOTIFICATIONS / EVENTS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
