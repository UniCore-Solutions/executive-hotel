-- V5: INVENTORY / AVAILABILITY
-- Source: database/collection-schema-postgresql.sql (approved schema, section 5).
-- Single inventory source (C9).

-- ====================================================================
-- 5. INVENTORY / AVAILABILITY
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
