-- V12: SPARSE AVAILABILITY
-- total_inventory moves to room_types (one value per room type, not per night).
-- The availability table holds ONLY nights with activity
-- (rooms_sold/out_of_order/blocked > 0). A night with no row is fully available.
-- This removes the need to pre-generate inventory rows for a booking horizon.

ALTER TABLE room_types
    ADD COLUMN total_inventory INTEGER NOT NULL DEFAULT 10
        CONSTRAINT chk_room_types_total CHECK (total_inventory >= 0);

-- Backfill from the previous per-night source of truth (max across nights).
UPDATE room_types rt
SET total_inventory = COALESCE(
        (SELECT MAX(a.total_inventory)
         FROM availability a
         WHERE a.room_type_id = rt.id),
        10);

-- Remove rows that carry no information (nothing sold, nothing blocked).
DELETE FROM availability
WHERE rooms_sold = 0 AND out_of_order = 0 AND blocked = 0;

ALTER TABLE availability
    DROP CONSTRAINT chk_availability_capacity,
    DROP COLUMN total_inventory;

-- Re-introduce the capacity invariant at the database level now that the
-- capacity source lives on room_types (writes cannot oversell).
CREATE OR REPLACE FUNCTION enforce_availability_capacity() RETURNS trigger AS $$
BEGIN
    IF NEW.rooms_sold + NEW.out_of_order + NEW.blocked >
       (SELECT total_inventory FROM room_types WHERE id = NEW.room_type_id) THEN
        RAISE EXCEPTION 'capacity exceeded for room_type % on %', NEW.room_type_id, NEW.stay_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_availability_capacity
    BEFORE INSERT OR UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION enforce_availability_capacity();